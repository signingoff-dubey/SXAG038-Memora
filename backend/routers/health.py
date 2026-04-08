import logging

import httpx
from fastapi import APIRouter

from config import settings
from services.llm import get_ollama_models

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
async def health():
    ollama_ok = False
    error_detail = None
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{settings.ollama_base_url}/api/tags")
            ollama_ok = resp.status_code == 200
            if not ollama_ok:
                error_detail = f"Ollama returned status {resp.status_code}"
    except httpx.ConnectError:
        error_detail = "Connection refused — is Ollama running and (if cloud) is the tunnel open?"
    except httpx.TimeoutException:
        error_detail = "Connection timed out — check your network or tunnel."
    except Exception as e:
        error_detail = str(e)
        logger.warning(f"Health check failed to connect to Ollama: {e}")

    return {
        "status": "ok",
        "ollama": {
            "connected": ollama_ok,
            "error": error_detail,
            "base_url": settings.ollama_base_url,
            "model": settings.ollama_model
        }
    }


@router.get("/models")
async def list_models():
    """Return all locally available Ollama models."""
    models = await get_ollama_models()
    return {
        "models": [
            {
                "name": m.get("name", ""),
                "size": m.get("size", 0),
                "modified_at": m.get("modified_at", ""),
                "details": m.get("details", {}),
            }
            for m in models
        ]
    }
