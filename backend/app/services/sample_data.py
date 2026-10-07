import random
import uuid
from datetime import datetime, timedelta

from ..db import db
from ..models import TransactionCategory


async def generate_sample_data(user_id: str, days: int = 60, with_portfolio: bool = True):
    """Generate demo transactions (and, for new users, sample debts + a savings goal)."""
    base_date = datetime.utcnow()
    transactions = []

    def add(date, amount, merchant, category, txn_type="debit", recurring=False):
        transactions.append({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "date": date,
            "amount": round(amount, 2),
            "type": txn_type,
            "merchant": merchant,
            "category": category.value,
            "description": f"Payment to {merchant}" if txn_type == "debit" else merchant,
            "is_recurring": recurring,
            "is_subscription": category == TransactionCategory.SUBSCRIPTION,
            "created_at": datetime.utcnow(),
        })

    # Everyday spending: (category, merchants, amount range, chance per day)
    daily = [
        (TransactionCategory.FOOD, ["Swiggy", "Zomato", "Dominos", "Starbucks", "Local Restaurant"], (120, 900), 0.8),
        (TransactionCategory.TRANSPORT, ["Uber", "Ola", "Rapido", "Metro Card", "Petrol Pump"], (60, 600), 0.6),
        (TransactionCategory.SHOPPING, ["Amazon", "Flipkart", "Myntra", "DMart"], (300, 3500), 0.18),
        (TransactionCategory.ENTERTAINMENT, ["BookMyShow", "PVR Cinemas", "Steam"], (200, 900), 0.08),
        (TransactionCategory.HEALTH, ["Apollo Pharmacy", "MedPlus"], (150, 1200), 0.05),
    ]
    # Monthly fixed costs: (day of month, merchant, category, amount)
    monthly = [
        (3, "Netflix", TransactionCategory.SUBSCRIPTION, 649),
        (5, "Spotify", TransactionCategory.SUBSCRIPTION, 119),
        (6, "Gym Membership", TransactionCategory.SUBSCRIPTION, 1500),
        (7, "HDFC Card EMI", TransactionCategory.EMI, 5000),
        (7, "Personal Loan EMI", TransactionCategory.EMI, 8500),
        (10, "iPhone EMI", TransactionCategory.EMI, 8000),
        (12, "Tata Power", TransactionCategory.UTILITIES, 2450),
        (14, "Airtel Xstream", TransactionCategory.UTILITIES, 999),
        (15, "Jio Recharge", TransactionCategory.UTILITIES, 666),
    ]

    for day_offset in range(days):
        date = base_date - timedelta(days=day_offset, hours=random.randint(0, 10))
        for category, names, (lo, hi), chance in daily:
            if random.random() < chance:
                add(date, random.uniform(lo, hi), random.choice(names), category)
        for day, merchant, category, amount in monthly:
            if date.day == day:
                add(date, amount, merchant, category, recurring=True)

    # Salary credit on the 1st of each covered month
    if with_portfolio:
        month_start = base_date.replace(day=1, hour=9, minute=0, second=0, microsecond=0)
        for _ in range(max(1, (days + 29) // 30)):
            add(month_start, 75000, "Employer Salary", TransactionCategory.SALARY, "credit", recurring=True)
            month_start = (month_start - timedelta(days=1)).replace(day=1)

    # Insert transactions
    if transactions:
        await db.transactions.insert_many(transactions)
    
    if not with_portfolio:
        return {"transactions": len(transactions), "debts": 0, "goals": 0}

    # Add sample debts - DESIGNED to show strategy differences
    # Key: Smallest balance should NOT have highest interest for strategies to differ
    sample_debts = [
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "name": "Store Credit Card",
            "type": "credit_card",
            "principal": 20000,
            "outstanding": 15000,   # SMALLEST balance
            "interest_rate": 12,    # LOW interest
            "emi_amount": 2000,
            "remaining_tenure": 8,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "name": "HDFC Credit Card",
            "type": "credit_card",
            "principal": 80000,
            "outstanding": 65000,   # MEDIUM balance
            "interest_rate": 36,    # HIGHEST interest
            "emi_amount": 5000,
            "remaining_tenure": 15,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "name": "Personal Loan",
            "type": "personal_loan",
            "principal": 200000,
            "outstanding": 156000,  # LARGEST balance
            "interest_rate": 14,    # MEDIUM interest
            "emi_amount": 8500,
            "remaining_tenure": 20,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "name": "iPhone EMI",
            "type": "emi",
            "principal": 80000,
            "outstanding": 48000,   # MEDIUM balance
            "interest_rate": 0,     # NO interest (0%)
            "emi_amount": 8000,
            "remaining_tenure": 6,
            "created_at": datetime.utcnow()
        }
    ]
    await db.debts.insert_many(sample_debts)
    
    # Add sample savings goal
    sample_goal = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "name": "Emergency Fund",
        "target_amount": 300000,
        "current_amount": 75000,
        "monthly_contribution": 10000,
        "target_date": datetime.utcnow() + timedelta(days=365),
        "created_at": datetime.utcnow()
    }
    await db.savings_goals.insert_one(sample_goal)
    
    return {"transactions": len(transactions), "debts": len(sample_debts), "goals": 1}
