from typing import Dict, List, Optional

import hmac
from html import escape

from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

from ..auth import sign
from ..db import db
from ..services import audit, notify

router = APIRouter(prefix="/notifications", tags=["notifications"])
# Reached from email links, so no sign-in; the signed token proves the link is genuine.
public_router = APIRouter(prefix="/notifications", tags=["notifications"])

PAGE = """<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title} · CoinQuest</title><style>body{{font-family:system-ui,sans-serif;background:#F3F6F4;color:#0F1E2B;margin:0;padding:48px 16px}}
main{{max-width:440px;margin:auto;background:#fff;border-radius:18px;padding:28px}}h1{{font-size:24px;margin:0 0 8px}}p{{line-height:1.5;color:#33475B}}
button{{font:600 16px system-ui;background:#0E2A3B;color:#fff;border:0;border-radius:999px;padding:14px 22px;cursor:pointer}}button:focus-visible{{outline:3px solid #8CC3F0;outline-offset:2px}}</style></head>
<body><main><h1>{title}</h1>{body}</main></body></html>"""


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


def _check_unsub(u: str, t: str) -> None:
    if not hmac.compare_digest(sign("unsub:" + u), t or ""):
        raise HTTPException(status_code=400, detail="This unsubscribe link isn't valid")


@public_router.get("/unsubscribe", response_class=HTMLResponse)
async def unsubscribe_page(u: str, t: str):
    """Confirmation page. Unsubscribing needs the POST, so link scanners can't do it by accident."""
    _check_unsub(u, t)
    form = (
        f'<p>Stop offers and product news from CoinQuest? You\'ll still get payment and security alerts.</p>'
        f'<form method="post" action="?u={escape(u)}&amp;t={escape(t)}"><button type="submit">Unsubscribe</button></form>'
    )
    return PAGE.format(title="Unsubscribe", body=form)


@public_router.post("/unsubscribe", response_class=HTMLResponse)
async def unsubscribe(u: str, t: str):
    """One-click unsubscribe (RFC 8058) from marketing messages."""
    _check_unsub(u, t)
    if await db.users.find_one({"id": u}):
        await notify.set_prefs(u, {"marketing": False})
        await audit.record("marketing_unsubscribed", u, {"via": "email_link"})
    body = "<p>You won\'t get offers or product news from us any more. You can turn them back on in the app under Me → Notifications.</p>"
    return PAGE.format(title="You're unsubscribed", body=body)
