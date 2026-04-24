from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class Stroke(BaseModel):
    brush: int = Field(ge=1, le=256)
    points: list[tuple[float, float]] = Field(min_length=1)

    @field_validator("points")
    @classmethod
    def validate_points(cls, value: list[tuple[float, float]]):
        for x, y in value:
            if not (0 <= x <= 1 and 0 <= y <= 1):
                raise ValueError("Stroke points must be normalized between 0 and 1.")
        return value


class StrokePayload(BaseModel):
    preview_w: int = Field(gt=0)
    preview_h: int = Field(gt=0)
    strokes: list[Stroke] = Field(min_length=1)
    inpaint_radius: int = Field(default=5, ge=1, le=25)


class UploadResponse(BaseModel):
    session_id: str
    preview_url: str
    preview_w: int
    preview_h: int
    original_w: int
    original_h: int


JobStatusLiteral = Literal["queued", "processing", "done", "failed"]


class JobInfo(BaseModel):
    job_id: str
    session_id: str
    status: JobStatusLiteral
    created_at: datetime
    updated_at: datetime
    result_url: str | None = None
    mask_url: str | None = None
    outside_diff: float | None = None
    passed_qc: bool | None = None
    error: str | None = None


class SubmitResponse(BaseModel):
    job_id: str
    status: JobStatusLiteral
