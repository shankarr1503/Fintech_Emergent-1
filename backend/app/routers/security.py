import logging
from datetime import datetime, timedelta

from fastapi import APIRouter

from ..db import db
from ..utils import serialize_doc

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/security/audit-log/{user_id}")
async def get_audit_log(user_id: str):
    """Get security audit log for user"""
    logs = await db.audit_logs.find({"user_id": user_id}).sort("timestamp", -1).to_list(50)
    
    if not logs:
        # Generate sample logs
        logs = [
            {"action": "login", "timestamp": datetime.utcnow() - timedelta(hours=2), "device": "iPhone 14", "location": "Mumbai"},
            {"action": "transaction_view", "timestamp": datetime.utcnow() - timedelta(hours=5), "device": "iPhone 14", "location": "Mumbai"},
            {"action": "password_change", "timestamp": datetime.utcnow() - timedelta(days=5), "device": "Web", "location": "Mumbai"},
            {"action": "consent_granted", "timestamp": datetime.utcnow() - timedelta(days=10), "device": "iPhone 14", "location": "Mumbai"},
        ]
    
    return serialize_doc(logs)

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
async def update_privacy_settings(data: dict):
    """Update privacy settings"""
    user_id = data.get("user_id")
    settings = data.get("settings", {})
    
    await db.privacy_settings.update_one(
        {"user_id": user_id},
        {"$set": settings},
        upsert=True
    )
    
    # Audit log
    await db.audit_logs.insert_one({
        "user_id": user_id,
        "action": "privacy_settings_updated",
        "timestamp": datetime.utcnow(),
        "changes": list(settings.keys())
    })
    
    return {"message": "Privacy settings updated"}

@router.get("/compliance/rbi-info")
async def get_rbi_compliance_info():
    """Get RBI compliance information"""
    return {
        "certifications": [
            "RBI Licensed Account Aggregator Partner",
            "PCI-DSS Compliant",
            "ISO 27001 Certified",
            "DPDP Act 2023 Compliant"
        ],
        "data_protection": {
            "encryption": "AES-256 bit encryption for data at rest",
            "transmission": "TLS 1.3 for data in transit",
            "storage": "Data stored in India (RBI data localization)",
            "access": "Read-only access to financial data",
            "retention": "As per RBI guidelines"
        },
        "user_rights": [
            "Right to access your data",
            "Right to correct inaccurate data",
            "Right to delete your data",
            "Right to data portability",
            "Right to withdraw consent anytime"
        ],
        "grievance_officer": {
            "name": "Compliance Officer",
            "email": "grievance@coinquest.app",
            "response_time": "48 hours"
        },
        "regulators": [
            {"name": "Reserve Bank of India", "role": "Primary regulator for AA framework"},
            {"name": "SEBI", "role": "Investment data regulations"},
            {"name": "IRDAI", "role": "Insurance data regulations"}
        ]
    }
