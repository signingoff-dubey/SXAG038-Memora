import chromadb

from config import settings

_client: chromadb.ClientAPI | None = None
_collection: chromadb.Collection | None = None


def get_client() -> chromadb.ClientAPI:
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
    return _client


def get_collection() -> chromadb.Collection:
    global _collection
    if _collection is None:
        client = get_client()
        _collection = client.get_or_create_collection(
            name="memora_memories",
            metadata={"hnsw:space": "cosine"},
        )
    return _collection


def add_memory(memory_id: str, embedding: list[float], content: str, metadata: dict):
    collection = get_collection()
    collection.add(
        ids=[memory_id],
        embeddings=[embedding],
        documents=[content],
        metadatas=[metadata],
    )


def query_similar(embedding: list[float], n_results: int = 20, where: dict | None = None) -> dict:
    collection = get_collection()
    kwargs = {
        "query_embeddings": [embedding],
        "n_results": n_results,
        "include": ["embeddings", "documents", "metadatas", "distances"],
    }
    if where:
        kwargs["where"] = where
    return collection.query(**kwargs)


def delete_memory(memory_id: str):
    collection = get_collection()
    collection.delete(ids=[memory_id])


def update_memory(memory_id: str, embedding: list[float], content: str, metadata: dict):
    collection = get_collection()
    collection.update(
        ids=[memory_id],
        embeddings=[embedding],
        documents=[content],
        metadatas=[metadata],
    )
