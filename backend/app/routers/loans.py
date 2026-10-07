import logging
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException

from ..db import db
from ..services import game
from ..utils import serialize_doc

router = APIRouter()
logger = logging.getLogger(__name__)

LOAN_RATES = {"loan_against_mf": 10.5, "loan_against_shares": 11.5, "loan_against_fd": 8.5, "personal_loan": 14.5}


@router.get("/loans/eligibility/{user_id}")
async def check_loan_eligibility(user_id: str):
    """Check loan eligibility against assets"""
    # Get user's assets
    credit_score = await db.credit_scores.find_one({"user_id": user_id})
    score = credit_score.get("score", 700) if credit_score else 700
    
    return {
        "credit_score": score,
        "max_loan_amount": 1000000 if score >= 750 else 500000 if score >= 700 else 200000,
        "eligible_loan_types": [
            {
                "type": "loan_against_mf",
                "name": "Loan Against Mutual Funds",
                "max_ltv": 70,  # Loan to Value ratio
                "interest_rate": 10.5,
                "processing_fee": 1,
                "tenure_options": [12, 24, 36, 48, 60],
                "collateral_value": 450000,
                "max_loan": 315000,
                "disbursement_time": "Instant"
            },
            {
                "type": "loan_against_shares",
                "name": "Loan Against Shares",
                "max_ltv": 50,
                "interest_rate": 11.5,
                "processing_fee": 1.5,
                "tenure_options": [12, 24, 36],
                "collateral_value": 320000,
                "max_loan": 160000,
                "disbursement_time": "2-4 hours"
            },
            {
                "type": "loan_against_fd",
                "name": "Loan Against FD",
                "max_ltv": 90,
                "interest_rate": 8.5,
                "processing_fee": 0.5,
                "tenure_options": [12, 24, 36, 48, 60],
                "collateral_value": 200000,
                "max_loan": 180000,
                "disbursement_time": "Instant"
            },
            {
                "type": "personal_loan",
                "name": "Personal Loan",
                "max_ltv": 100,
                "interest_rate": 14.5,
                "processing_fee": 2,
                "tenure_options": [12, 24, 36, 48, 60],
                "collateral_value": 0,
                "max_loan": 500000 if score >= 700 else 200000,
                "disbursement_time": "24-48 hours"
            }
        ],
        "pre_approved_offers": [
            {
                "id": "offer_1",
                "type": "loan_against_mf",
                "amount": 200000,
                "interest_rate": 9.99,
                "tenure": 36,
                "emi": 6451,
                "valid_until": (datetime.utcnow() + timedelta(days=30)).strftime("%Y-%m-%d"),
                "special": True
            }
        ]
    }

@router.post("/loans/apply")
async def apply_for_loan(data: dict):
    """Apply for a loan"""
    user_id = data.get("user_id")
    loan_type = data.get("loan_type")
    amount = data.get("amount")
    tenure = data.get("tenure")
    collateral_ids = data.get("collateral_ids", [])
    
    try:
        amount, tenure = float(amount), int(tenure)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid amount or tenure")
    if amount <= 0 or tenure <= 0:
        raise HTTPException(status_code=400, detail="Amount and tenure must be positive")

    annual_rate = LOAN_RATES.get(loan_type, 10.5)
    rate = annual_rate / 12 / 100
    emi = (amount * rate * (1 + rate)**tenure) / ((1 + rate)**tenure - 1)
    
    loan_id = f"LN{uuid.uuid4().hex[:10].upper()}"
    
    loan = {
        "id": loan_id,
        "user_id": user_id,
        "type": loan_type,
        "amount": amount,
        "tenure": tenure,
        "emi": round(emi, 2),
        "interest_rate": annual_rate,
        "status": "approved",
        "disbursement_status": "processing",
        "collateral_ids": collateral_ids,
        "applied_at": datetime.utcnow(),
        "disbursement_date": datetime.utcnow() + timedelta(hours=2)
    }
    
    await db.loans.insert_one(dict(loan))
    reward = await game.award(user_id, "loan_applied")

    return {
        "reward": reward,
        "interest_rate": annual_rate,
        "status": "approved",
        "loan_id": loan_id,
        "amount": amount,
        "emi": round(emi, 2),
        "tenure": tenure,
        "message": "Loan approved! Amount will be disbursed within 2 hours."
    }

@router.get("/loans/active/{user_id}")
async def get_active_loans(user_id: str):
    """Get user's active loans"""
    loans = await db.loans.find({"user_id": user_id, "status": {"$in": ["approved", "active"]}}).to_list(10)
    
    if not loans:
        # Sample loan
        loans = [
            {
                "id": "LN001",
                "type": "loan_against_mf",
                "name": "Loan Against Mutual Funds",
                "amount": 150000,
                "outstanding": 125000,
                "emi": 4832,
                "interest_rate": 10.5,
                "tenure": 36,
                "remaining_tenure": 26,
                "next_emi_date": (datetime.utcnow() + timedelta(days=15)).strftime("%Y-%m-%d"),
                "status": "active",
                "collateral": {
                    "type": "mutual_funds",
                    "value": 220000,
                    "funds": ["Axis Bluechip Fund", "HDFC Mid-Cap Fund"]
                }
            }
        ]
    
    return serialize_doc(loans)
