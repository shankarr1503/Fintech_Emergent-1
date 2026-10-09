import logging
import random
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException

from ..db import db
from ..ratelimit import limit
from ..services import game
from ..utils import serialize_doc

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/upi/linked-accounts/{user_id}")
async def get_upi_linked_accounts(user_id: str):
    """Get user's UPI linked bank accounts (demo balances, stable per user)"""
    rng = random.Random(user_id)
    return {
        "upi_id": f"user{user_id[:4]}@coinquest",
        "linked_accounts": [
            {
                "id": "upi_1",
                "bank": "HDFC Bank",
                "account_number": "XXXX1234",
                "ifsc": "HDFC0001234",
                "is_primary": True,
                "balance": rng.randint(10000, 500000),
                "upi_handle": "@hdfcbank"
            },
            {
                "id": "upi_2", 
                "bank": "ICICI Bank",
                "account_number": "XXXX5678",
                "ifsc": "ICIC0005678",
                "is_primary": False,
                "balance": rng.randint(5000, 200000),
                "upi_handle": "@icici"
            },
            {
                "id": "upi_3",
                "bank": "State Bank of India",
                "account_number": "XXXX9012",
                "ifsc": "SBIN0009012",
                "is_primary": False,
                "balance": rng.randint(20000, 300000),
                "upi_handle": "@sbi"
            }
        ],
        "daily_limit": 100000,
        "used_today": rng.randint(0, 30000)
    }

@router.get("/upi/recent-payees/{user_id}")
async def get_recent_payees(user_id: str):
    """Get recent UPI payees"""
    return [
        {"id": "p1", "name": "Rahul Sharma", "upi_id": "rahul@paytm", "avatar": "R", "last_paid": "₹500", "frequency": "frequent"},
        {"id": "p2", "name": "Swiggy", "upi_id": "swiggy@ybl", "avatar": "S", "last_paid": "₹350", "frequency": "frequent"},
        {"id": "p3", "name": "Amazon Pay", "upi_id": "amazon@apl", "avatar": "A", "last_paid": "₹1,299", "frequency": "weekly"},
        {"id": "p4", "name": "Priya Kumar", "upi_id": "priya@okaxis", "avatar": "P", "last_paid": "₹2,000", "frequency": "monthly"},
        {"id": "p5", "name": "Electricity Board", "upi_id": "mseb@upi", "avatar": "E", "last_paid": "₹2,450", "frequency": "monthly"},
        {"id": "p6", "name": "Netflix", "upi_id": "netflix@icici", "avatar": "N", "last_paid": "₹649", "frequency": "monthly"},
    ]

@router.post("/upi/send-money")
async def send_money_upi(data: dict):
    """Send money via UPI"""
    user_id = data.get("user_id")
    recipient_upi = data.get("recipient_upi")
    amount = data.get("amount", 0)
    note = data.get("note", "")
    source_account = data.get("source_account")
    await limit(f"payments:{user_id}", 10, 60)
    
    try:
        amount = float(amount)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid amount")
    if amount <= 0 or amount > 100000:
        raise HTTPException(status_code=400, detail="Amount must be between ₹1 and ₹1,00,000")
    if not recipient_upi or "@" not in recipient_upi:
        raise HTTPException(status_code=400, detail="Enter a valid UPI ID")

    transaction_id = f"UPI{uuid.uuid4().hex[:12].upper()}"
    
    # Earn coins (1 coin per ₹50 for UPI)
    coins_earned = int(amount / 50)
    
    await db.users.update_one(
        {"id": user_id},
        {"$inc": {"reward_coins": coins_earned}}
    )
    
    # Record transaction
    txn = {
        "id": transaction_id,
        "user_id": user_id,
        "type": "upi_send",
        "amount": amount,
        "recipient": recipient_upi,
        "note": note,
        "source_account": source_account,
        "status": "success",
        "coins_earned": coins_earned,
        "timestamp": datetime.utcnow()
    }
    await db.upi_transactions.insert_one(dict(txn))
    reward = await game.award(user_id, "payment_sent")

    return {
        "reward": reward,
        "status": "success",
        "transaction_id": transaction_id,
        "amount": amount,
        "recipient": recipient_upi,
        "coins_earned": coins_earned,
        "message": f"₹{amount:,.0f} sent successfully!"
    }

@router.post("/upi/request-money")
async def request_money_upi(data: dict):
    """Request money via UPI"""
    user_id = data.get("user_id")
    from_upi = data.get("from_upi")
    amount = data.get("amount", 0)
    note = data.get("note", "")
    await limit(f"payment-requests:{user_id}", 10, 60)

    request_id = f"REQ{uuid.uuid4().hex[:10].upper()}"
    await db.upi_requests.insert_one({
        "id": request_id, "user_id": user_id, "from_upi": from_upi, "amount": amount,
        "note": note, "status": "pending", "timestamp": datetime.utcnow(),
    })

    return {
        "status": "pending",
        "request_id": request_id,
        "amount": amount,
        "from_upi": from_upi,
        "message": "Payment request sent!"
    }

@router.get("/upi/transaction-history/{user_id}")
async def get_upi_history(user_id: str):
    """Get UPI transaction history"""
    transactions = await db.upi_transactions.find({"user_id": user_id}).sort("timestamp", -1).to_list(50)
    
    if not transactions:
        # Sample transactions
        transactions = [
            {"id": "UPI001", "type": "sent", "amount": 500, "to": "rahul@paytm", "timestamp": datetime.utcnow() - timedelta(hours=2), "status": "success"},
            {"id": "UPI002", "type": "received", "amount": 1000, "from": "priya@okaxis", "timestamp": datetime.utcnow() - timedelta(hours=5), "status": "success"},
            {"id": "UPI003", "type": "sent", "amount": 350, "to": "swiggy@ybl", "timestamp": datetime.utcnow() - timedelta(days=1), "status": "success"},
            {"id": "UPI004", "type": "sent", "amount": 2450, "to": "mseb@upi", "timestamp": datetime.utcnow() - timedelta(days=2), "status": "success"},
        ]
    
    return serialize_doc(transactions)
