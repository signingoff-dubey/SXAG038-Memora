from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_model: str = "qwen2.5-coder:7b"
    embedding_model: str = "all-MiniLM-L6-v2"
    nli_model: str = "cross-encoder/nli-deberta-v3-small"
    database_url: str = "sqlite+aiosqlite:///./memora.db"
    chroma_persist_dir: str = "./chroma_data"

    dedup_threshold: float = 0.92
    contradiction_threshold: float = 0.75
    merge_threshold: float = 0.88
    decay_lambda: float = 0.05
    deletion_threshold: float = 0.15
    deletion_threshold_unimportant: float = 0.30

    retrieval_candidates: int = 20
    context_memories: int = 5
    importance_threshold: float = 3.0
    weight_cosine: float = 0.5
    weight_recency: float = 0.3
    weight_importance: float = 0.2

    class Config:
        env_file = ".env"


settings = Settings()
