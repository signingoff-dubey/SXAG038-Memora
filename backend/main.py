import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from database import init_db
from routers import chat, memories, websocket, health, context, config
from services.scheduler import start_scheduler, stop_scheduler


limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Path(__file__).parent.joinpath("data").mkdir(parents=True, exist_ok=True)

    _load_config_overrides()

    await init_db()
    start_scheduler()
    yield
    stop_scheduler()


def _load_config_overrides() -> None:
    import json
    from config import settings

    override_file = Path(__file__).parent / "data" / "config_overrides.json"
    if not override_file.exists():
        return
    try:
        overrides = json.loads(override_file.read_text())
        for key, val in overrides.items():
            if hasattr(settings, key) and val is not None:
                setattr(settings, key, val)
    except Exception:
        pass


app = FastAPI(title="Memora", version="0.1.0", lifespan=lifespan)
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    raise HTTPException(status_code=429, detail="Rate limit exceeded")


# ── CORS - Strict allowed origins only ──────────────────────────────────────
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "https://memora-kabir.netlify.app",
]

extra_origin = os.getenv("ALLOWED_ORIGIN")
if extra_origin:
    allowed_origins.append(extra_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)


# ── Security Headers via middleware ───────────────────────────────────────
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response


app.include_router(chat.router)
app.include_router(memories.router)
app.include_router(websocket.router)
app.include_router(health.router)
app.include_router(context.router)
app.include_router(config.router)
