"""Operations endpoints for compliance staff. Disabled unless ADMIN_API_KEY is set."""
import hmac

from fastapi import APIRouter, Header, HTTPException

from ..config import settings
from ..db import db
from ..services import audit, payments

router = APIRouter(prefix="/admin", tags=["admin"])


def _check(key: str | None):
    if not settings.admin_api_key:
        raise HTTPException(status_code=404, detail="Not found")
    if not key or not hmac.compare_digest(key, settings.admin_api_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")


@router.get("/audit/verify")
async def verify_audit_chain(x_admin_key: str | None = Header(default=None)):
    """Recompute the audit hash chain; reports the first tampered entry, if any."""
    _check(x_admin_key)
    return await audit.verify_chain()


@router.get("/aml/alerts")
async def aml_alerts(status: str = "open", x_admin_key: str | None = Header(default=None)):
    """Transactions flagged by AML rules, for review by the compliance team."""
    _check(x_admin_key)
    rows = await db.aml_alerts.find({"status": status}).sort("created_at", -1).to_list(200)
    for r in rows:
        r.pop("_id", None)
    return rows


@router.post("/payments/reconcile")
async def reconcile(x_admin_key: str | None = Header(default=None)):
    """Settle payments stuck in pending (run on a schedule, e.g. every minute)."""
    _check(x_admin_key)
    return {"settled": await payments.reconcile_stale()}
