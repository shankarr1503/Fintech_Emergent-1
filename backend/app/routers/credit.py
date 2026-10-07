import logging
import random
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException

from ..db import db
from ..services import game
from ..utils import months_ago_label, serialize_doc

router = APIRouter()
logger = logging.getLogger(__name__)

# Credit Score Management
@router.get("/credit-score/{user_id}")
async def get_credit_score(user_id: str):
    """Get user's credit score (simulated CIBIL/Experian)"""
    score_data = await db.credit_scores.find_one({"user_id": user_id})
    
    if not score_data:
        # Generate initial simulated credit score
        base_score = random.randint(650, 800)
        score_data = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "score": base_score,
            "rating": "Excellent" if base_score >= 750 else "Good" if base_score >= 700 else "Fair" if base_score >= 650 else "Poor",
            "factors": {
                "payment_history": random.randint(70, 100),
                "credit_utilization": random.randint(20, 50),
                "credit_age": random.randint(2, 10),
                "credit_mix": random.randint(60, 90),
                "recent_inquiries": random.randint(0, 3)
            },
            "credit_cards": [
                {
                    "bank": "HDFC Bank",
                    "card_type": "Regalia",
                    "limit": 200000,
                    "used": random.randint(20000, 80000),
                    "due_date": (datetime.utcnow() + timedelta(days=random.randint(5, 25))).strftime("%Y-%m-%d"),
                    "min_due": random.randint(2000, 5000),
                    "total_due": random.randint(10000, 50000),
                    "reward_points": random.randint(1000, 15000)
                },
                {
                    "bank": "ICICI Bank", 
                    "card_type": "Amazon Pay",
                    "limit": 150000,
                    "used": random.randint(15000, 60000),
                    "due_date": (datetime.utcnow() + timedelta(days=random.randint(5, 25))).strftime("%Y-%m-%d"),
                    "min_due": random.randint(1500, 4000),
                    "total_due": random.randint(8000, 40000),
                    "reward_points": random.randint(500, 8000)
                }
            ],
            "history": [
                {"month": months_ago_label(i), "score": base_score - random.randint(5 * i, 10 * i + 5)}
                for i in range(1, 6)
            ],
            "last_updated": datetime.utcnow(),
            "next_update": datetime.utcnow() + timedelta(days=30)
        }
        await db.credit_scores.insert_one(score_data)
    
    return serialize_doc(score_data)

@router.post("/credit-cards/pay-bill")
async def pay_credit_card_bill(payment: dict):
    """Pay credit card bill and earn rewards"""
    user_id = payment.get("user_id")
    card_bank = payment.get("card_bank")
    amount = payment.get("amount", 0)
    
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    # 1 coin per ₹100 paid
    coins_earned = int(amount / 100)
    await db.users.update_one({"id": user_id}, {"$inc": {"reward_coins": coins_earned}})
    
    # Record payment
    payment_record = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": "credit_card_bill",
        "card_bank": card_bank,
        "amount": amount,
        "coins_earned": coins_earned,
        "status": "success",
        "timestamp": datetime.utcnow()
    }
    await db.payments.insert_one(payment_record)
    
    reward = await game.award(user_id, "bill_paid")
    return {
        "message": "Bill paid successfully!",
        "amount_paid": amount,
        "coins_earned": coins_earned,
        "transaction_id": payment_record["id"],
        "reward": reward,
    }
