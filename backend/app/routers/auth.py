import hashlib
import hmac
import logging
import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from ..auth import (
    check_pin,
    create_session,
    current_user,
    device_of,
    hash_pin,
    mfa_token,
    pin_problem,
    require_user,
    revoke_session,
    step_up_token,
    user_from_mfa,
)
from ..config import settings
from ..db import db
from ..models import OTPRequest, OTPVerify, User
from ..ratelimit import client_ip, limit
from ..services import audit, crypto, notify
from ..services.sample_data import generate_sample_data

router = APIRouter()
logger = logging.getLogger(__name__)

OTP_TTL = timedelta(minutes=5)
MAX_OTP_ATTEMPTS = 5
# Bump when the Terms or Privacy Policy change; users accept the new version at next sign-in.
TERMS_VERSION = "2026-10"
INVALID = "Invalid or expired code"  # same message for unknown phone, wrong or expired code


def _hash_otp(phone: str, otp: str) -> str:
    """OTPs are stored hashed (keyed by phone) so a database leak doesn't reveal live codes."""
    return hashlib.sha256(f"{phone}:{otp}".encode()).hexdigest()


@router.post("/auth/send-otp")
async def send_otp(request: OTPRequest, http: Request):
    """Send a one-time code (returned in the response in demo mode)."""
    await limit(f"otp-send:phone:{request.phone}", 3, 600)
    await limit(f"otp-send:ip:{client_ip(http)}", settings.otp_sends_per_ip_hour, 3600)

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
    await limit(f"otp-verify:ip:{client_ip(http)}", settings.otp_verifies_per_ip_10min, 600)
    user = await db.users.find_one({"phone": request.phone})
    if not user or not user.get("otp_hash"):
        raise HTTPException(status_code=400, detail=INVALID)

    if user.get("otp_expiry") and datetime.utcnow() > user["otp_expiry"]:
        await db.users.update_one({"phone": request.phone}, {"$unset": {"otp_hash": "", "otp_expiry": ""}})
        raise HTTPException(status_code=400, detail=INVALID)

    if not hmac.compare_digest(user["otp_hash"], _hash_otp(request.phone, request.otp)):
        await audit.record("login_otp_failed", user["id"], {"phone": f"******{request.phone[-4:]}"}, http)
        attempts = user.get("otp_attempts", 0) + 1
        if attempts >= MAX_OTP_ATTEMPTS:
            # Burn the code: guessing has to start over with a fresh (rate-limited) send.
            await db.users.update_one({"phone": request.phone}, {"$unset": {"otp_hash": "", "otp_expiry": ""}})
            raise HTTPException(status_code=400, detail="Too many wrong codes. Request a new one.")
        await db.users.update_one({"phone": request.phone}, {"$set": {"otp_attempts": attempts}})
        left = MAX_OTP_ATTEMPTS - attempts
        raise HTTPException(status_code=400, detail=f"Wrong code. {left} attempt{'s' if left != 1 else ''} left.")

    first_consent = not user.get("consents")
    if first_consent and request.accept_terms != TERMS_VERSION:
        raise HTTPException(status_code=400, detail="Please accept the Terms and Privacy Policy to continue")

    await db.users.update_one(
        {"phone": request.phone},
        {"$unset": {"otp_hash": "", "otp_expiry": "", "otp_attempts": ""}},
    )

    # New players get a demo world to explore.
    if await db.transactions.count_documents({"user_id": user["id"]}) == 0:
        await generate_sample_data(user["id"])

    if first_consent:
        consent = {"terms": TERMS_VERSION, "privacy": TERMS_VERSION, "at": datetime.utcnow().isoformat()}
        await db.users.update_one({"id": user["id"]}, {"$push": {"consents": consent}})
        await audit.record("terms_accepted", user["id"], {"version": TERMS_VERSION}, http)
    await audit.record("login_otp_verified", user["id"], {"phone": f"******{request.phone[-4:]}"}, http)
    if user.get("pin"):
        # Second factor: the app PIN, exchanged for a session at /auth/pin/login.
        return {"mfa_required": True, "mfa_token": mfa_token(user["id"])}
    # First sign-in: start a session; the app then requires setting a PIN before anything else.
    return await _finish_login(user, http)


async def _finish_login(user: dict, http: Request) -> dict:
    token = await create_session(user["id"], http)
    device = device_of(http)
    known = user.get("known_devices", [])
    if known and device["device_id"] not in known:
        await notify.send(
            user["id"], "security", "New sign-in",
            f"Your account was opened on {device['device_name']}. If this wasn't you, sign out other devices from Security and change your PIN.",
        )
    await db.users.update_one({"id": user["id"]}, {"$addToSet": {"known_devices": device["device_id"]}})
    await audit.record("login", user["id"], {"device_id": device["device_id"], "new_device": bool(known) and device["device_id"] not in known}, http)
    return {"message": "Login successful", "token": token, "pin_required": not user.get("pin"), "user": public_user(user)}


def public_user(user: dict) -> dict:
    return {
        "id": user["id"],
        "phone": user["phone"],
        "name": user.get("name"),
        "monthly_income": user.get("monthly_income", 0),
        "fixed_expenses": user.get("fixed_expenses", 0),
        "avatar": user.get("avatar", "hero"),
        "pin_set": bool(user.get("pin")),
        "kyc_status": user.get("kyc", {}).get("status", "none"),
    }


class PinLogin(BaseModel):
    mfa_token: str
    pin: str = Field(pattern=r"^\d{4,6}$")


