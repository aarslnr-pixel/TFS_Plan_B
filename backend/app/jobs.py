from __future__ import annotations

from datetime import datetime, timezone
from threading import Lock

from .schemas import JobInfo


_jobs: dict[str, JobInfo] = {}
_lock = Lock()


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def create_job(job_id: str, session_id: str) -> JobInfo:
    now = utcnow()
    job = JobInfo(job_id=job_id, session_id=session_id, status="queued", created_at=now, updated_at=now)
    with _lock:
        _jobs[job_id] = job
    return job


def get_job(job_id: str) -> JobInfo | None:
    with _lock:
        return _jobs.get(job_id)


def update_job(job_id: str, **kwargs) -> JobInfo:
    with _lock:
        job = _jobs[job_id]
        updated = job.model_copy(update={**kwargs, "updated_at": utcnow()})
        _jobs[job_id] = updated
        return updated
