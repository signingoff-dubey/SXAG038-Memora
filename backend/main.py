from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from routers import chat, memories, websocket, health, context


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure the data directory exists before any request touches it
    Path(__file__).parent.joinpath("data").mkdir(parents=True, exist_ok=True)
    await init_db()
    yield


app = FastAPI(title="Memora", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(memories.router)
app.include_router(websocket.router)
app.include_router(health.router)
app.include_router(context.router)
