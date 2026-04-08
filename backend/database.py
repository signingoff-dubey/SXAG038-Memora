import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from config import settings

logger = logging.getLogger(__name__)
engine = create_async_engine(settings.database_url, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session() as session:
        yield session


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        migrations = [
            "ALTER TABLE memories ADD COLUMN is_session_only BOOLEAN DEFAULT 0",
        ]
        for sql in migrations:
            try:
                await conn.execute(text(sql))
            except Exception as e:
                logger.debug(f"Migration skipped (column may already exist): {e}")
