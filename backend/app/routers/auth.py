import logging
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException

from ..config import settings
from ..db import db
from ..models import OTPRequest, OTPVerify, User
from ..services.sample_data import generate_sample_data

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/auth/send-otp")
async def send_otp(request: OTPRequest):
    """Send OTP to phone (mocked for demo)"""
    # Generate 6-digit OTP
    otp = "".join(secrets.choice("0123456789") for _ in range(6))
    otp_expiry = datetime.utcnow() + timedelta(minutes=5)
    
    # Check if user exists, if not create
    user = await db.users.find_one({"phone": request.phone})
    if user:
        await db.users.update_one(
            {"phone": request.phone},
            {"$set": {"otp": otp, "otp_expiry": otp_expiry}}
        )
    else:
        new_user = User(phone=request.phone, otp=otp, otp_expiry=otp_expiry)
        await db.users.insert_one(new_user.dict())
    
    if not settings.demo_mode:
        # Production: hand the OTP to your SMS provider here.
        return {"message": "OTP sent successfully"}

    logger.info(f"OTP for {request.phone}: {otp}")
    return {"message": "OTP sent successfully", "demo_otp": otp}

@router.post("/auth/verify-otp")
async def verify_otp(request: OTPVerify):
    """Verify OTP and return user"""
    user = await db.users.find_one({"phone": request.phone})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get('otp') != request.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    if user.get('otp_expiry') and datetime.utcnow() > user['otp_expiry']:
        raise HTTPException(status_code=400, detail="OTP expired")
    
    # Clear OTP after successful verification
    await db.users.update_one(
        {"phone": request.phone},
        {"$set": {"otp": None, "otp_expiry": None}}
    )
    
    # Check if user has sample data, if not generate
    transaction_count = await db.transactions.count_documents({"user_id": user['id']})
    if transaction_count == 0:
        await generate_sample_data(user['id'])
    
    return {
        "message": "Login successful",
        "user": {
            "id": user['id'],
            "phone": user['phone'],
            "name": user.get('name'),
            "monthly_income": user.get('monthly_income', 0),
            "fixed_expenses": user.get('fixed_expenses', 0),
            "avatar": user.get('avatar', 'hero'),
        }
    }
