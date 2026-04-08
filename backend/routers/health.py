import httpx
from fastapi import APIRouter

from config import settings

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
async def health():
    ollama_ok = False
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{settings.ollama_base_url}/api/tags")
            ollama_ok = resp.status_code == 200
    except Exception:
        pass

    return {
        "status": "ok",
        "ollama": "connected" if ollama_ok else "disconnected",
        "model": settings.ollama_model,
    }
