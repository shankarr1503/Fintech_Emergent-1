import logging
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import APIRouter, Depends, FastAPI
from starlette.middleware.cors import CORSMiddleware

from .auth import require_user
from .config import settings
from .db import client, db
from .routers import (
    aa,
    accounts,
    analytics,
    auth,
    bills,
    community,
    credit,
    dashboard,
    debts,
    game,
    learn,
    loans,
    rewards,
    savings,
    security,
    transactions,
    upi,
    users,
)

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Expire rate-limit hits and revoked tokens automatically (TTL indexes on real MongoDB).
    await db.rate_limits.create_index("expires_at", expireAfterSeconds=0)
    await db.rate_limits.create_index([("key", 1), ("at", 1)])
    await db.revoked_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.revoked_tokens.create_index("jti", unique=True)
    await db.users.create_index("phone", unique=True)
    yield
    client.close()


app = FastAPI(title=settings.app_name, version="2.0.0", lifespan=lifespan)

api = APIRouter(prefix="/api")


@api.get("/")
async def root():
    return {"message": settings.app_name, "version": "2.0.0"}


@api.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}


# Public: sign-in plus static catalogue content.
api.include_router(auth.router)
api.include_router(learn.public_router)
api.include_router(community.router)
api.include_router(security.public_router)

# Everything else needs a session token and may only touch the caller's own data.
for module in (
    users, transactions, analytics, debts, savings, dashboard, credit, rewards,
    bills, learn, aa, security, upi, loans, accounts, game,
):
    api.include_router(module.router, dependencies=[Depends(require_user)])

app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=settings.cors_origins != ["*"],
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)
