from __future__ import annotations

import logging
import time
import uuid
from pathlib import Path

import numpy as np
from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .image_ops import (
    build_mask_url,
    build_preview_url,
    build_result_url,
    compute_outside_diff,
    inpaint_image,
    load_rgb_image,
    mask_to_pil,
    ndarray_to_pil,
    preview_mask_to_original,
    qc_passed,
    sam_refiner,
    strokes_to_mask,
)
from .jobs import create_job, get_job, update_job
from .schemas import JobInfo, StrokePayload, SubmitResponse, UploadResponse
from .settings import settings
from .storage import get_session_dir, make_session_dir, save_mask, save_original, save_preview, save_result

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger("object_eraser")


app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

settings.storage_dir.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=settings.storage_dir), name="media")


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.post(f"{settings.api_prefix}/uploads", response_model=UploadResponse)
async def upload_image(file: UploadFile = File(...)) -> UploadResponse:
    t0 = time.perf_counter()
    content = await file.read()
    logger.info(f"UPLOAD start filename={file.filename} bytes={len(content)}")

    image = load_rgb_image(content)
    original_w, original_h = image.width, image.height

    session_id, session_dir = make_session_dir()
    save_original(session_dir, image)
    _, preview_w, preview_h = save_preview(session_dir, image)

    elapsed = time.perf_counter() - t0
    logger.info(
        f"UPLOAD ok session={session_id} original={original_w}x{original_h} "
        f"preview={preview_w}x{preview_h} elapsed={elapsed:.2f}s"
    )
  
    return UploadResponse(
        session_id=session_id,
        preview_url=build_preview_url(session_id),
        preview_w=preview_w,
        preview_h=preview_h,
        original_w=original_w,
        original_h=original_h,
    )


@app.post(f"{settings.api_prefix}/sessions/{{session_id}}/mask-preview")
def mask_preview(session_id: str, payload: StrokePayload):
    get_session_dir(session_id)
    mask = strokes_to_mask(payload, payload.preview_w, payload.preview_h)
    return {"nonzero_pixels": int(mask.sum() // 255)}


@app.post(f"{settings.api_prefix}/sessions/{{session_id}}/submit", response_model=SubmitResponse)
def submit_job(session_id: str, payload: StrokePayload, background_tasks: BackgroundTasks) -> SubmitResponse:
    get_session_dir(session_id)

    stroke_count = len(payload.strokes)
    point_count = sum(len(s.points) for s in payload.strokes)
    logger.info(
        f"SUBMIT session={session_id} strokes={stroke_count} "
        f"points={point_count} preview={payload.preview_w}x{payload.preview_h} "
        f"inpaint_radius={payload.inpaint_radius}"
    )

    job_id = uuid.uuid4().hex[:12]
    create_job(job_id=job_id, session_id=session_id)
    background_tasks.add_task(process_job, job_id, session_id, payload)
    return SubmitResponse(job_id=job_id, status="queued")


@app.get(f"{settings.api_prefix}/jobs/{{job_id}}", response_model=JobInfo)
def get_job_status(job_id: str) -> JobInfo:
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.post(f"{settings.api_prefix}/sessions/{{session_id}}/test-mask")
def test_mask(session_id: str, payload: StrokePayload):
    session_dir = get_session_dir(session_id)
    mask = strokes_to_mask(payload, payload.preview_w, payload.preview_h)
    nonzero = int(mask.sum() // 255)
    logger.info(
        f"TEST_MASK session={session_id} preview={payload.preview_w}x{payload.preview_h} "
        f"nonzero_pixels={nonzero}"
    )
    save_mask(session_dir, mask_to_pil(mask))
    return {"mask_url": build_mask_url(session_id)}

def process_job(job_id: str, session_id: str, payload: StrokePayload) -> None:
    update_job(job_id, status="processing")
    t0 = time.perf_counter()

    try:
        stroke_count = len(payload.strokes)
        point_count = sum(len(s.points) for s in payload.strokes)

        logger.info(
            f"JOB start job={job_id} session={session_id} "
            f"strokes={stroke_count} points={point_count}"
        )

        session_dir = get_session_dir(session_id)
        original_path = session_dir / "original.jpg"
        original_image = load_rgb_image(original_path.read_bytes())
        original_rgb = np.array(original_image)

        logger.info(
            f"JOB image_loaded job={job_id} original={original_image.width}x{original_image.height}"
        )

        coarse_preview_mask = strokes_to_mask(payload, payload.preview_w, payload.preview_h)
        coarse_nonzero = int(coarse_preview_mask.sum() // 255)
        logger.info(
            f"JOB preview_mask job={job_id} preview={payload.preview_w}x{payload.preview_h} "
            f"nonzero_pixels={coarse_nonzero}"
        )

        if not coarse_preview_mask.any():
            raise ValueError("No painted area detected.")

        coarse_full_mask = preview_mask_to_original(
            coarse_preview_mask,
            (original_image.width, original_image.height),
        )
        full_nonzero = int(coarse_full_mask.sum() // 255)
        logger.info(
            f"JOB scaled_mask job={job_id} original={original_image.width}x{original_image.height} "
            f"nonzero_pixels={full_nonzero}"
        )

        refined_mask = sam_refiner.refine(original_rgb, coarse_full_mask)
        refined_nonzero = int(refined_mask.sum() // 255)
        logger.info(
            f"JOB refined_mask job={job_id} nonzero_pixels={refined_nonzero}"
        )

        result_rgb = inpaint_image(original_rgb, refined_mask, payload.inpaint_radius)
        outside_diff = compute_outside_diff(original_rgb, result_rgb, refined_mask)
        passed = qc_passed(outside_diff)

        save_mask(session_dir, mask_to_pil(refined_mask))
        save_result(session_dir, ndarray_to_pil(result_rgb))

        elapsed = time.perf_counter() - t0
        logger.info(
            f"JOB done job={job_id} passed_qc={passed} outside_diff={outside_diff:.2f} "
            f"elapsed={elapsed:.2f}s"
        )

        update_job(
            job_id,
            status="done",
            result_url=build_result_url(session_id),
            mask_url=build_mask_url(session_id),
            outside_diff=outside_diff,
            passed_qc=passed,
        )
    except Exception as exc:
        elapsed = time.perf_counter() - t0
        logger.exception(f"JOB failed job={job_id} elapsed={elapsed:.2f}s error={exc}")
        update_job(job_id, status="failed", error=str(exc))