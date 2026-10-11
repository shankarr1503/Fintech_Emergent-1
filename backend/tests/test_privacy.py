"""Consent, data export, erasure with legal retention, custom categories, security headers."""
import asyncio

import pytest
from fastapi.testclient import TestClient

from app.db import db
from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def run(coro):
    return asyncio.run(coro)


def login(client, phone):
    code = client.post("/api/auth/send-otp", json={"phone": phone}).json()["demo_otp"]
    res = client.post("/api/auth/verify-otp", json={"phone": phone, "otp": code, "accept_terms": "2026-10"}).json()
    return res["user"]["id"], {"Authorization": f"Bearer {res['token']}"}


def test_new_users_must_accept_terms_and_consent_is_recorded(client):
    phone = "9300000001"
    code = client.post("/api/auth/send-otp", json={"phone": phone}).json()["demo_otp"]
    refused = client.post("/api/auth/verify-otp", json={"phone": phone, "otp": code})
    assert refused.status_code == 400 and "Terms" in refused.json()["detail"]
    ok = client.post("/api/auth/verify-otp", json={"phone": phone, "otp": code, "accept_terms": "2026-10"})
    assert ok.status_code == 200  # the code wasn't burned by the refusal
    user = run(db.users.find_one({"phone": phone}))
    assert user["consents"][0]["terms"] == "2026-10"


def test_export_contains_data_but_no_secrets(client):
    uid, h = login(client, "9300000002")
    client.post("/api/auth/pin", json={"pin": "4826"}, headers=h)
    client.post("/api/kyc/submit", json={"user_id": uid, "pan": "ABCPE2222F", "full_name": "Ex Port", "dob": "1990-01-01", "consent": True}, headers=h)
    data = client.get(f"/api/users/{uid}/export", headers=h).json()
    blob = str(data)
    for secret in ("otp_hash", "'pin':", "pan_encrypted", "dob_encrypted", "ABCPE2222F", "salt"):
        assert secret not in blob, secret
    assert data["user"]["pin_set"] is True and data["user"]["kyc"]["masked_pan"] == "XXXXX2222F"
    assert data["transactions"] and any(e["action"] == "data_exported" for e in data["audit_trail"])
    assert "audit_trail" in data and "upi_transactions" in data


def test_erasure_deletes_personal_data_and_retains_what_law_requires(client):
    uid, h = login(client, "9300000003")
    client.post("/api/auth/pin", json={"pin": "4826"}, headers=h)
    client.post("/api/kyc/submit", json={"user_id": uid, "pan": "ABCPE3333F", "full_name": "Er Ase", "dob": "1990-01-01", "consent": True}, headers=h)
    client.post("/api/upi/send-money", json={"user_id": uid, "recipient_upi": "rahul@paytm", "amount": 50}, headers=h)
    res = client.request("DELETE", f"/api/users/{uid}", json={"user_id": uid, "reason": "test"}, headers=h).json()
    assert res["deleted"]["transactions"] > 0 and "upi_transactions" in res["retained"]
    assert run(db.users.find_one({"id": uid})) is None
    assert run(db.transactions.count_documents({"user_id": uid})) == 0
    assert run(db.sessions.count_documents({"user_id": uid})) == 0
    kept = run(db.upi_transactions.find_one({"user_id": uid}))
    assert kept and kept["subject_erased"] is True and kept["retain_until"]
    retained_kyc = run(db.kyc_retained.find_one({"user_id": uid}))
    assert retained_kyc["kyc"]["pan_encrypted"].startswith("v1:")
    assert client.get(f"/api/dashboard/{uid}", headers=h).status_code == 401  # session gone with the account


def test_support_messages_mask_card_numbers(client):
    uid, h = login(client, "9300000004")
    client.post("/api/support", json={"user_id": uid, "subject": "card", "message": "my card 5555 5555 5555 4444 was charged"}, headers=h)
    ticket = run(db.support_tickets.find_one({"user_id": uid}))
    assert "5555 5555" not in ticket["message"] and "••••4444" in ticket["message"]


def test_custom_categories_and_recategorize(client):
    uid, h = login(client, "9300000005")
    cat = client.post("/api/categories", json={"user_id": uid, "name": "Pet care"}, headers=h).json()
    assert cat == {"id": "pet_care", "name": "Pet care"}
    assert client.post("/api/categories", json={"user_id": uid, "name": "pet  care"}, headers=h).status_code == 409
    txns = client.get(f"/api/transactions/{uid}", headers=h).json()
    target = next(t for t in txns if t["merchant"] == "Swiggy") if any(t["merchant"] == "Swiggy" for t in txns) else txns[0]
    one = client.patch(f"/api/transactions/{target['id']}", json={"category": "pet_care"}, headers=h).json()
    assert one["updated"] == 1
    allm = client.patch(f"/api/transactions/{target['id']}", json={"category": "pet_care", "apply_to_merchant": True}, headers=h).json()
    assert allm["updated"] >= 0
    assert client.patch(f"/api/transactions/{target['id']}", json={"category": "made_up"}, headers=h).status_code == 400
    listed = client.get(f"/api/categories/{uid}", headers=h).json()
    assert {"id": "pet_care", "name": "Pet care"} in listed["custom"]


def test_security_headers(client):
    r = client.get("/api/health")
    assert r.headers["strict-transport-security"].startswith("max-age=")
    assert r.headers["x-content-type-options"] == "nosniff"
    assert r.headers["cache-control"] == "no-store"
