"""Database handle. Uses MongoDB when MONGO_URL is set, otherwise an in-memory mock."""
import logging

from .config import settings

logger = logging.getLogger(__name__)

if settings.mongo_url:
    from motor.motor_asyncio import AsyncIOMotorClient

    client = AsyncIOMotorClient(settings.mongo_url)
else:
    from mongomock_motor import AsyncMongoMockClient

    logger.warning("MONGO_URL not set - using in-memory database (data resets on restart)")
    client = AsyncMongoMockClient()

db = client[settings.db_name]
