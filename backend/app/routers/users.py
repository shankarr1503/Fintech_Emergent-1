import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException

from ..db import db
from ..models import DeleteAccountRequest, LanguageUpdate, SecuritySettings, SupportRequest, UserUpdate
from ..services import game
from ..utils import serialize_doc

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/users/{user_id}")
async def get_user(user_id: str):
    """Get user profile"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return serialize_doc(user)

@router.put("/users/{user_id}")
async def update_user(user_id: str, user_data: UserUpdate):
    """Update user profile"""
    update_data = {k: v for k, v in user_data.model_dump().items() if v is not None}

    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
        await game.award(user_id, "profile_updated")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "message": "Profile updated successfully",
        "user": serialize_doc(user)
    }

@router.delete("/users/{user_id}")
async def delete_user_account(user_id: str, request: DeleteAccountRequest):
    """Delete user account and all associated data"""
    # Delete all user data
    await db.transactions.delete_many({"user_id": user_id})
    await db.debts.delete_many({"user_id": user_id})
    await db.savings_goals.delete_many({"user_id": user_id})
    await db.insights.delete_many({"user_id": user_id})
    await db.game_profiles.delete_many({"user_id": user_id})
    await db.game_events.delete_many({"user_id": user_id})
    await db.users.delete_one({"id": user_id})
    
    logger.info(f"User {user_id} account deleted. Reason: {request.reason}")
    
    return {"message": "Account deleted successfully"}

@router.post("/support")
async def submit_support_request(request: SupportRequest):
    """Submit a support request"""
    support_ticket = {
        "id": str(uuid.uuid4()),
        "user_id": request.user_id,
        "subject": request.subject,
        "message": request.message,
        "status": "open",
        "created_at": datetime.utcnow()
    }
    await db.support_tickets.insert_one(dict(support_ticket))
    
    return {"message": "Support request submitted", "ticket_id": support_ticket['id']}


@router.post("/users/{user_id}/language")
async def update_language(user_id: str, data: LanguageUpdate):
    """Update user's preferred language"""
    await db.users.update_one({"id": user_id}, {"$set": {"language": data.language}})
    return {"message": "Language updated successfully", "language": data.language}

@router.get("/users/{user_id}/security")
async def get_security_settings(user_id: str):
    """Get user's security settings"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "biometric_enabled": user.get('biometric_enabled', False),
        "transaction_alerts": user.get('transaction_alerts', True),
        "login_notifications": user.get('login_notifications', True)
    }

@router.post("/users/{user_id}/security")
async def update_security_settings(user_id: str, settings: SecuritySettings):
    """Update user's security settings"""
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "biometric_enabled": settings.biometric_enabled,
            "transaction_alerts": settings.transaction_alerts,
            "login_notifications": settings.login_notifications
        }}
    )
    return {"message": "Security settings updated"}

@router.get("/users/{user_id}/linked-accounts")
async def get_linked_accounts(user_id: str):
    """Get user's linked bank accounts (mock)"""
    # In production, this would fetch from Account Aggregator
    accounts = await db.linked_accounts.find({"user_id": user_id}).to_list(10)
    if not accounts:
        # Return demo accounts
        return [
            {
                "id": "acc_001",
                "bank_name": "HDFC Bank",
                "account_type": "Savings",
                "last_four": "4521",
                "linked_date": datetime.utcnow().isoformat(),
                "status": "active"
            }
        ]
    return serialize_doc(accounts)

@router.get("/users/{user_id}/export")
async def export_user_data(user_id: str):
    """Export all user data"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    transactions = await db.transactions.find({"user_id": user_id}).to_list(10000)
    debts = await db.debts.find({"user_id": user_id}).to_list(100)
    savings = await db.savings_goals.find({"user_id": user_id}).to_list(100)
    
    return {
        "export_date": datetime.utcnow().isoformat(),
        "user": serialize_doc(user),
        "transactions": serialize_doc(transactions),
        "debts": serialize_doc(debts),
        "savings_goals": serialize_doc(savings),
        "total_transactions": len(transactions),
        "total_debts": len(debts),
        "total_savings_goals": len(savings)
    }
