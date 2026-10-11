from typing import Dict, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from ..db import db
from ..services import notify

router = APIRouter(prefix="/notifications", tags=["notifications"])


class MarkRead(BaseModel):
    user_id: str
    ids: Optional[List[str]] = None  # None = mark everything read


class Prefs(BaseModel):
    user_id: str
    prefs: Dict[str, bool]


class PushToken(BaseModel):
    user_id: str
    token: str = Field(pattern=r"^(Exponent|Expo)PushToken\[[^\]]+\]$")


@router.get("/{user_id}")
async def list_notifications(user_id: str, limit: int = 50):
    rows = await db.notifications.find({"user_id": user_id}).sort("created_at", -1).to_list(min(limit, 200))
    unread = await db.notifications.count_documents({"user_id": user_id, "read": False})
    return {
        "unread": unread,
        "items": [
            {k: (v.isoformat() if k == "created_at" else v) for k, v in r.items() if k != "_id"}
            for r in rows
        ],
    }


@router.post("/read")
async def mark_read(body: MarkRead):
    query = {"user_id": body.user_id, "read": False}
    if body.ids is not None:
        query["id"] = {"$in": body.ids}
    res = await db.notifications.update_many(query, {"$set": {"read": True}})
    return {"updated": res.modified_count}


@router.get("/prefs/{user_id}")
async def get_prefs(user_id: str):
    prefs = await notify.get_prefs(user_id)
    return {
        "prefs": prefs,
        "kinds": [{"id": k, "label": v, "locked": k in notify.ALWAYS_ON} for k, v in notify.KINDS.items()],
    }


@router.put("/prefs")
async def update_prefs(body: Prefs):
    return {"prefs": await notify.set_prefs(body.user_id, body.prefs)}


@router.post("/push-token")
async def register_push_token(body: PushToken):
    await db.users.update_one({"id": body.user_id}, {"$addToSet": {"push_tokens": body.token}})
    return {"registered": True}
