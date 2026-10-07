import logging

from fastapi import APIRouter

from ..db import db
from ..utils import serialize_doc
from .analytics import get_analytics_summary

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/dashboard/{user_id}")
async def get_dashboard(user_id: str):
    """Get complete dashboard data"""
    # Get analytics
    analytics = await get_analytics_summary(user_id)
    
    # Get debts summary
    debts = await db.debts.find({"user_id": user_id}).to_list(100)
    total_debt = sum(d['outstanding'] for d in debts)
    total_emi = sum(d['emi_amount'] for d in debts)
    
    # Get savings summary
    goals = await db.savings_goals.find({"user_id": user_id}).to_list(100)
    total_saved = sum(g['current_amount'] for g in goals)
    total_target = sum(g['target_amount'] for g in goals)
    
    # Get recent transactions
    recent_txns_raw = await db.transactions.find({"user_id": user_id}).sort("date", -1).to_list(5)
    recent_txns = serialize_doc(recent_txns_raw)
    
    # Generate one recommended action
    action = None
    if total_debt > 0 and analytics['remaining_balance'] > total_emi:
        action = {
            "type": "debt",
            "title": "Pay Extra on Debt",
            "description": f"You have ₹{int(analytics['remaining_balance'] - total_emi):,} extra. Consider paying ₹2,000 more on your highest interest debt.",
            "action_id": "debt_payoff"
        }
    elif analytics['remaining_balance'] > 5000:
        action = {
            "type": "savings",
            "title": "Boost Savings",
            "description": f"Great month! Move ₹{int(analytics['remaining_balance'] * 0.2):,} to your savings goal.",
            "action_id": "savings_boost"
        }
    else:
        action = {
            "type": "expense",
            "title": "Review Expenses",
            "description": "Check your food delivery expenses - they might be higher than usual.",
            "action_id": "expense_review"
        }
    
    return {
        "spending": {
            "this_month": analytics['this_month_spending'],
            "last_month": analytics['last_month_spending'],
            "change_percentage": analytics['change_percentage'],
            "remaining_balance": analytics['remaining_balance']
        },
        "income": analytics['total_income'],
        "debts": {
            "total": total_debt,
            "monthly_emi": total_emi,
            "count": len(debts)
        },
        "savings": {
            "total_saved": total_saved,
            "total_target": total_target,
            "progress": round((total_saved / total_target * 100) if total_target > 0 else 0, 1),
            "goals_count": len(goals)
        },
        "category_breakdown": analytics['category_breakdown'],
        "recent_transactions": recent_txns,
        "recommended_action": action
    }
