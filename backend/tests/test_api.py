"""End-to-end API tests against the in-memory database (no MongoDB needed)."""
import os

os.environ["MONGO_URL"] = ""
os.environ["DEMO_MODE"] = "true"
os.environ["OPENAI_API_KEY"] = ""

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.services import game  # noqa: E402
from app.services.debt import calculate_debt_payoff  # noqa: E402
from app.models import DebtStrategy  # noqa: E402


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def sign_in(client, phone):
    sent = client.post("/api/auth/send-otp", json={"phone": phone}).json()
    assert len(sent["demo_otp"]) == 6
    res = client.post("/api/auth/verify-otp", json={"phone": phone, "otp": sent["demo_otp"]})
    assert res.status_code == 200
    body = res.json()
    return body["user"], {"Authorization": f"Bearer {body['token']}"}


@pytest.fixture(scope="module")
def user(client):
    user, headers = sign_in(client, "9876543210")
    client.headers.update(headers)  # every request below acts as this user
    return user


@pytest.fixture(scope="module")
def rival(client, user):
    """A second account, used to prove one user can't touch another's data."""
    rival, headers = sign_in(client, "9123456789")
    return {**rival, "headers": headers}


def test_health(client):
    assert client.get("/api/health").json()["status"] == "healthy"


def test_wrong_otp_rejected(client, user):
    res = client.post("/api/auth/verify-otp", json={"phone": "9876543210", "otp": "000000"})
    assert res.status_code == 400


def test_dashboard_has_realistic_demo_data(client, user):
    dash = client.get(f"/api/dashboard/{user['id']}").json()
    assert dash["debts"]["count"] == 4
    assert dash["savings"]["goals_count"] == 1
    assert dash["recent_transactions"]
    assert "_id" not in dash["recent_transactions"][0]


def test_level_curve():
    assert game.level_for_xp(0) == 1
    assert game.level_for_xp(199) == 1
    assert game.level_for_xp(200) == 2
    assert game.level_for_xp(600) == 3
    assert game.world_for_level(5) == "2-1"


def test_checkin_is_once_per_day(client, user):
    first = client.post("/api/game/checkin", json={"user_id": user["id"]}).json()
    assert first["already_checked_in"] is False
    assert first["streak"] == 1
    assert first["reward"]["xp_earned"] > 0
    assert any(q["id"] == "q_checkin" for q in first["reward"]["quests_completed"])
    again = client.post("/api/game/checkin", json={"user_id": user["id"]}).json()
    assert again["already_checked_in"] is True


def test_upi_payment_awards_coins_and_achievement(client, user):
    before = client.get(f"/api/game/profile/{user['id']}").json()
    res = client.post("/api/upi/send-money", json={
        "user_id": user["id"], "recipient_upi": "rahul@paytm", "amount": 500, "note": "", "source_account": "upi_1",
    }).json()
    assert res["coins_earned"] == 10
    assert res["reward"]["xp_earned"] >= 20
    assert any(a["id"] == "first_coin" for a in res["reward"]["new_achievements"])
    after = client.get(f"/api/game/profile/{user['id']}").json()
    assert after["xp"] > before["xp"]
    assert after["coins"] > before["coins"]


@pytest.mark.parametrize("amount", [0, -5, 500000])
def test_upi_rejects_bad_amounts(client, user, amount):
    res = client.post("/api/upi/send-money", json={
        "user_id": user["id"], "recipient_upi": "rahul@paytm", "amount": amount,
    })
    assert res.status_code == 400


def test_bill_can_only_be_paid_once_per_month(client, user):
    ok = client.post("/api/bills/pay", json={"user_id": user["id"], "bill_id": "bill_mobile"})
    assert ok.status_code == 200
    assert ok.json()["coins_earned"] == 7
    dup = client.post("/api/bills/pay", json={"user_id": user["id"], "bill_id": "bill_mobile"})
    assert dup.status_code == 400
    bills = client.get(f"/api/bills/{user['id']}").json()
    assert next(b for b in bills if b["id"] == "bill_mobile")["status"] == "paid"


def test_redeem_uses_server_price(client, user):
    # Client claims the deal is free; server must still charge 10,000 coins.
    res = client.post("/api/rewards/redeem", json={"user_id": user["id"], "deal_id": "deal_8", "coins_required": 0})
    assert res.status_code == 400
    assert res.json()["detail"] == "Insufficient coins"


def test_debt_boss_battle(client, user):
    created = client.post("/api/debts", json={
        "user_id": user["id"], "name": "Tiny Boss", "type": "other", "principal": 1000,
        "outstanding": 1000, "interest_rate": 10, "emi_amount": 100, "remaining_tenure": 10,
    }).json()
    hit = client.post(f"/api/debts/{created['id']}/pay", json={"amount": 400}).json()
    assert hit["outstanding"] == 600 and not hit["defeated"]
    final = client.post(f"/api/debts/{created['id']}/pay", json={"amount": 9999}).json()
    assert final["paid"] == 600
    assert final["defeated"] is True
    assert any(a["id"] == "boss_slayer" for a in final["reward"]["new_achievements"])


