import logging
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException

from ..db import db
from ..ratelimit import limit
from ..services import game
from ..utils import serialize_doc

router = APIRouter()
logger = logging.getLogger(__name__)

DEALS = [
    {
        "id": "deal_1",
        "brand": "Amazon",
        "title": "₹500 Amazon Gift Card",
        "coins_required": 5000,
        "category": "shopping",
        "image": "amazon",
        "discount": "5% bonus value"
    },
    {
        "id": "deal_2",
        "brand": "Swiggy",
        "title": "Flat ₹150 Off",
        "coins_required": 1500,
        "category": "food",
        "image": "swiggy",
        "discount": "No minimum order"
    },
    {
        "id": "deal_3",
        "brand": "Uber",
        "title": "30% Off Next 3 Rides",
        "coins_required": 2000,
        "category": "transport",
        "image": "uber",
        "discount": "Max ₹100 per ride"
    },
    {
        "id": "deal_4",
        "brand": "BookMyShow",
        "title": "Buy 1 Get 1 Movie Ticket",
        "coins_required": 3000,
        "category": "entertainment",
        "image": "bookmyshow",
        "discount": "All cinemas"
    },
    {
        "id": "deal_5",
        "brand": "Myntra",
        "title": "Extra 20% Off Fashion",
        "coins_required": 2500,
        "category": "shopping",
        "image": "myntra",
        "discount": "On orders above ₹1499"
    },
    {
        "id": "deal_6",
        "brand": "Zomato",
        "title": "Free Delivery for 1 Month",
        "coins_required": 4000,
        "category": "food",
        "image": "zomato",
        "discount": "Unlimited orders"
    },
    {
        "id": "deal_7",
        "brand": "Flipkart",
        "title": "₹1000 SuperCoins",
        "coins_required": 8000,
        "category": "shopping",
        "image": "flipkart",
        "discount": "Worth ₹1000"
    },
    {
        "id": "deal_8",
        "brand": "MakeMyTrip",
        "title": "₹2000 Off on Flights",
        "coins_required": 10000,
        "category": "travel",
        "image": "makemytrip",
        "discount": "Domestic flights"
    }
]


@router.get("/rewards/{user_id}")
async def get_rewards(user_id: str):
    """Get user's reward coins and available deals"""
    user = await db.users.find_one({"id": user_id})
    coins = user.get("reward_coins", 0) if user else 0
    
    # Sample deals (CRED store style)
    
    # Coins history
    history = await db.payments.find({"user_id": user_id}).sort("timestamp", -1).to_list(20)
    
    return {
        "total_coins": coins,
        "coins_value": round(coins * 0.25, 2),  # 1 coin = ₹0.25
        "deals": DEALS,
        "coins_history": serialize_doc(history),
        "tier": "Platinum" if coins > 10000 else "Gold" if coins > 5000 else "Silver" if coins > 1000 else "Bronze"
    }

@router.post("/rewards/redeem")
async def redeem_reward(redemption: dict):
    """Redeem coins for a deal"""
    user_id = redemption.get("user_id")
    deal_id = redemption.get("deal_id")
    await limit(f"redeem:{user_id}", 10, 60)
    deal = next((d for d in DEALS if d["id"] == deal_id), None)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    coins_required = deal["coins_required"]  # never trust the client's price
    
    user = await db.users.find_one({"id": user_id})
    current_coins = user.get("reward_coins", 0) if user else 0
    
    if current_coins < coins_required:
        raise HTTPException(status_code=400, detail="Insufficient coins")
    
    # Deduct coins
    await db.users.update_one(
        {"id": user_id},
        {"$inc": {"reward_coins": -coins_required}}
    )
    
    # Generate voucher code
    voucher_code = f"FW{uuid.uuid4().hex[:8].upper()}"
    
    redemption_record = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "deal_id": deal_id,
        "coins_used": coins_required,
        "voucher_code": voucher_code,
        "status": "active",
        "valid_until": datetime.utcnow() + timedelta(days=30),
        "redeemed_at": datetime.utcnow()
    }
    await db.redemptions.insert_one(dict(redemption_record))
    await db.payments.insert_one({
        "id": str(uuid.uuid4()), "user_id": user_id, "type": "redemption", "title": deal["title"],
        "coins_earned": -coins_required, "status": "success", "timestamp": datetime.utcnow(),
    })
    reward = await game.award(user_id, "reward_redeemed")

    return {
        "reward": reward,
        "coins_left": current_coins - coins_required,
        "message": "Reward redeemed successfully!",
        "voucher_code": voucher_code,
        "valid_until": redemption_record["valid_until"].strftime("%Y-%m-%d")
    }
