import json
import logging
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

from config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["config"])

_CONFIG_FILE = Path(__file__).parent.parent / "data" / "config_overrides.json"


class ConfigUpdate(BaseModel):
    context_memories: int | None = None
    decay_lambda: float | None = None
    dedup_threshold: float | None = None
    merge_threshold: float | None = None
    deletion_threshold: float | None = None
    retrieval_candidates: int | None = None
    importance_threshold: float | None = None


def _snapshot() -> dict:
    return {
        "context_memories": settings.context_memories,
        "decay_lambda": settings.decay_lambda,
        "dedup_threshold": settings.dedup_threshold,
        "merge_threshold": settings.merge_threshold,
        "deletion_threshold": settings.deletion_threshold,
        "retrieval_candidates": settings.retrieval_candidates,
        "importance_threshold": settings.importance_threshold,
    }


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


@router.get("/config")
def get_config() -> dict:
    return _snapshot()


@router.patch("/config")
def update_config(body: ConfigUpdate) -> dict:
    if body.context_memories is not None:
        settings.context_memories = int(_clamp(body.context_memories, 1, 10))
    if body.decay_lambda is not None:
        settings.decay_lambda = _clamp(body.decay_lambda, 0.01, 0.5)
    if body.dedup_threshold is not None:
        settings.dedup_threshold = _clamp(body.dedup_threshold, 0.7, 0.99)
    if body.merge_threshold is not None:
        settings.merge_threshold = _clamp(body.merge_threshold, 0.7, 0.99)
    if body.deletion_threshold is not None:
        settings.deletion_threshold = _clamp(body.deletion_threshold, 0.05, 0.5)
    if body.retrieval_candidates is not None:
        settings.retrieval_candidates = int(_clamp(body.retrieval_candidates, 5, 30))
    if body.importance_threshold is not None:
        settings.importance_threshold = _clamp(body.importance_threshold, 1.0, 9.0)

    # Persist so restarts reload overrides
    _CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
    existing: dict = json.loads(_CONFIG_FILE.read_text()) if _CONFIG_FILE.exists() else {}
    existing.update({k: v for k, v in body.model_dump().items() if v is not None})
    _CONFIG_FILE.write_text(json.dumps(existing, indent=2))

    logger.info(f"Config updated: {existing}")
    return _snapshot()
