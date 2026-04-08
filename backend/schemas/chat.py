from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None
    user_id: str = "default"
    model: str | None = None
    custom_base_url: str | None = None
    custom_api_key: str | None = None
    images: list[str] | None = None   # base64-encoded image strings


class ChatResponse(BaseModel):
    response: str
    memories_used: list[str] = []
    session_id: str
    model_used: str | None = None
