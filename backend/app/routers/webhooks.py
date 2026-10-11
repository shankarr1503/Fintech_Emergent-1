"""Inbound webhooks from the payment provider.

Security and reliability rules for every event:
- HMAC-SHA256 signature over "<timestamp>.<raw body>" with WEBHOOK_SECRET
- timestamp must be within 5 minutes (stops replays of captured requests)
- each event_id is processed at most once (providers retry deliveries)
- late or out-of-order events can't undo a final state (see payments.settle)
"""
import hashlib
import hmac
import json
import time
import uuid
from datetime import datetime

from fastapi import APIRouter, Header, HTTPException, Request
from pymongo.errors import DuplicateKeyError

from ..config import settings
from ..db import db
from ..services import audit, notify, payments

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
TOLERANCE_SECONDS = 300


def sign(timestamp: str, raw: bytes) -> str:
    return hmac.new(settings.webhook_secret.encode(), timestamp.encode() + b"." + raw, hashlib.sha256).hexdigest()


@router.post("/upi")
async def upi_webhook(request: Request, x_signature: str = Header(default=""), x_timestamp: str = Header(default="")):
    if not settings.webhook_secret:
        raise HTTPException(status_code=404, detail="Not found")
    raw = await request.body()
    try:
        ts = int(x_timestamp)
    except ValueError:
        raise HTTPException(status_code=400, detail="Missing timestamp")
    if abs(time.time() - ts) > TOLERANCE_SECONDS:
        raise HTTPException(status_code=400, detail="Stale webhook")
    if not hmac.compare_digest(sign(x_timestamp, raw), x_signature):
        raise HTTPException(status_code=401, detail="Bad signature")

    event = json.loads(raw)
    event_id = event.get("event_id")
    if not event_id:
        raise HTTPException(status_code=400, detail="Missing event_id")
    try:
        await db.webhook_events.insert_one({"event_id": event_id, "type": event.get("type"), "received_at": datetime.utcnow()})
    except DuplicateKeyError:
        return {"received": True, "duplicate": True}

    kind = event.get("type")
    if kind == "payment.updated":
        txn = await db.upi_transactions.find_one({"rail_ref": event.get("rail_ref")}) or await db.upi_transactions.find_one({"id": event.get("txn_id")})
        if not txn:
            return {"received": True, "ignored": "unknown payment"}
        status = event.get("status")
        if status not in ("success", "failed"):
            raise HTTPException(status_code=400, detail="Unknown status")
        result = await payments.settle(txn["id"], status, event.get("reason", ""), source="webhook")
        return {"received": True, "applied": result is not None}

    if kind == "payment.received":
        # Money coming in to the user's UPI ID.
        user_id, amount = event.get("user_id"), float(event.get("amount", 0))
        if not await db.users.find_one({"id": user_id}) or amount <= 0:
            return {"received": True, "ignored": "unknown user"}
        now = datetime.utcnow()
        await db.upi_transactions.insert_one({
            "id": f"UPI{uuid.uuid4().hex[:12].upper()}", "user_id": user_id, "type": "upi_receive", "amount": amount,
            "recipient": None, "from": event.get("from", "UPI"), "status": "success", "rail_ref": event.get("rail_ref"),
            "timestamp": now, "updated_at": now,
        })
        await notify.send(user_id, "credit", f"₹{amount:,.0f} received", f"From {event.get('from', 'a UPI user')}.")
        await audit.record("payment_received", user_id, {"amount": amount, "rail_ref": event.get("rail_ref")})
        return {"received": True}

    return {"received": True, "ignored": f"unhandled type {kind}"}
