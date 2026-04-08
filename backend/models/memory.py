import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Memory(Base):
    __tablename__ = "memories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(64), default="default", index=True)
    session_id: Mapped[str] = mapped_column(String(36), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    importance: Mapped[float] = mapped_column(Float, default=5.0)
    decay_score: Mapped[float] = mapped_column(Float, default=1.0)
    lambda_rate: Mapped[float] = mapped_column(Float, default=0.05)
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    is_flagged_unimportant: Mapped[bool] = mapped_column(Boolean, default=False)
    is_session_only: Mapped[bool] = mapped_column(Boolean, default=False)
    contradiction_with: Mapped[list] = mapped_column(JSON, default=list)
    access_count: Mapped[int] = mapped_column(Integer, default=0)
    # Store as naive UTC — consistent with SQLite's behaviour
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_accessed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "session_id": self.session_id,
            "content": self.content,
            "importance": self.importance,
            "decay_score": self.decay_score,
            "lambda_rate": self.lambda_rate,
            "is_pinned": self.is_pinned,
            "is_flagged_unimportant": self.is_flagged_unimportant,
            "is_session_only": self.is_session_only,
            "contradiction_with": self.contradiction_with or [],
            "access_count": self.access_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_accessed_at": self.last_accessed_at.isoformat() if self.last_accessed_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
