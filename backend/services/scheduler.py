import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import distinct, select

from database import async_session
from models.memory import Memory
from services.curator import run_curation

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


async def _curate_all_users() -> None:
    """Run decay / merge / delete curation for every known user."""
    logger.info("Scheduler: starting memory curation run...")
    try:
        async with async_session() as db:
            result = await db.execute(select(distinct(Memory.user_id)))
            user_ids = [row[0] for row in result.all()]

        for uid in user_ids:
            try:
                async with async_session() as db:
                    await run_curation(uid, db)
            except Exception as e:
                logger.error(f"Curation failed for user '{uid}': {e}")

        logger.info(f"Scheduler: curation complete for {len(user_ids)} user(s).")
    except Exception as e:
        logger.error(f"Scheduler: curation job crashed: {e}")


def start_scheduler() -> None:
    scheduler.add_job(
        _curate_all_users,
        "interval",
        minutes=30,
        id="memory_curation",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler started — memory curation every 30 minutes.")


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped.")
