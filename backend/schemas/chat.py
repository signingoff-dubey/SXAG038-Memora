from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None
    user_id: str = "default"


class ChatResponse(BaseModel):
    response: str
    memories_used: list[str] = []
    session_id: str
