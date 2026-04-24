from __future__ import annotations

import json
from io import BytesIO
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from .schemas import StrokePayload
from .settings import settings


def load_rgb_image(upload_bytes: bytes) -> Image.Image:
    image = Image.open(BytesIO(upload_bytes)).convert("RGB")
    return image


def build_preview_url(session_id: str) -> str:
    return f"/media/{session_id}/preview.jpg"


def build_result_url(session_id: str) -> str:
    return f"/media/{session_id}/result.jpg"


def build_mask_url(session_id: str) -> str:
    return f"/media/{session_id}/mask.png"


def strokes_to_mask(payload: StrokePayload, width: int, height: int) -> np.ndarray:
    mask = np.zeros((height, width), dtype=np.uint8)
    for stroke in payload.strokes:
        pts = np.array([[int(x * width), int(y * height)] for x, y in stroke.points], dtype=np.int32)
        pts[:, 0] = np.clip(pts[:, 0], 0, width - 1)
        pts[:, 1] = np.clip(pts[:, 1], 0, height - 1)
        if len(pts) == 1:
            cv2.circle(mask, tuple(pts[0]), max(1, stroke.brush // 2), 255, -1)
        else:
            cv2.polylines(mask, [pts], False, 255, thickness=stroke.brush)
            for pt in pts:
                cv2.circle(mask, tuple(pt), max(1, stroke.brush // 2), 255, -1)
    return mask


def preview_mask_to_original(mask: np.ndarray, original_size: tuple[int, int]) -> np.ndarray:
    original_w, original_h = original_size
    return cv2.resize(mask, (original_w, original_h), interpolation=cv2.INTER_NEAREST)


class OptionalSamRefiner:
    def __init__(self) -> None:
        self._predictor = None
        self._load_attempted = False

    def _ensure_loaded(self) -> None:
        if self._load_attempted:
            return
        self._load_attempted = True
        if not settings.enable_optional_sam or not settings.sam_checkpoint_path:
            return
        try:
            from segment_anything import SamPredictor, sam_model_registry

            model = sam_model_registry[settings.sam_model_type](checkpoint=settings.sam_checkpoint_path)
            self._predictor = SamPredictor(model)
        except Exception:
            self._predictor = None

    def refine(self, image_rgb: np.ndarray, coarse_mask: np.ndarray) -> np.ndarray:
        self._ensure_loaded()
        if self._predictor is None:
            kernel = np.ones((5, 5), np.uint8)
            return cv2.morphologyEx(coarse_mask, cv2.MORPH_CLOSE, kernel)

        ys, xs = np.where(coarse_mask > 0)
        if len(xs) == 0:
            return coarse_mask

        x1, x2 = int(xs.min()), int(xs.max())
        y1, y2 = int(ys.min()), int(ys.max())
        self._predictor.set_image(image_rgb)
        masks, scores, _ = self._predictor.predict(box=np.array([x1, y1, x2, y2]), multimask_output=True)
        best_idx = int(np.argmax(scores))
        refined = (masks[best_idx].astype(np.uint8) * 255)
        return refined


sam_refiner = OptionalSamRefiner()


def inpaint_image(image_rgb: np.ndarray, mask: np.ndarray, radius: int) -> np.ndarray:
    return cv2.inpaint(image_rgb, mask, radius, cv2.INPAINT_TELEA)


def compute_outside_diff(original: np.ndarray, result: np.ndarray, mask: np.ndarray) -> float:
    outside = mask == 0
    diff = np.abs(result.astype(np.int16) - original.astype(np.int16)).sum(axis=2)
    return float(diff[outside].sum())


def qc_passed(outside_diff: float, threshold: float = 0.0) -> bool:
    return outside_diff <= threshold


def ndarray_to_pil(image: np.ndarray) -> Image.Image:
    return Image.fromarray(image.astype(np.uint8))


def mask_to_pil(mask: np.ndarray) -> Image.Image:
    return Image.fromarray(mask.astype(np.uint8))
