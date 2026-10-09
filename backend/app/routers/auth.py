import hashlib
import hmac
import logging
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request

from ..auth import create_token, require_user, revoke_token
from ..config import settings
from ..db import db
from ..models import OTPRequest, OTPVerify, User
from ..ratelimit import client_ip, limit
from ..services.sample_data import generate_sample_data

router = APIRouter()
logger = logging.getLogger(__name__)

OTP_TTL = timedelta(minutes=5)
MAX_OTP_ATTEMPTS = 5
INVALID = "Invalid or expired code"  # same message for unknown phone, wrong or expired code


def _hash_otp(phone: str, otp: str) -> str:
    """OTPs are stored hashed (keyed by phone) so a database leak doesn't reveal live codes."""
    return hashlib.sha256(f"{phone}:{otp}".encode()).hexdigest()


@router.post("/auth/send-otp")
async def send_otp(request: OTPRequest, http: Request):
    """Send a one-time code (returned in the response in demo mode)."""
    await limit(f"otp-send:phone:{request.phone}", 3, 600)
    await limit(f"otp-send:ip:{client_ip(http)}", 20, 3600)

    otp = "".join(secrets.choice("0123456789") for _ in range(6))
    fields = {"otp_hash": _hash_otp(request.phone, otp), "otp_expiry": datetime.utcnow() + OTP_TTL, "otp_attempts": 0}

    if await db.users.find_one({"phone": request.phone}):
        await db.users.update_one({"phone": request.phone}, {"$set": fields, "$unset": {"otp": ""}})
    else:
        await db.users.insert_one({**User(phone=request.phone).model_dump(), **fields})

    if not settings.demo_mode:
        # Production: hand the OTP to your SMS provider here.
        return {"message": "OTP sent successfully"}

    logger.info(f"OTP for {request.phone}: {otp}")
    return {"message": "OTP sent successfully", "demo_otp": otp}


@router.post("/auth/verify-otp")
async def verify_otp(request: OTPVerify, http: Request):
    """Verify the code and start a session."""
    await limit(f"otp-verify:ip:{client_ip(http)}", 30, 600)
    user = await db.users.find_one({"phone": request.phone})
    if not user or not user.get("otp_hash"):
        raise HTTPException(status_code=400, detail=INVALID)

    if user.get("otp_expiry") and datetime.utcnow() > user["otp_expiry"]:
        await db.users.update_one({"phone": request.phone}, {"$unset": {"otp_hash": "", "otp_expiry": ""}})
        raise HTTPException(status_code=400, detail=INVALID)

    if not hmac.compare_digest(user["otp_hash"], _hash_otp(request.phone, request.otp)):
        attempts = user.get("otp_attempts", 0) + 1
        if attempts >= MAX_OTP_ATTEMPTS:
            # Burn the code: guessing has to start over with a fresh (rate-limited) send.
            await db.users.update_one({"phone": request.phone}, {"$unset": {"otp_hash": "", "otp_expiry": ""}})
            raise HTTPException(status_code=400, detail="Too many wrong codes. Request a new one.")
        await db.users.update_one({"phone": request.phone}, {"$set": {"otp_attempts": attempts}})
        left = MAX_OTP_ATTEMPTS - attempts
        raise HTTPException(status_code=400, detail=f"Wrong code. {left} attempt{'s' if left != 1 else ''} left.")

    await db.users.update_one(
        {"phone": request.phone},
        {"$unset": {"otp_hash": "", "otp_expiry": "", "otp_attempts": ""}},
    )

    # New players get a demo world to explore.
    if await db.transactions.count_documents({"user_id": user["id"]}) == 0:
        await generate_sample_data(user["id"])

    return {
        "message": "Login successful",
        "token": create_token(user["id"]),
        "user": {
            "id": user["id"],
            "phone": user["phone"],
            "name": user.get("name"),
            "monthly_income": user.get("monthly_income", 0),
            "fixed_expenses": user.get("fixed_expenses", 0),
            "avatar": user.get("avatar", "hero"),
        },
    }


@router.post("/auth/logout", dependencies=[Depends(require_user)])
async def logout(http: Request):
    """Revoke the current session token on the server."""
    await revoke_token(http.headers["authorization"][7:].strip())
    return {"message": "Logged out"}
