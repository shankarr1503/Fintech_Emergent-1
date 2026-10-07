"""Session tokens and per-user access control.

`verify-otp` issues a signed JWT whose subject is the user id. Every other
non-public route requires it, and `require_user` rejects any request whose
`user_id` (path, query or JSON body) is not the caller's own. Routes that take
a resource id (debt, goal, consent) also filter by the caller's id.
"""
import json
import logging
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import HTTPException, Request

from .config import settings

logger = logging.getLogger(__name__)

ALGORITHM = "HS256"
TOKEN_TTL = timedelta(days=30)

_secret = settings.secret_key
if not _secret:
    _secret = secrets.token_urlsafe(48)
    logger.warning("SECRET_KEY not set - using a random key; sessions end when the server restarts")


def create_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode({"sub": user_id, "iat": now, "exp": now + TOKEN_TTL}, _secret, algorithm=ALGORITHM)


def decode_token(token: str) -> str:
    try:
        return jwt.decode(token, _secret, algorithms=[ALGORITHM])["sub"]
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Session expired. Please sign in again.")


async def require_user(request: Request) -> str:
    """FastAPI dependency: authenticate the caller and enforce user_id ownership."""
    header = request.headers.get("authorization", "")
    if not header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Sign in required")
    user_id = decode_token(header[7:].strip())

    claimed = [request.path_params.get("user_id"), request.query_params.get("user_id")]
    if request.method in ("POST", "PUT", "PATCH", "DELETE") and "json" in request.headers.get("content-type", ""):
        try:
            body = json.loads(await request.body() or b"{}")  # Starlette caches the body for the route
        except ValueError:
            body = None
        if isinstance(body, dict):
            claimed.append(body.get("user_id"))
    if any(c is not None and c != user_id for c in claimed):
        raise HTTPException(status_code=403, detail="You can only access your own account")

    request.state.user_id = user_id
    return user_id


def current_user(request: Request) -> str:
    """The authenticated user id (set by require_user)."""
    return request.state.user_id
