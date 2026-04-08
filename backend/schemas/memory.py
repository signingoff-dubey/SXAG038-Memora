from datetime import datetime
from pydantic import BaseModel


class MemoryResponse(BaseModel):
    id: str
    user_id: str
    session_id: str | None = None
    content: str
    importance: float
    decay_score: float
    lambda_rate: float
    is_pinned: bool
    is_flagged_unimportant: bool
    is_session_only: bool = False
    contradiction_with: list[str] = []
    access_count: int
    created_at: datetime | str | None = None
    last_accessed_at: datetime | str | None = None
    updated_at: datetime | str | None = None

    class Config:
        from_attributes = True


class MemoryUpdate(BaseModel):
    is_pinned: bool | None = None
    is_flagged_unimportant: bool | None = None
    is_session_only: bool | None = None
    content: str | None = None
    importance: float | None = None   # allow user to override AI-assigned score
