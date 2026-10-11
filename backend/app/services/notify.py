"""User notifications: stored in-app and, when enabled, sent as push via Expo.

Security alerts (new sign-ins, PIN lockouts, AML holds) are always sent;
users can switch the other kinds off in Settings.
"""
import asyncio
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, Optional

import httpx

from ..config import settings
from ..db import db

logger = logging.getLogger(__name__)

KINDS = {
    "debit": "Money sent or spent",
    "credit": "Money received",
    "bills": "Bill reminders",
    "rewards": "Coins, streaks and quests",
    "security": "Sign-ins and account security",
    "marketing": "Offers and product news",
}
ALWAYS_ON = {"security"}
DEFAULTS = {k: k != "marketing" for k in KINDS}

def unsubscribe_link(user_id: str) -> str:
    """One-click unsubscribe link for the footer of every marketing email."""
    from ..auth import sign

    return f"{settings.public_api_url}/api/notifications/unsubscribe?u={user_id}&t={sign('unsub:' + user_id)}"


def email_headers(user_id: str) -> Dict[str, str]:
    """List-Unsubscribe headers (RFC 2369 / RFC 8058) so mail apps show their own unsubscribe button."""
    return {"List-Unsubscribe": f"<{unsubscribe_link(user_id)}>", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"}


EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def get_prefs(user_id: str) -> Dict[str, bool]:
    doc = await db.notification_prefs.find_one({"user_id": user_id}) or {}
    prefs = {**DEFAULTS, **{k: v for k, v in doc.get("prefs", {}).items() if k in KINDS}}
    for k in ALWAYS_ON:
        prefs[k] = True
    return prefs


async def set_prefs(user_id: str, changes: Dict[str, bool]) -> Dict[str, bool]:
    clean = {k: bool(v) for k, v in changes.items() if k in KINDS and k not in ALWAYS_ON}
    current = await get_prefs(user_id)
    current.update(clean)
    await db.notification_prefs.update_one({"user_id": user_id}, {"$set": {"user_id": user_id, "prefs": current}}, upsert=True)
    return current


async def _push(tokens, title: str, body: str, data: Dict[str, Any]):
    messages = [{"to": t, "title": title, "body": body, "data": data, "sound": "default"} for t in tokens]
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            res = await client.post(EXPO_PUSH_URL, json=messages)
            if res.status_code >= 400:
                logger.warning("Push failed: %s %s", res.status_code, res.text[:200])
    except httpx.HTTPError as e:  # push is best effort; the in-app copy is the record
        logger.warning("Push unavailable: %s", e)


async def send(user_id: str, kind: str, title: str, body: str, data: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
    """Store the notification and push it (in the background) if the user allows this kind."""
    if kind not in KINDS:
        raise ValueError(f"Unknown notification kind {kind}")
    prefs = await get_prefs(user_id)
    if not prefs.get(kind):
        return None
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "kind": kind,
        "title": title,
        "body": body,
        "data": data or {},
        "read": False,
        "created_at": datetime.utcnow(),
    }
    await db.notifications.insert_one(dict(doc))
    if settings.push_enabled:
        user = await db.users.find_one({"id": user_id}) or {}
        tokens = user.get("push_tokens", [])
        if tokens:
            asyncio.create_task(_push(tokens, title, body, {**(data or {}), "kind": kind}))
    return doc