def test_savings_goal_completion(client, user):
    goal = client.post("/api/savings", json={"user_id": user["id"], "name": "Switch", "target_amount": 1000}).json()
    res = client.post("/api/savings/contribute", json={"goal_id": goal["id"], "amount": 1000}).json()
    assert res["completed"] is True
    assert res["reward"]["action"] == "goal_completed"
    assert client.post("/api/savings/contribute", json={"goal_id": goal["id"], "amount": -5}).status_code == 422


def test_profile_and_leaderboard(client, user):
    profile = client.get(f"/api/game/profile/{user['id']}").json()
    assert len(profile["quests"]) == 3
    assert profile["checked_in_today"] is True
    assert 0 <= profile["progress"] <= 100
    board = client.get(f"/api/game/leaderboard/{user['id']}").json()
    assert sum(1 for r in board if r["is_you"]) == 1


def test_avalanche_never_costs_more_interest_than_snowball():
    debts = [
        {"name": "A", "outstanding": 15000, "interest_rate": 12, "emi_amount": 2000},
        {"name": "B", "outstanding": 65000, "interest_rate": 36, "emi_amount": 5000},
        {"name": "C", "outstanding": 48000, "interest_rate": 0, "emi_amount": 8000},
    ]
    snow = calculate_debt_payoff(debts, DebtStrategy.SNOWBALL, 3000)
    ava = calculate_debt_payoff(debts, DebtStrategy.AVALANCHE, 3000)
    assert ava["total_interest"] <= snow["total_interest"]
    assert snow["payoff_order"][0]["name"] == "A"


def test_every_feature_endpoint_responds(client, user):
    uid = user["id"]
    for path in [
        f"/api/transactions/{uid}", f"/api/analytics/summary/{uid}", f"/api/analytics/insights/{uid}",
        f"/api/analytics/expense-reduction/{uid}", f"/api/debts/analysis/{uid}", f"/api/savings/suggestions/{uid}",
        f"/api/credit-score/{uid}", f"/api/rewards/{uid}", "/api/learn/courses", "/api/learn/articles",
        f"/api/learn/progress/{uid}", "/api/community/posts", f"/api/aa/consent-status/{uid}",
        f"/api/security/audit-log/{uid}", f"/api/security/privacy-settings/{uid}", "/api/compliance/rbi-info",
        f"/api/upi/linked-accounts/{uid}", f"/api/upi/recent-payees/{uid}", f"/api/upi/transaction-history/{uid}",
        f"/api/loans/eligibility/{uid}", f"/api/loans/active/{uid}", f"/api/accounts/all/{uid}",
        f"/api/investments/portfolio/{uid}", f"/api/users/{uid}", f"/api/users/{uid}/security",
    ]:
        assert client.get(path).status_code == 200, path


def test_upi_balances_are_stable_per_user(client, user):
    first = client.get(f"/api/upi/linked-accounts/{user['id']}").json()
    second = client.get(f"/api/upi/linked-accounts/{user['id']}").json()
    assert first == second


def test_requests_without_token_are_rejected(client, user):
    for path in [f"/api/dashboard/{user['id']}", f"/api/game/profile/{user['id']}", f"/api/debts/{user['id']}"]:
        assert client.get(path, headers={"Authorization": ""}).status_code == 401
    assert client.get(f"/api/dashboard/{user['id']}", headers={"Authorization": "Bearer forged.token.value"}).status_code == 401


def test_public_catalogue_needs_no_token(client):
    for path in ["/api/learn/courses", "/api/learn/articles", "/api/community/posts", "/api/compliance/rbi-info", "/api/health"]:
        assert client.get(path, headers={"Authorization": ""}).status_code == 200, path


def test_cannot_read_or_act_as_another_user(client, user, rival):
    other = rival["headers"]
    assert client.get(f"/api/dashboard/{user['id']}", headers=other).status_code == 403
    assert client.get(f"/api/transactions/{user['id']}", headers=other).status_code == 403
    res = client.post("/api/upi/send-money", headers=other, json={
        "user_id": user["id"], "recipient_upi": "thief@upi", "amount": 500,
    })
    assert res.status_code == 403
    assert client.request("DELETE", f"/api/users/{user['id']}", headers=other, json={"user_id": user["id"]}).status_code == 403


def test_cannot_touch_another_users_debts_or_goals(client, user, rival):
    other = rival["headers"]
    debt = client.get(f"/api/debts/{user['id']}").json()[0]
    assert client.post(f"/api/debts/{debt['id']}/pay", headers=other, json={"amount": 100}).status_code == 404
    assert client.delete(f"/api/debts/{debt['id']}", headers=other).status_code == 404
    goal = client.get(f"/api/savings/{user['id']}").json()[0]
    assert client.post("/api/savings/contribute", headers=other, json={"goal_id": goal["id"], "amount": 10}).status_code == 404
    assert client.delete(f"/api/savings/{goal['id']}", headers=other).status_code == 404
    # ...and the owner still can
    assert client.post(f"/api/debts/{debt['id']}/pay", json={"amount": 100}).status_code == 200
