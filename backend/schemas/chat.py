import re
from urllib.parse import urlparse

from pydantic import BaseModel, Field, field_validator, model_validator


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=10000)
    session_id: str | None = None
    user_id: str = Field(default="default", max_length=100)
    model: str | None = Field(default=None, max_length=100)
    custom_base_url: str | None = Field(default=None, max_length=500)
    custom_api_key: str | None = Field(default=None, max_length=500)
    images: list[str] | None = Field(default=None, max_length=10)

    @field_validator(
        "user_id", "model", "custom_base_url", "custom_api_key", mode="before"
    )
    @classmethod
    def sanitize_string(cls, v):
        if v is None:
            return v
        if isinstance(v, str):
            return v.strip()
        return v

    @model_validator(mode="after")
    def validate_urls(self):
        if self.custom_base_url:
            parsed = urlparse(self.custom_base_url)
            if parsed.scheme not in ("http", "https"):
                raise ValueError("Invalid URL scheme")
            hostname = parsed.hostname or ""
            # Block loopback and private IP ranges from custom API base URLs
            loopback = {"localhost", "127.0.0.1", "::1"}
            private_ip_patterns = [
                r"^10\.",
                r"^172\.(1[6-9]|2[0-9]|3[0-1])\.",
                r"^192\.168\.",
                r"^127\.",
            ]
            if hostname in loopback:
                raise ValueError("Loopback addresses not allowed as custom API URL")
            for pattern in private_ip_patterns:
                if re.match(pattern, hostname):
                    raise ValueError("Private IP addresses not allowed as custom API URL")
        return self


class ChatResponse(BaseModel):
    response: str
    memories_used: list[str] = []
    session_id: str
    model_used: str | None = None
