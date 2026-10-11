"""Anti-money-laundering transaction monitoring.

A small, explainable rule engine run before every outgoing payment. Each rule
returns a severity:
- "review": the payment goes ahead and an alert is raised for compliance staff
- "hold":   the payment is not sent; it waits for compliance review

Alerts land in `aml_alerts` (see GET /api/admin/aml/alerts). A real deployment
would also file Suspicious Transaction Reports with FIU-IND from this queue.
"""
import uuid
from datetime import datetime, timedelta
from typing import Dict, List

from ..db import db

LARGE_AMOUNT = 50_000
NEW_PAYEE_LARGE = 20_000
STRUCTURING_BAND = (9_000, 10_000)  # many payments just under a round threshold
STRUCTURING_COUNT = 3
VELOCITY_COUNT = 6
VELOCITY_WINDOW = timedelta(minutes=10)


async def evaluate(user: dict, amount: float, recipient: str) -> Dict:
    now = datetime.utcnow()
    uid = user["id"]
    hits: List[Dict[str, str]] = []

    recent = await db.upi_transactions.count_documents({"user_id": uid, "timestamp": {"$gte": now - VELOCITY_WINDOW}})
    if recent + 1 >= VELOCITY_COUNT:
        hits.append({"rule": "velocity", "severity": "review", "why": f"{recent + 1} payments in 10 minutes"})

    if amount >= LARGE_AMOUNT:
        hits.append({"rule": "large_amount", "severity": "review", "why": f"Single payment of ₹{amount:,.0f}"})

    lo, hi = STRUCTURING_BAND
    if lo <= amount < hi:
        near = await db.upi_transactions.count_documents({
            "user_id": uid, "timestamp": {"$gte": now - timedelta(hours=24)}, "amount": {"$gte": lo, "$lt": hi},
        })
        if near + 1 >= STRUCTURING_COUNT:
            hits.append({"rule": "structuring", "severity": "hold", "why": f"{near + 1} payments just under ₹10,000 in 24 hours"})

    if amount >= NEW_PAYEE_LARGE:
        paid_before = await db.upi_transactions.count_documents({"user_id": uid, "recipient": recipient, "status": "success"})
        if not paid_before:
            hits.append({"rule": "new_payee_large", "severity": "review", "why": f"First payment to {recipient} is ₹{amount:,.0f}"})

    outcome = "hold" if any(h["severity"] == "hold" for h in hits) else "review" if hits else "allow"
    return {"outcome": outcome, "hits": hits}


async def raise_alert(user_id: str, txn_id: str, amount: float, recipient: str, result: Dict) -> str:
    alert_id = f"AML{uuid.uuid4().hex[:10].upper()}"
    await db.aml_alerts.insert_one({
        "id": alert_id,
        "user_id": user_id,
        "txn_id": txn_id,
        "amount": amount,
        "recipient": recipient,
        "outcome": result["outcome"],
        "rules": result["hits"],
        "status": "open",
        "created_at": datetime.utcnow(),
    })
    return alert_id