class PinSet(BaseModel):
    pin: str
    current_pin: Optional[str] = None


class PinCheck(BaseModel):
    pin: str = Field(pattern=r"^\d{4,6}$")


@router.post("/auth/pin/login")
async def pin_login(body: PinLogin, http: Request):
    """Second sign-in step: OTP already verified, now the PIN."""
    user_id = user_from_mfa(body.mfa_token)
    await limit(f"pin-login:{user_id}", 10, 600)
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=401, detail="Please sign in again")
    try:
        await check_pin(user, body.pin)
    except HTTPException as e:
        await audit.record("login_pin_failed", user_id, {"status": e.status_code}, http)
        raise
    return await _finish_login(user, http)


@router.post("/auth/pin", dependencies=[Depends(require_user)])
async def set_pin(body: PinSet, http: Request):
    """Create the app PIN, or change it (current PIN required)."""
    user = await db.users.find_one({"id": current_user(http)})
    if user.get("pin"):
        if not body.current_pin:
            raise HTTPException(status_code=400, detail="Enter your current PIN")
        await check_pin(user, body.current_pin)
    problem = pin_problem(body.pin)
    if problem:
        raise HTTPException(status_code=400, detail=problem)
    changed = bool(user.get("pin"))
    await db.users.update_one({"id": user["id"]}, {"$set": {"pin": hash_pin(body.pin), "pin_attempts": 0}, "$unset": {"pin_locked_until": ""}})
    await audit.record("pin_changed" if changed else "pin_set", user["id"], {}, http)
    if changed:
        await notify.send(user["id"], "security", "PIN changed", "Your CoinQuest PIN was changed. If this wasn't you, contact support now.")
    return {"pin_set": True}


class PinReset(BaseModel):
    mfa_token: str
    new_pin: str
    pan: Optional[str] = None  # required once KYC is complete


@router.post("/auth/pin/reset")
async def reset_pin(body: PinReset, http: Request):
    """Forgot PIN: OTP (via mfa_token) plus PAN for KYC'd users. Large payments pause for 24 hours afterwards."""
    user_id = user_from_mfa(body.mfa_token)
    await limit(f"pin-reset:{user_id}", 3, 3600)
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=401, detail="Please sign in again")
    if user.get("kyc", {}).get("status") == "verified":
        if not body.pan or crypto.blind_index(body.pan.strip().upper()) != user["kyc"].get("pan_hash"):
            await audit.record("pin_reset_failed", user_id, {"reason": "pan_mismatch"}, http)
            raise HTTPException(status_code=400, detail="That PAN doesn't match your KYC record")
    problem = pin_problem(body.new_pin)
    if problem:
        raise HTTPException(status_code=400, detail=problem)
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"pin": hash_pin(body.new_pin), "pin_attempts": 0, "pin_reset_at": datetime.utcnow()}, "$unset": {"pin_locked_until": ""}},
    )
    # A reset is a classic account-takeover step: end every other session and tell the user.
    await db.sessions.update_many({"user_id": user_id, "revoked": False}, {"$set": {"revoked": True, "revoked_reason": "pin_reset"}})
    await audit.record("pin_reset", user_id, {}, http)
    await notify.send(user_id, "security", "PIN reset", "Your PIN was reset and other devices were signed out. Payments of ₹2,000 or more are paused for 24 hours.")
    return await _finish_login(await db.users.find_one({"id": user_id}), http)


@router.post("/auth/pin/verify", dependencies=[Depends(require_user)])
async def verify_pin(body: PinCheck, http: Request):
    """Fresh PIN check before a sensitive action. Returns a 5-minute step-up token."""
    user = await db.users.find_one({"id": current_user(http)})
    await check_pin(user, body.pin)
    return {"step_up_token": step_up_token(user["id"], http.state.session_id), "expires_in": 300}


@router.get("/auth/sessions", dependencies=[Depends(require_user)])
async def list_sessions(http: Request):
    rows = await db.sessions.find({"user_id": current_user(http), "revoked": False}).sort("last_seen", -1).to_list(50)
    return [
        {
            "id": r["sid"],
            "device": r.get("device_name", "Unknown device"),
            "ip": r.get("ip"),
            "created_at": r["created_at"].isoformat(),
            "last_seen": r["last_seen"].isoformat(),
            "current": r["sid"] == http.state.session_id,
        }
        for r in rows
    ]


@router.delete("/auth/sessions/{sid}", dependencies=[Depends(require_user)])
async def end_session(sid: str, http: Request):
    res = await db.sessions.update_one({"sid": sid, "user_id": current_user(http)}, {"$set": {"revoked": True, "revoked_reason": "user"}})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Session not found")
    await audit.record("session_revoked", current_user(http), {"sid": sid[:6]}, http)
    return {"revoked": True}


@router.post("/auth/sessions/revoke-others", dependencies=[Depends(require_user)])
async def end_other_sessions(http: Request):
    res = await db.sessions.update_many(
        {"user_id": current_user(http), "revoked": False, "sid": {"$ne": http.state.session_id}},
        {"$set": {"revoked": True, "revoked_reason": "user_revoked_others"}},
    )
    await audit.record("sessions_revoked_others", current_user(http), {"count": res.modified_count}, http)
    return {"revoked": res.modified_count}


@router.post("/auth/logout", dependencies=[Depends(require_user)])
async def logout(http: Request):
    """End the current session on the server."""
    await revoke_session(http.state.session_id, "logout")
    return {"message": "Logged out"}
