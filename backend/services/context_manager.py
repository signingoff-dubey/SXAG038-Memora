"""
Manages per-user context profiles stored as JSON files on disk.

Each user gets a  data/context_<user_id>.json  file that persists:
  - user_profile : free-text "Who am I" description filled in by the user
  - updated_at   : ISO timestamp of the last save

The AI reads this file before every response so it is always context-aware.
"""

import json
from datetime import datetime
from pathlib import Path

# Stored next to the backend package root  →  backend/data/
DATA_DIR = Path(__file__).parent.parent / "data"


def _context_path(user_id: str) -> Path:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    # Sanitise user_id so it's safe as a filename
    safe = "".join(c if c.isalnum() or c in "-_." else "_" for c in user_id)
    return DATA_DIR / f"context_{safe}.json"


def load_context(user_id: str) -> dict:
    """Return the stored context dict; returns defaults if not yet created."""
    path = _context_path(user_id)
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"user_id": user_id, "user_profile": "", "updated_at": None}


def save_context(user_id: str, user_profile: str) -> dict:
    """Persist the user profile and return the saved dict."""
    ctx = {
        "user_id": user_id,
        "user_profile": user_profile.strip(),
        "updated_at": datetime.utcnow().isoformat(),
    }
    _context_path(user_id).write_text(
        json.dumps(ctx, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    return ctx
