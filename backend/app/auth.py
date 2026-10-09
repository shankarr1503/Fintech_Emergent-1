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
from .db import db

logger = logging.getLogger(__name__)

ALGORITHM = "HS256"
TOKEN_TTL = timedelta(days=30)

_secret = settings.secret_key
if not _secret:
    _secret = secrets.token_urlsafe(48)
    logger.warning("SECRET_KEY not set - using a random key; sessions end when the server restarts")


def create_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    claims = {"sub": user_id, "jti": secrets.token_urlsafe(16), "iat": now, "exp": now + TOKEN_TTL}
    return jwt.encode(claims, _secret, algorithm=ALGORITHM)


def _claims(token: str) -> dict:
    try:
        return jwt.decode(token, _secret, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Session expired. Please sign in again.")


async def decode_token(token: str) -> str:
    """Validate signature, expiry and revocation; return the user id."""
    claims = _claims(token)
    if await db.revoked_tokens.find_one({"jti": claims.get("jti")}):
        raise HTTPException(status_code=401, detail="Session ended. Please sign in again.")
    return claims["sub"]


async def revoke_token(token: str) -> None:
    claims = _claims(token)
    expires = datetime.fromtimestamp(claims["exp"], tz=timezone.utc).replace(tzinfo=None)
    await db.revoked_tokens.update_one(
        {"jti": claims["jti"]}, {"$set": {"jti": claims["jti"], "expires_at": expires}}, upsert=True
    )


async def require_user(request: Request) -> str:
    """FastAPI dependency: authenticate the caller and enforce user_id ownership."""
    header = request.headers.get("authorization", "")
    if not header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Sign in required")
    user_id = await decode_token(header[7:].strip())

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
