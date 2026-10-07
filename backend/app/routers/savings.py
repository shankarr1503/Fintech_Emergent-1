import logging

from fastapi import APIRouter, HTTPException

from ..db import db
from ..models import SavingsContribution, SavingsGoal, SavingsGoalCreate
from ..services import game
from ..utils import serialize_doc
from .analytics import get_analytics_summary

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/savings/{user_id}")
async def get_savings_goals(user_id: str):
    """Get all savings goals"""
    goals = await db.savings_goals.find({"user_id": user_id}).to_list(100)
    return serialize_doc(goals)

@router.post("/savings")
async def create_savings_goal(goal: SavingsGoalCreate):
    """Create a new savings goal"""
    goal_obj = SavingsGoal(**goal.model_dump())
    await db.savings_goals.insert_one(goal_obj.model_dump())
    reward = await game.award(goal.user_id, "goal_created")
    return {**goal_obj.model_dump(mode="json"), "reward": reward}

@router.post("/savings/contribute")
async def contribute_to_goal(contribution: SavingsContribution):
    """Add contribution to a savings goal"""
    goal = await db.savings_goals.find_one({"id": contribution.goal_id})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    was_complete = goal['current_amount'] >= goal['target_amount']
    new_amount = round(goal['current_amount'] + contribution.amount, 2)
    await db.savings_goals.update_one(
        {"id": contribution.goal_id},
        {"$set": {"current_amount": new_amount}}
    )

    reward = await game.award(goal['user_id'], "goal_contribution")
    completed = not was_complete and new_amount >= goal['target_amount']
    if completed:
        reward = await game.award(goal['user_id'], "goal_completed")
    return {"message": "Contribution added", "new_total": new_amount, "completed": completed, "reward": reward}

@router.delete("/savings/{goal_id}")
async def delete_savings_goal(goal_id: str):
    """Delete a savings goal"""
    result = await db.savings_goals.delete_one({"id": goal_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    return {"message": "Goal deleted"}

@router.get("/savings/suggestions/{user_id}")
async def get_savings_suggestions(user_id: str):
    """Get AI-powered savings suggestions"""
    # Get user's spending pattern
    analytics = await get_analytics_summary(user_id)
    remaining = analytics['remaining_balance']
    spending = analytics['this_month_spending']
    
    suggestions = []
    
    # Safe savings amount (50-30-20 rule)
    safe_savings = remaining * 0.2 if remaining > 0 else 0
    suggestions.append({
        "type": "safe",
        "amount": round(safe_savings, 2),
        "description": "20% of your remaining balance - conservative and sustainable"
    })
    
    # Moderate savings
    moderate = remaining * 0.3 if remaining > 0 else 0
    suggestions.append({
        "type": "moderate",
        "amount": round(moderate, 2),
        "description": "30% of remaining - good progress toward your goals"
    })
    
    # Aggressive savings (with expense cuts)
    expense_reduction = spending * 0.1
    aggressive = (remaining + expense_reduction) * 0.35 if remaining > 0 else 0
    suggestions.append({
        "type": "aggressive",
        "amount": round(aggressive, 2),
        "description": "35% with 10% expense reduction - fastest goal achievement"
    })
    
    return suggestions
