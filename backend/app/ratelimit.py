"""Sliding-window rate limits stored in the database (shared by all API instances)."""
from datetime import datetime, timedelta

from fastapi import HTTPException, Request

from .db import db


async def limit(key: str, max_hits: int, window_seconds: int) -> None:
    """Record a hit for `key`; raise 429 once `max_hits` happen within the window."""
    now = datetime.utcnow()
    since = now - timedelta(seconds=window_seconds)
    recent = await db.rate_limits.count_documents({"key": key, "at": {"$gte": since}})
    if recent >= max_hits:
        oldest = await db.rate_limits.find_one({"key": key, "at": {"$gte": since}}, sort=[("at", 1)])
        retry = int(window_seconds - (now - oldest["at"]).total_seconds()) + 1 if oldest else window_seconds
        minutes = max(1, round(retry / 60))
        raise HTTPException(
            status_code=429,
            detail=f"Too many attempts. Try again in {minutes} minute{'s' if minutes != 1 else ''}.",
            headers={"Retry-After": str(retry)},
        )
    await db.rate_limits.insert_one({"key": key, "at": now, "expires_at": now + timedelta(seconds=window_seconds)})


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
