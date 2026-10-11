import logging

from fastapi import APIRouter, Request

from ..db import db
from ..services import audit
from ..utils import serialize_doc

router = APIRouter()
public_router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/security/audit-log/{user_id}")
async def get_audit_log(user_id: str):
    """The user's own security events from the tamper-evident audit trail.

    The per-request "api:" entries stay in the trail for investigators but are noise to the user."""
    return [e for e in await audit.for_user(user_id, limit=300) if not e["action"].startswith("api:")][:50]

@router.get("/security/privacy-settings/{user_id}")
async def get_privacy_settings(user_id: str):
    """Get user's privacy settings"""
    settings = await db.privacy_settings.find_one({"user_id": user_id})
    
    if not settings:
        settings = {
            "user_id": user_id,
            "data_sharing": {
                "analytics": True,
                "personalization": True,
                "marketing": False,
                "third_party": False
            },
            "communication": {
                "email_notifications": True,
                "sms_alerts": True,
                "push_notifications": True,
                "whatsapp_updates": False
            },
            "security": {
                "two_factor_auth": False,
                "biometric_login": True,
                "session_timeout": 30,  # minutes
                "trusted_devices": ["iPhone 14 Pro"]
            },
            "data_retention": {
                "transaction_history": "5_years",
                "analytics_data": "2_years",
                "consent_logs": "7_years"  # RBI requirement
            }
        }
        await db.privacy_settings.insert_one(settings)
    
    return serialize_doc(settings)

@router.post("/security/update-privacy")
async def update_privacy_settings(data: dict, request: Request):
    """Update privacy settings"""
    user_id = data.get("user_id")
    settings = data.get("settings", {})
    
    await db.privacy_settings.update_one(
        {"user_id": user_id},
        {"$set": settings},
        upsert=True
    )
    
    await audit.record("privacy_settings_updated", user_id, {"changes": sorted(settings.keys())}, request)
    
    return {"message": "Privacy settings updated"}

@public_router.get("/compliance/rbi-info")
async def get_rbi_compliance_info():
    """Security and privacy controls the app implements. Certifications are listed only once obtained."""
    return {
        "certifications": [],
        "certification_note": "No third-party certification (PCI DSS, ISO 27001) or RBI licence is claimed. See docs/COMPLIANCE.md.",
        "controls": [
            "OTP sign-in plus an app PIN (two factors); biometric app lock on supported phones",
            "Sessions expire after 15 minutes of inactivity and 30 days at most",
            "Sensitive identity data encrypted with AES-256-GCM before it is stored",
            "Tamper-evident (hash-chained) audit trail of sign-ins, payments and settings changes",
            "KYC-based transaction limits and automated anti-money-laundering checks",
            "Card numbers are never stored; any typed into free text are masked",
        ],
        "user_rights": [
            "Download all your data",
            "Correct your profile",
            "Delete your account and data",
            "Withdraw Account Aggregator consent at any time",
            "Choose which notifications you receive",
        ],
        "grievance_officer": {"name": "Grievance Officer", "email": "grievance@coinquest.app", "response_time": "48 hours"},
    }
