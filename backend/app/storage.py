from __future__ import annotations

import shutil
import uuid
from pathlib import Path

from PIL import Image

from .settings import settings


def make_session_dir() -> tuple[str, Path]:
    session_id = uuid.uuid4().hex[:12]
    path = settings.storage_dir / session_id
    path.mkdir(parents=True, exist_ok=True)
    return session_id, path


def get_session_dir(session_id: str) -> Path:
    path = settings.storage_dir / session_id
    if not path.exists():
        raise FileNotFoundError(f"Unknown session: {session_id}")
    return path


def save_original(session_dir: Path, image: Image.Image) -> Path:
    path = session_dir / "original.jpg"
    image.save(path, "JPEG", quality=95)
    return path


def save_preview(session_dir: Path, image: Image.Image) -> tuple[Path, int, int]:
    image = image.copy()
    image.thumbnail((settings.preview_max_px, settings.preview_max_px), Image.Resampling.LANCZOS)
    path = session_dir / "preview.jpg"
    image.save(path, "JPEG", quality=settings.preview_quality)
    return path, image.width, image.height


def save_mask(session_dir: Path, mask_image: Image.Image) -> Path:
    path = session_dir / "mask.png"
    mask_image.save(path, "PNG")
    return path


def save_result(session_dir: Path, result_image: Image.Image) -> Path:
    path = session_dir / "result.jpg"
    result_image.save(path, "JPEG", quality=95)
    return path


def cleanup_session(session_id: str) -> None:
    path = settings.storage_dir / session_id
    if path.exists():
        shutil.rmtree(path, ignore_errors=True)
