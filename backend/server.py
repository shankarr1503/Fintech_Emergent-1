from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
from enum import Enum
import json
import csv
import io
from openai import OpenAI
import random

# Helper to convert MongoDB documents
def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict"""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(d) for d in doc]
    if isinstance(doc, dict):
        result = {}
        for key, value in doc.items():
            if key == '_id':
                result['_id'] = str(value)
            elif isinstance(value, ObjectId):
                result[key] = str(value)
            elif isinstance(value, datetime):
                result[key] = value.isoformat()
            elif isinstance(value, dict):
                result[key] = serialize_doc(value)
            elif isinstance(value, list):
                result[key] = [serialize_doc(v) if isinstance(v, dict) else v for v in value]
            else:
                result[key] = value
        return result
    return doc

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'financewise_db')]

# OpenAI client setup
EMERGENT_LLM_KEY = "sk-emergent-2D4E8D2A51786917eD"
openai_client = OpenAI(
    api_key=EMERGENT_LLM_KEY,
    base_url="https://emergent-api.onrender.com/proxy/openai/v1"
)

# Create the main app
app = FastAPI(title="FinanceWise API", version="1.0.0")

# Create router with /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============== ENUMS ==============
class TransactionType(str, Enum):
    CREDIT = "credit"
    DEBIT = "debit"

class TransactionCategory(str, Enum):
    FOOD = "food"
    TRANSPORT = "transport"
    SHOPPING = "shopping"
    UTILITIES = "utilities"
    ENTERTAINMENT = "entertainment"
    HEALTH = "health"
    EDUCATION = "education"
    SALARY = "salary"
    INVESTMENT = "investment"
    TRANSFER = "transfer"
    EMI = "emi"
    SUBSCRIPTION = "subscription"
    OTHER = "other"

class DebtType(str, Enum):
    CREDIT_CARD = "credit_card"
    PERSONAL_LOAN = "personal_loan"
    EMI = "emi"
    OTHER = "other"

class DebtStrategy(str, Enum):
    SNOWBALL = "snowball"
    AVALANCHE = "avalanche"

# ============== MODELS ==============
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    phone: str
    name: Optional[str] = None
    monthly_income: float = 0
    fixed_expenses: float = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    otp: Optional[str] = None
    otp_expiry: Optional[datetime] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    monthly_income: Optional[float] = None
    fixed_expenses: Optional[float] = None

class UserCreate(BaseModel):
    phone: str
    name: Optional[str] = None
    monthly_income: float = 0
    fixed_expenses: float = 0

class OTPRequest(BaseModel):
    phone: str

class OTPVerify(BaseModel):
    phone: str
    otp: str

class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: datetime
    amount: float
    type: TransactionType
    merchant: str
    category: TransactionCategory
    description: Optional[str] = None
    is_recurring: bool = False
    is_subscription: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TransactionCreate(BaseModel):
    user_id: str
    date: datetime
    amount: float
    type: TransactionType
    merchant: str
    category: Optional[TransactionCategory] = None
    description: Optional[str] = None

class Debt(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    type: DebtType
    principal: float
    outstanding: float
    interest_rate: float
    emi_amount: float
    remaining_tenure: int  # months
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DebtCreate(BaseModel):
    user_id: str
    name: str
    type: DebtType
    principal: float
    outstanding: float
    interest_rate: float
    emi_amount: float
    remaining_tenure: int

class SavingsGoal(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    target_amount: float
    current_amount: float = 0
    monthly_contribution: float = 0
    target_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SavingsGoalCreate(BaseModel):
    user_id: str
    name: str
    target_amount: float
    monthly_contribution: float = 0
    target_date: Optional[datetime] = None

class SavingsContribution(BaseModel):
    goal_id: str
    amount: float

class Insight(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: str
    category: str
    impact_amount: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DeleteAccountRequest(BaseModel):
    user_id: str
    reason: Optional[str] = None

class SupportRequest(BaseModel):
    user_id: str
    subject: str
    message: str

# ============== AI CATEGORIZATION ==============
async def categorize_transaction_ai(merchant: str, description: str = "") -> TransactionCategory:
    """Use OpenAI to categorize a transaction based on merchant name"""
    try:
        prompt = f"""Categorize this transaction into one of these categories:
        food, transport, shopping, utilities, entertainment, health, education, salary, investment, transfer, emi, subscription, other
        
        Merchant: {merchant}
        Description: {description}
        
        Respond with ONLY the category name in lowercase."""
        
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=20,
            temperature=0
        )
        
        category = response.choices[0].message.content.strip().lower()
        if category in [c.value for c in TransactionCategory]:
            return TransactionCategory(category)
        return TransactionCategory.OTHER
    except Exception as e:
        logger.error(f"AI categorization failed: {e}")
        return TransactionCategory.OTHER

async def generate_financial_insights(user_id: str, use_ai: bool = True) -> List[Dict]:
    """Generate financial insights based on spending patterns
    
    Uses AI-powered analysis when available, falls back to rule-based insights
    """
    try:
        # Get user's transactions from last 2 months
        two_months_ago = datetime.utcnow() - timedelta(days=60)
        transactions = await db.transactions.find({
            "user_id": user_id,
            "date": {"$gte": two_months_ago}
        }).to_list(500)
        
        if not transactions:
            return []
        
        # Prepare summary
        category_totals = {}
        total_spending = 0
        total_income = 0
        for t in transactions:
            cat = t.get('category', 'other')
            if t.get('type') == 'debit':
                amount = t.get('amount', 0)
                category_totals[cat] = category_totals.get(cat, 0) + amount
                total_spending += amount
            elif t.get('type') == 'credit':
                total_income += t.get('amount', 0)
        
        # Try AI-powered insights first
        if use_ai:
            try:
                spending_summary = ", ".join([f"{cat}: ₹{int(amt):,}" for cat, amt in sorted(category_totals.items(), key=lambda x: -x[1])[:6]])
                
                prompt = f"""Analyze this Indian user's monthly spending and provide 3 actionable financial insights.

Monthly Income: ₹{int(total_income):,}
Total Spending: ₹{int(total_spending):,}
Category Breakdown: {spending_summary}

Provide exactly 3 insights in this JSON format:
[
  {{"title": "short title", "description": "actionable advice in 1-2 sentences with specific INR amounts", "category": "saving|warning|spending", "impact_amount": number_or_null}}
]

Rules:
- Use ₹ symbol for Indian Rupees
- Be specific with numbers
- Focus on actionable advice
- category should be: "saving" for money-saving tips, "warning" for concerns, "spending" for general spending advice"""

                response = openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=500,
                    temperature=0.7,
                    timeout=10  # 10 second timeout
                )
                
                content = response.choices[0].message.content.strip()
                # Extract JSON from response
                import re
                json_match = re.search(r'\[.*\]', content, re.DOTALL)
                if json_match:
                    ai_insights = json.loads(json_match.group())
                    if ai_insights and len(ai_insights) > 0:
                        logger.info("AI insights generated successfully")
                        return ai_insights[:3]
            except Exception as ai_error:
                logger.warning(f"AI insights failed, falling back to rules: {ai_error}")
        
        # Fallback to rule-based insights
        insights = []
        
        # Food spending insight
        food_spending = category_totals.get('food', 0)
        if food_spending > 5000:
            potential_savings = food_spending * 0.25
            insights.append({
                "title": "Reduce Food Delivery",
                "description": f"You spent ₹{int(food_spending):,} on food. Cooking at home 3 times more per week could save ₹{int(potential_savings):,}/month.",
                "category": "saving",
                "impact_amount": potential_savings
            })
        
        # Subscription insight
        sub_spending = category_totals.get('subscription', 0)
        if sub_spending > 500:
            insights.append({
                "title": "Review Subscriptions",
                "description": f"You're paying ₹{int(sub_spending):,} for subscriptions. Consider using family plans to save up to 40%.",
                "category": "warning",
                "impact_amount": sub_spending * 0.4
            })
        
        # EMI insight
        emi_spending = category_totals.get('emi', 0)
        if emi_spending > 10000:
            insights.append({
                "title": "EMI Management",
                "description": f"EMIs of ₹{int(emi_spending):,}/month take up a significant portion. Consider prepaying loans to reduce interest.",
                "category": "spending",
                "impact_amount": None
            })
        
        # Shopping insight
        shopping_spending = category_totals.get('shopping', 0)
        if shopping_spending > 3000:
            insights.append({
                "title": "Smart Shopping",
                "description": f"Shopping expenses of ₹{int(shopping_spending):,}. Try using cashback cards and wait for sales.",
                "category": "saving",
                "impact_amount": shopping_spending * 0.15
            })
        
        # Transport insight
        transport_spending = category_totals.get('transport', 0)
        if transport_spending > 3000:
            insights.append({
                "title": "Optimize Transport",
                "description": f"Transport costs of ₹{int(transport_spending):,}. Using public transport twice a week could save ₹{int(transport_spending * 0.2):,}/month.",
                "category": "saving",
                "impact_amount": transport_spending * 0.2
            })
        
        # If we have few insights, add a positive one
        if len(insights) < 2:
            savings_rate = ((total_income - total_spending) / total_income * 100) if total_income > 0 else 0
            if savings_rate > 20:
                insights.append({
                    "title": "Excellent Savings!",
                    "description": f"You're saving {int(savings_rate)}% of your income. Great financial discipline!",
                    "category": "spending",
                    "impact_amount": None
                })
            else:
                insights.append({
                    "title": "Track & Improve",
                    "description": "Keep tracking your expenses to identify more savings opportunities.",
                    "category": "spending",
                    "impact_amount": None
                })
        
        return insights[:3]  # Return max 3 insights
    except Exception as e:
        logger.error(f"Insight generation failed: {e}")
        return []

# ============== DEBT CALCULATIONS - FIXED ==============
def calculate_debt_payoff(debts: List[Dict], strategy: DebtStrategy, extra_payment: float = 0) -> Dict:
    """Calculate debt payoff timeline using snowball or avalanche strategy
    
    SNOWBALL: Pay minimum on all, throw extra at SMALLEST ORIGINAL balance first
    AVALANCHE: Pay minimum on all, throw extra at HIGHEST interest rate first
    
    Key fix: Sort once at the beginning based on strategy, then apply freed-up payments 
    to the next debt in the priority order as each debt is paid off.
    """
    if not debts:
        return {"total_months": 0, "total_interest": 0, "payoff_order": [], "monthly_breakdown": []}
    
    # Create working copies with balance tracking
    working_debts = []
    for d in debts:
        working_debts.append({
            'name': d['name'],
            'balance': float(d['outstanding']),
            'interest_rate': float(d['interest_rate']),
            'emi_amount': float(d['emi_amount']),
            'original_balance': float(d['outstanding']),
            'paid_off': False
        })
    
    # CRITICAL: Sort debts ONCE at the beginning based on strategy
    # This determines the PRIORITY ORDER for the entire payoff journey
    if strategy == DebtStrategy.SNOWBALL:
        # Snowball: Sort by ORIGINAL balance (smallest first) for psychological wins
        working_debts.sort(key=lambda x: x['original_balance'])
    else:  # AVALANCHE
        # Avalanche: Sort by interest rate (highest first) to save the most money
        working_debts.sort(key=lambda x: x['interest_rate'], reverse=True)
    
    total_months = 0
    total_interest = 0
    payoff_order = []
    monthly_breakdown = []
    
    # Track freed-up EMIs from paid-off debts (snowball/avalanche effect)
    freed_up_payment = 0
    
    # Continue until all debts are paid
    while any(not d['paid_off'] for d in working_debts):
        total_months += 1
        if total_months > 360:  # 30 years max
            break
        
        month_data = {"month": total_months, "payments": [], "remaining_total": 0}
        
        # Step 1: Apply interest to all active debts
        for debt in working_debts:
            if not debt['paid_off'] and debt['balance'] > 0:
                monthly_interest = (debt['balance'] * debt['interest_rate']) / (12 * 100)
                debt['balance'] += monthly_interest
                total_interest += monthly_interest
        
        # Step 2: Pay minimum EMI on all active debts
        for debt in working_debts:
            if not debt['paid_off'] and debt['balance'] > 0:
                payment = min(debt['emi_amount'], debt['balance'])
                debt['balance'] -= payment
                month_data['payments'].append({"name": debt['name'], "payment": round(payment, 2), "type": "emi"})
        
        # Step 3: Apply extra payment + freed-up payments to the FIRST active debt in priority order
        total_extra = extra_payment + freed_up_payment
        
        if total_extra > 0:
            for debt in working_debts:
                if not debt['paid_off'] and debt['balance'] > 0:
                    # Apply all extra to the highest priority (first in sorted list)
                    extra_to_apply = min(total_extra, debt['balance'])
                    debt['balance'] -= extra_to_apply
                    total_extra -= extra_to_apply
                    if extra_to_apply > 0:
                        month_data['payments'].append({"name": debt['name'], "payment": round(extra_to_apply, 2), "type": "extra"})
                    break  # Only apply to the first (highest priority) debt
        
        # Step 4: Check for any debts that just got paid off
        for debt in working_debts:
            if not debt['paid_off'] and debt['balance'] <= 0.01:
                payoff_order.append({
                    "name": debt['name'],
                    "months_to_payoff": total_months,
                    "interest_rate": debt['interest_rate'],
                    "original_balance": debt['original_balance']
                })
                debt['paid_off'] = True
                # Add this debt's EMI to the freed-up payment pool (snowball/avalanche effect)
                freed_up_payment += debt['emi_amount']
                debt['balance'] = 0
        
        month_data['remaining_total'] = round(sum(max(0, d['balance']) for d in working_debts if not d['paid_off']), 2)
        monthly_breakdown.append(month_data)
    
    return {
        "total_months": total_months,
        "total_interest": round(total_interest, 2),
        "payoff_order": payoff_order,
        "debt_free_date": (datetime.utcnow() + timedelta(days=total_months * 30)).strftime("%B %Y"),
        "strategy": strategy.value,
        "strategy_description": "Smallest balance first (quick wins)" if strategy == DebtStrategy.SNOWBALL else "Highest interest first (saves most money)"
    }

# ============== SAMPLE DATA GENERATOR ==============
async def generate_sample_data(user_id: str):
    """Generate sample transactions and debts for demo"""
    merchants = {
        TransactionCategory.FOOD: ["Swiggy", "Zomato", "Dominos", "McDonald's", "Starbucks", "Local Restaurant"],
        TransactionCategory.TRANSPORT: ["Uber", "Ola", "Petrol Pump", "Metro Card", "Rapido"],
        TransactionCategory.SHOPPING: ["Amazon", "Flipkart", "Myntra", "Big Bazaar", "DMart"],
        TransactionCategory.UTILITIES: ["Electricity Bill", "Water Bill", "Gas Bill", "Internet Bill"],
        TransactionCategory.ENTERTAINMENT: ["Netflix", "Amazon Prime", "BookMyShow", "Spotify"],
        TransactionCategory.SUBSCRIPTION: ["Netflix", "Spotify", "YouTube Premium", "Gym Membership"],
        TransactionCategory.EMI: ["HDFC EMI", "Bajaj EMI", "Car Loan EMI"]
    }
    
    transactions = []
    base_date = datetime.utcnow()
    
    # Generate 60 days of transactions
    for day_offset in range(60):
        date = base_date - timedelta(days=day_offset)
        
        # 2-5 transactions per day
        num_transactions = random.randint(2, 5)
        for _ in range(num_transactions):
            category = random.choice(list(merchants.keys()))
            merchant = random.choice(merchants[category])
            
            # Amount ranges by category
            amount_ranges = {
                TransactionCategory.FOOD: (100, 1500),
                TransactionCategory.TRANSPORT: (50, 800),
                TransactionCategory.SHOPPING: (500, 5000),
                TransactionCategory.UTILITIES: (500, 3000),
                TransactionCategory.ENTERTAINMENT: (200, 1000),
                TransactionCategory.SUBSCRIPTION: (199, 999),
                TransactionCategory.EMI: (3000, 15000)
            }
            
            min_amt, max_amt = amount_ranges.get(category, (100, 1000))
            amount = round(random.uniform(min_amt, max_amt), 2)
            
            transactions.append({
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "date": date,
                "amount": amount,
                "type": "debit",
                "merchant": merchant,
                "category": category.value,
                "description": f"Payment to {merchant}",
                "is_recurring": category in [TransactionCategory.EMI, TransactionCategory.SUBSCRIPTION],
                "is_subscription": category == TransactionCategory.SUBSCRIPTION,
                "created_at": datetime.utcnow()
            })
    
    # Add salary credits (2 per month)
    for month_offset in range(2):
        salary_date = base_date.replace(day=1) - timedelta(days=month_offset * 30)
        transactions.append({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "date": salary_date,
            "amount": 75000,
            "type": "credit",
            "merchant": "Employer",
            "category": "salary",
            "description": "Monthly Salary",
            "is_recurring": True,
            "is_subscription": False,
            "created_at": datetime.utcnow()
        })
    
    # Insert transactions
    if transactions:
        await db.transactions.insert_many(transactions)
    
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

# ============== API ROUTES ==============

# Health Check
@api_router.get("/")
async def root():
    return {"message": "FinanceWise API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

# ============== AUTH ROUTES ==============
@api_router.post("/auth/send-otp")
async def send_otp(request: OTPRequest):
    """Send OTP to phone (mocked for demo)"""
    # Generate 6-digit OTP
    otp = "".join([str(random.randint(0, 9)) for _ in range(6)])
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
    
    # In production, send SMS here
    logger.info(f"OTP for {request.phone}: {otp}")
    
    return {"message": "OTP sent successfully", "demo_otp": otp}  # Remove demo_otp in production

@api_router.post("/auth/verify-otp")
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
            "fixed_expenses": user.get('fixed_expenses', 0)
        }
    }

@api_router.get("/users/{user_id}")
async def get_user(user_id: str):
    """Get user profile"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return serialize_doc(user)

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, user_data: UserUpdate):
    """Update user profile"""
    update_data = {k: v for k, v in user_data.dict().items() if v is not None}
    
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "message": "Profile updated successfully",
        "user": serialize_doc(user)
    }

@api_router.delete("/users/{user_id}")
async def delete_user_account(user_id: str, request: DeleteAccountRequest):
    """Delete user account and all associated data"""
    # Delete all user data
    await db.transactions.delete_many({"user_id": user_id})
    await db.debts.delete_many({"user_id": user_id})
    await db.savings_goals.delete_many({"user_id": user_id})
    await db.insights.delete_many({"user_id": user_id})
    await db.users.delete_one({"id": user_id})
    
    logger.info(f"User {user_id} account deleted. Reason: {request.reason}")
    
    return {"message": "Account deleted successfully"}

@api_router.post("/support")
async def submit_support_request(request: SupportRequest):
    """Submit a support request"""
    support_ticket = {
        "id": str(uuid.uuid4()),
        "user_id": request.user_id,
        "subject": request.subject,
        "message": request.message,
        "status": "open",
        "created_at": datetime.utcnow()
    }
    await db.support_tickets.insert_one(support_ticket)
    
    return {"message": "Support request submitted", "ticket_id": support_ticket['id']}

class LanguageUpdate(BaseModel):
    user_id: str
    language: str  # en, hi, ta, te, etc.

class SecuritySettings(BaseModel):
    user_id: str
    biometric_enabled: bool = False
    transaction_alerts: bool = True
    login_notifications: bool = True

@api_router.post("/users/{user_id}/language")
async def update_language(user_id: str, data: LanguageUpdate):
    """Update user's preferred language"""
    await db.users.update_one({"id": user_id}, {"$set": {"language": data.language}})
    return {"message": "Language updated successfully", "language": data.language}

@api_router.get("/users/{user_id}/security")
async def get_security_settings(user_id: str):
    """Get user's security settings"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "biometric_enabled": user.get('biometric_enabled', False),
        "transaction_alerts": user.get('transaction_alerts', True),
        "login_notifications": user.get('login_notifications', True)
    }

@api_router.post("/users/{user_id}/security")
async def update_security_settings(user_id: str, settings: SecuritySettings):
    """Update user's security settings"""
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "biometric_enabled": settings.biometric_enabled,
            "transaction_alerts": settings.transaction_alerts,
            "login_notifications": settings.login_notifications
        }}
    )
    return {"message": "Security settings updated"}

@api_router.get("/users/{user_id}/linked-accounts")
async def get_linked_accounts(user_id: str):
    """Get user's linked bank accounts (mock)"""
    # In production, this would fetch from Account Aggregator
    accounts = await db.linked_accounts.find({"user_id": user_id}).to_list(10)
    if not accounts:
        # Return demo accounts
        return [
            {
                "id": "acc_001",
                "bank_name": "HDFC Bank",
                "account_type": "Savings",
                "last_four": "4521",
                "linked_date": datetime.utcnow().isoformat(),
                "status": "active"
            }
        ]
    return serialize_doc(accounts)

@api_router.get("/users/{user_id}/export")
async def export_user_data(user_id: str):
    """Export all user data"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    transactions = await db.transactions.find({"user_id": user_id}).to_list(10000)
    debts = await db.debts.find({"user_id": user_id}).to_list(100)
    savings = await db.savings_goals.find({"user_id": user_id}).to_list(100)
    
    return {
        "export_date": datetime.utcnow().isoformat(),
        "user": serialize_doc(user),
        "transactions": serialize_doc(transactions),
        "debts": serialize_doc(debts),
        "savings_goals": serialize_doc(savings),
        "total_transactions": len(transactions),
        "total_debts": len(debts),
        "total_savings_goals": len(savings)
    }

# ============== TRANSACTION ROUTES ==============
@api_router.get("/transactions/{user_id}")
async def get_transactions(user_id: str, limit: int = 100, category: str = None):
    """Get user transactions"""
    query = {"user_id": user_id}
    if category:
        query["category"] = category
    
    transactions = await db.transactions.find(query).sort("date", -1).to_list(limit)
    return serialize_doc(transactions)

@api_router.post("/transactions")
async def create_transaction(transaction: TransactionCreate):
    """Create a new transaction"""
    # Auto-categorize if not provided
    category = transaction.category
    if not category:
        category = await categorize_transaction_ai(transaction.merchant, transaction.description or "")
    
    trans_dict = transaction.dict()
    trans_dict['category'] = category.value if hasattr(category, 'value') else category
    trans_obj = Transaction(**trans_dict)
    
    await db.transactions.insert_one(trans_obj.dict())
    return trans_obj

@api_router.post("/transactions/upload-csv/{user_id}")
async def upload_csv(user_id: str, file: UploadFile = File(...)):
    """Upload CSV bank statement"""
    try:
        content = await file.read()
        decoded = content.decode('utf-8')
        reader = csv.DictReader(io.StringIO(decoded))
        
        transactions = []
        for row in reader:
            # Expected columns: date, amount, type, merchant/description
            date_str = row.get('date') or row.get('Date') or row.get('Transaction Date')
            amount = float(row.get('amount') or row.get('Amount') or row.get('Debit') or row.get('Credit') or 0)
            merchant = row.get('merchant') or row.get('Merchant') or row.get('Description') or row.get('Narration') or 'Unknown'
            trans_type = row.get('type') or row.get('Type') or ('credit' if float(row.get('Credit', 0) or 0) > 0 else 'debit')
            
            # Parse date
            try:
                date = datetime.strptime(date_str, '%Y-%m-%d')
            except (ValueError, TypeError):
                try:
                    date = datetime.strptime(date_str, '%d/%m/%Y')
                except (ValueError, TypeError):
                    date = datetime.utcnow()
            
            category = await categorize_transaction_ai(merchant)
            
            transactions.append({
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "date": date,
                "amount": abs(amount),
                "type": trans_type.lower() if trans_type else "debit",
                "merchant": merchant,
                "category": category.value,
                "description": merchant,
                "is_recurring": False,
                "is_subscription": False,
                "created_at": datetime.utcnow()
            })
        
        if transactions:
            await db.transactions.insert_many(transactions)
        
        return {"message": f"Imported {len(transactions)} transactions", "count": len(transactions)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")

@api_router.post("/transactions/mock-sync/{user_id}")
async def mock_bank_sync(user_id: str):
    """Mock Account Aggregator sync - generates realistic transactions"""
    result = await generate_sample_data(user_id)
    return {"message": "Bank sync completed", "synced": result}

# ============== ANALYTICS ROUTES ==============
@api_router.get("/analytics/summary/{user_id}")
async def get_analytics_summary(user_id: str):
    """Get spending summary and analytics"""
    now = datetime.utcnow()
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_start = (start_of_month - timedelta(days=1)).replace(day=1)
    
    # This month's transactions
    this_month_txns = await db.transactions.find({
        "user_id": user_id,
        "date": {"$gte": start_of_month},
        "type": "debit"
    }).to_list(1000)
    
    # Last month's transactions
    last_month_txns = await db.transactions.find({
        "user_id": user_id,
        "date": {"$gte": last_month_start, "$lt": start_of_month},
        "type": "debit"
    }).to_list(1000)
    
    # Calculate totals
    this_month_total = sum(t['amount'] for t in this_month_txns)
    last_month_total = sum(t['amount'] for t in last_month_txns)
    
    # Category breakdown
    category_totals = {}
    for t in this_month_txns:
        cat = t.get('category', 'other')
        category_totals[cat] = category_totals.get(cat, 0) + t['amount']
    
    # Get income
    income_txns = await db.transactions.find({
        "user_id": user_id,
        "date": {"$gte": start_of_month},
        "type": "credit"
    }).to_list(100)
    total_income = sum(t['amount'] for t in income_txns)
    
    # Calculate change percentage
    change_pct = 0
    if last_month_total > 0:
        change_pct = round(((this_month_total - last_month_total) / last_month_total) * 100, 1)
    
    return {
        "this_month_spending": round(this_month_total, 2),
        "last_month_spending": round(last_month_total, 2),
        "change_percentage": change_pct,
        "total_income": round(total_income, 2),
        "remaining_balance": round(total_income - this_month_total, 2),
        "category_breakdown": category_totals,
        "transaction_count": len(this_month_txns)
    }

@api_router.get("/analytics/insights/{user_id}")
async def get_insights(user_id: str):
    """Get AI-generated financial insights"""
    insights = await generate_financial_insights(user_id)
    
    # Store insights
    for insight in insights:
        insight_obj = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            **insight,
            "created_at": datetime.utcnow()
        }
        await db.insights.update_one(
            {"user_id": user_id, "title": insight['title']},
            {"$set": insight_obj},
            upsert=True
        )
    
    return insights

@api_router.get("/analytics/expense-reduction/{user_id}")
async def get_expense_reduction_tips(user_id: str):
    """Get personalized expense reduction suggestions"""
    # Get category spending
    now = datetime.utcnow()
    start_of_month = now.replace(day=1)
    
    txns = await db.transactions.find({
        "user_id": user_id,
        "date": {"$gte": start_of_month},
        "type": "debit"
    }).to_list(1000)
    
    category_totals = {}
    subscription_totals = 0
    
    for t in txns:
        cat = t.get('category', 'other')
        category_totals[cat] = category_totals.get(cat, 0) + t['amount']
        if t.get('is_subscription'):
            subscription_totals += t['amount']
    
    suggestions = []
    
    # Food delivery reduction
    if category_totals.get('food', 0) > 5000:
        food_spending = category_totals['food']
        potential_savings = food_spending * 0.3
        suggestions.append({
            "category": "food",
            "title": "Reduce Food Delivery",
            "description": f"Cooking at home 3 more times per week could save you ₹{int(potential_savings):,}/month",
            "monthly_savings": potential_savings,
            "yearly_savings": potential_savings * 12
        })
    
    # Entertainment/subscription
    if subscription_totals > 1000:
        suggestions.append({
            "category": "subscription",
            "title": "Review Subscriptions",
            "description": f"You're spending ₹{int(subscription_totals):,} on subscriptions. Consider sharing family plans.",
            "monthly_savings": subscription_totals * 0.4,
            "yearly_savings": subscription_totals * 0.4 * 12
        })
    
    # Transport
    if category_totals.get('transport', 0) > 3000:
        transport = category_totals['transport']
        suggestions.append({
            "category": "transport",
            "title": "Optimize Commute",
            "description": f"Using public transport twice a week could save ₹{int(transport * 0.2):,}/month",
            "monthly_savings": transport * 0.2,
            "yearly_savings": transport * 0.2 * 12
        })
    
    return suggestions

# ============== DEBT ROUTES ==============
@api_router.get("/debts/{user_id}")
async def get_debts(user_id: str):
    """Get all user debts"""
    debts = await db.debts.find({"user_id": user_id}).to_list(100)
    return serialize_doc(debts)

@api_router.post("/debts")
async def create_debt(debt: DebtCreate):
    """Add a new debt"""
    debt_obj = Debt(**debt.dict())
    await db.debts.insert_one(debt_obj.dict())
    return debt_obj

@api_router.delete("/debts/{debt_id}")
async def delete_debt(debt_id: str):
    """Delete a debt"""
    result = await db.debts.delete_one({"id": debt_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Debt not found")
    return {"message": "Debt deleted"}

@api_router.get("/debts/analysis/{user_id}")
async def analyze_debts(user_id: str, extra_payment: float = 0):
    """Analyze debts with payoff strategies"""
    debts = await db.debts.find({"user_id": user_id}).to_list(100)
    
    if not debts:
        return {
            "total_debt": 0,
            "total_emi": 0,
            "snowball_analysis": None,
            "avalanche_analysis": None
        }
    
    total_debt = sum(d['outstanding'] for d in debts)
    total_emi = sum(d['emi_amount'] for d in debts)
    avg_interest = sum(d['interest_rate'] * d['outstanding'] for d in debts) / total_debt if total_debt > 0 else 0
    
    snowball = calculate_debt_payoff(debts, DebtStrategy.SNOWBALL, extra_payment)
    avalanche = calculate_debt_payoff(debts, DebtStrategy.AVALANCHE, extra_payment)
    
    # Log for debugging
    logger.info(f"Debt Analysis - Snowball: {snowball['total_months']} months, {snowball['total_interest']} interest")
    logger.info(f"Debt Analysis - Avalanche: {avalanche['total_months']} months, {avalanche['total_interest']} interest")
    
    return {
        "total_debt": round(total_debt, 2),
        "total_emi": round(total_emi, 2),
        "average_interest_rate": round(avg_interest, 2),
        "snowball_analysis": snowball,
        "avalanche_analysis": avalanche,
        "interest_saved_with_avalanche": round(snowball['total_interest'] - avalanche['total_interest'], 2)
    }

# ============== SAVINGS ROUTES ==============
@api_router.get("/savings/{user_id}")
async def get_savings_goals(user_id: str):
    """Get all savings goals"""
    goals = await db.savings_goals.find({"user_id": user_id}).to_list(100)
    return serialize_doc(goals)

@api_router.post("/savings")
async def create_savings_goal(goal: SavingsGoalCreate):
    """Create a new savings goal"""
    goal_obj = SavingsGoal(**goal.dict())
    await db.savings_goals.insert_one(goal_obj.dict())
    return goal_obj

@api_router.post("/savings/contribute")
async def contribute_to_goal(contribution: SavingsContribution):
    """Add contribution to a savings goal"""
    goal = await db.savings_goals.find_one({"id": contribution.goal_id})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    new_amount = goal['current_amount'] + contribution.amount
    await db.savings_goals.update_one(
        {"id": contribution.goal_id},
        {"$set": {"current_amount": new_amount}}
    )
    
    return {"message": "Contribution added", "new_total": new_amount}

@api_router.delete("/savings/{goal_id}")
async def delete_savings_goal(goal_id: str):
    """Delete a savings goal"""
    result = await db.savings_goals.delete_one({"id": goal_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    return {"message": "Goal deleted"}

@api_router.get("/savings/suggestions/{user_id}")
async def get_savings_suggestions(user_id: str):
    """Get AI-powered savings suggestions"""
    # Get user's spending pattern
    analytics = await get_analytics_summary(user_id)
    remaining = analytics['remaining_balance']
    spending = analytics['this_month_spending']
    
    suggestions = []
    
    # Safe savings amount (50-30-20 rule)
    safe_savings = remaining * 0.2 if remaining > 0 else 0
    suggestions.append({
        "type": "safe",
        "amount": round(safe_savings, 2),
        "description": "20% of your remaining balance - conservative and sustainable"
    })
    
    # Moderate savings
    moderate = remaining * 0.3 if remaining > 0 else 0
    suggestions.append({
        "type": "moderate",
        "amount": round(moderate, 2),
        "description": "30% of remaining - good progress toward your goals"
    })
    
    # Aggressive savings (with expense cuts)
    expense_reduction = spending * 0.1
    aggressive = (remaining + expense_reduction) * 0.35 if remaining > 0 else 0
    suggestions.append({
        "type": "aggressive",
        "amount": round(aggressive, 2),
        "description": "35% with 10% expense reduction - fastest goal achievement"
    })
    
    return suggestions

# ============== DASHBOARD ==============
@api_router.get("/dashboard/{user_id}")
async def get_dashboard(user_id: str):
    """Get complete dashboard data"""
    # Get analytics
    analytics = await get_analytics_summary(user_id)
    
    # Get debts summary
    debts = await db.debts.find({"user_id": user_id}).to_list(100)
    total_debt = sum(d['outstanding'] for d in debts)
    total_emi = sum(d['emi_amount'] for d in debts)
    
    # Get savings summary
    goals = await db.savings_goals.find({"user_id": user_id}).to_list(100)
    total_saved = sum(g['current_amount'] for g in goals)
    total_target = sum(g['target_amount'] for g in goals)
    
    # Get recent transactions
    recent_txns_raw = await db.transactions.find({"user_id": user_id}).sort("date", -1).to_list(5)
    recent_txns = serialize_doc(recent_txns_raw)
    
    # Generate one recommended action
    action = None
    if total_debt > 0 and analytics['remaining_balance'] > total_emi:
        action = {
            "type": "debt",
            "title": "Pay Extra on Debt",
            "description": f"You have ₹{int(analytics['remaining_balance'] - total_emi):,} extra. Consider paying ₹2,000 more on your highest interest debt.",
            "action_id": "debt_payoff"
        }
    elif analytics['remaining_balance'] > 5000:
        action = {
            "type": "savings",
            "title": "Boost Savings",
            "description": f"Great month! Move ₹{int(analytics['remaining_balance'] * 0.2):,} to your savings goal.",
            "action_id": "savings_boost"
        }
    else:
        action = {
            "type": "expense",
            "title": "Review Expenses",
            "description": "Check your food delivery expenses - they might be higher than usual.",
            "action_id": "expense_review"
        }
    
    return {
        "spending": {
            "this_month": analytics['this_month_spending'],
            "last_month": analytics['last_month_spending'],
            "change_percentage": analytics['change_percentage'],
            "remaining_balance": analytics['remaining_balance']
        },
        "income": analytics['total_income'],
        "debts": {
            "total": total_debt,
            "monthly_emi": total_emi,
            "count": len(debts)
        },
        "savings": {
            "total_saved": total_saved,
            "total_target": total_target,
            "progress": round((total_saved / total_target * 100) if total_target > 0 else 0, 1),
            "goals_count": len(goals)
        },
        "category_breakdown": analytics['category_breakdown'],
        "recent_transactions": recent_txns,
        "recommended_action": action
    }

# ============== CRED-LIKE FEATURES ==============

# Credit Score Management
@api_router.get("/credit-score/{user_id}")
async def get_credit_score(user_id: str):
    """Get user's credit score (simulated CIBIL/Experian)"""
    score_data = await db.credit_scores.find_one({"user_id": user_id})
    
    if not score_data:
        # Generate initial simulated credit score
        base_score = random.randint(650, 800)
        score_data = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "score": base_score,
            "rating": "Excellent" if base_score >= 750 else "Good" if base_score >= 700 else "Fair" if base_score >= 650 else "Poor",
            "factors": {
                "payment_history": random.randint(70, 100),
                "credit_utilization": random.randint(20, 50),
                "credit_age": random.randint(2, 10),
                "credit_mix": random.randint(60, 90),
                "recent_inquiries": random.randint(0, 3)
            },
            "credit_cards": [
                {
                    "bank": "HDFC Bank",
                    "card_type": "Regalia",
                    "limit": 200000,
                    "used": random.randint(20000, 80000),
                    "due_date": (datetime.utcnow() + timedelta(days=random.randint(5, 25))).strftime("%Y-%m-%d"),
                    "min_due": random.randint(2000, 5000),
                    "total_due": random.randint(10000, 50000),
                    "reward_points": random.randint(1000, 15000)
                },
                {
                    "bank": "ICICI Bank", 
                    "card_type": "Amazon Pay",
                    "limit": 150000,
                    "used": random.randint(15000, 60000),
                    "due_date": (datetime.utcnow() + timedelta(days=random.randint(5, 25))).strftime("%Y-%m-%d"),
                    "min_due": random.randint(1500, 4000),
                    "total_due": random.randint(8000, 40000),
                    "reward_points": random.randint(500, 8000)
                }
            ],
            "history": [
                {"month": "Nov 2024", "score": base_score - random.randint(5, 15)},
                {"month": "Oct 2024", "score": base_score - random.randint(10, 25)},
                {"month": "Sep 2024", "score": base_score - random.randint(15, 35)},
                {"month": "Aug 2024", "score": base_score - random.randint(20, 40)},
                {"month": "Jul 2024", "score": base_score - random.randint(25, 50)},
            ],
            "last_updated": datetime.utcnow(),
            "next_update": datetime.utcnow() + timedelta(days=30)
        }
        await db.credit_scores.insert_one(score_data)
    
    return serialize_doc(score_data)

@api_router.post("/credit-cards/pay-bill")
async def pay_credit_card_bill(payment: dict):
    """Pay credit card bill and earn rewards"""
    user_id = payment.get("user_id")
    card_bank = payment.get("card_bank")
    amount = payment.get("amount", 0)
    
    # Calculate rewards (1 coin per ₹100 spent)
    coins_earned = int(amount / 100)
    
    # Update user's reward coins
    await db.users.update_one(
        {"id": user_id},
        {"$inc": {"reward_coins": coins_earned}}
    )
    
    # Record payment
    payment_record = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": "credit_card_bill",
        "card_bank": card_bank,
        "amount": amount,
        "coins_earned": coins_earned,
        "status": "success",
        "timestamp": datetime.utcnow()
    }
    await db.payments.insert_one(payment_record)
    
    return {
        "message": "Bill paid successfully!",
        "amount_paid": amount,
        "coins_earned": coins_earned,
        "transaction_id": payment_record["id"]
    }

# Rewards & Coins System
@api_router.get("/rewards/{user_id}")
async def get_rewards(user_id: str):
    """Get user's reward coins and available deals"""
    user = await db.users.find_one({"id": user_id})
    coins = user.get("reward_coins", 0) if user else 0
    
    # Sample deals (CRED store style)
    deals = [
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
    
    # Coins history
    history = await db.payments.find({"user_id": user_id}).sort("timestamp", -1).to_list(20)
    
    return {
        "total_coins": coins,
        "coins_value": round(coins * 0.25, 2),  # 1 coin = ₹0.25
        "deals": deals,
        "coins_history": serialize_doc(history),
        "tier": "Platinum" if coins > 10000 else "Gold" if coins > 5000 else "Silver" if coins > 1000 else "Bronze"
    }

@api_router.post("/rewards/redeem")
async def redeem_reward(redemption: dict):
    """Redeem coins for a deal"""
    user_id = redemption.get("user_id")
    deal_id = redemption.get("deal_id")
    coins_required = redemption.get("coins_required", 0)
    
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
    await db.redemptions.insert_one(redemption_record)
    
    return {
        "message": "Reward redeemed successfully!",
        "voucher_code": voucher_code,
        "valid_until": redemption_record["valid_until"].strftime("%Y-%m-%d")
    }

# Bill Payments (Rent, Utilities, etc.)
@api_router.get("/bills/{user_id}")
async def get_bills(user_id: str):
    """Get all pending bills"""
    bills = [
        {
            "id": "bill_rent",
            "type": "rent",
            "title": "Monthly Rent",
            "biller": "Landlord",
            "amount": 25000,
            "due_date": (datetime.utcnow() + timedelta(days=5)).strftime("%Y-%m-%d"),
            "status": "pending",
            "autopay": False,
            "coins_earn": 250
        },
        {
            "id": "bill_electricity",
            "type": "utility",
            "title": "Electricity Bill",
            "biller": "Tata Power",
            "amount": 2450,
            "due_date": (datetime.utcnow() + timedelta(days=8)).strftime("%Y-%m-%d"),
            "status": "pending",
            "autopay": True,
            "coins_earn": 24
        },
        {
            "id": "bill_broadband",
            "type": "utility",
            "title": "Broadband",
            "biller": "Airtel Xstream",
            "amount": 999,
            "due_date": (datetime.utcnow() + timedelta(days=12)).strftime("%Y-%m-%d"),
            "status": "pending",
            "autopay": True,
            "coins_earn": 10
        },
        {
            "id": "bill_mobile",
            "type": "recharge",
            "title": "Mobile Recharge",
            "biller": "Jio",
            "amount": 666,
            "due_date": (datetime.utcnow() + timedelta(days=3)).strftime("%Y-%m-%d"),
            "status": "pending",
            "autopay": False,
            "coins_earn": 7
        },
        {
            "id": "bill_insurance",
            "type": "insurance",
            "title": "Health Insurance",
            "biller": "HDFC Ergo",
            "amount": 1500,
            "due_date": (datetime.utcnow() + timedelta(days=20)).strftime("%Y-%m-%d"),
            "status": "pending",
            "autopay": False,
            "coins_earn": 15
        }
    ]
    
    return bills

@api_router.post("/bills/pay")
async def pay_bill(payment: dict):
    """Pay a bill and earn rewards"""
    user_id = payment.get("user_id")
    bill_id = payment.get("bill_id")
    amount = payment.get("amount", 0)
    
    coins_earned = int(amount / 100)
    
    await db.users.update_one(
        {"id": user_id},
        {"$inc": {"reward_coins": coins_earned}}
    )
    
    return {
        "message": "Bill paid successfully!",
        "amount_paid": amount,
        "coins_earned": coins_earned,
        "transaction_id": str(uuid.uuid4())
    }

# ============== 1% CLUB FEATURES ==============

# Financial Literacy Hub
@api_router.get("/learn/courses")
async def get_courses():
    """Get all financial literacy courses"""
    courses = [
        {
            "id": "course_1",
            "title": "Personal Finance 101",
            "description": "Master the basics of managing your money",
            "modules": 8,
            "duration": "2 hours",
            "level": "Beginner",
            "rating": 4.8,
            "enrolled": 15420,
            "instructor": "Ankur Warikoo",
            "topics": ["Budgeting", "Saving", "Emergency Fund", "Insurance Basics"],
            "badge": "Money Master"
        },
        {
            "id": "course_2", 
            "title": "Stock Market Fundamentals",
            "description": "Learn how to invest in stocks wisely",
            "modules": 12,
            "duration": "4 hours",
            "level": "Intermediate",
            "rating": 4.7,
            "enrolled": 12350,
            "instructor": "Pranjal Kamra",
            "topics": ["Stock Analysis", "Portfolio Building", "Risk Management", "Long-term Investing"],
            "badge": "Stock Investor"
        },
        {
            "id": "course_3",
            "title": "Mutual Funds Masterclass",
            "description": "Everything about SIP and mutual fund investing",
            "modules": 10,
            "duration": "3 hours",
            "level": "Beginner",
            "rating": 4.9,
            "enrolled": 18900,
            "instructor": "Shashank Udupa",
            "topics": ["SIP Strategy", "Fund Selection", "Tax Benefits", "Goal-based Investing"],
            "badge": "MF Expert"
        },
        {
            "id": "course_4",
            "title": "Tax Planning & Savings",
            "description": "Legally minimize your tax burden",
            "modules": 6,
            "duration": "1.5 hours",
            "level": "Intermediate",
            "rating": 4.6,
            "enrolled": 9800,
            "instructor": "CA Rachana Ranade",
            "topics": ["Section 80C", "HRA Claims", "Capital Gains", "Tax-saving Investments"],
            "badge": "Tax Saver"
        },
        {
            "id": "course_5",
            "title": "Debt-Free Living",
            "description": "Strategies to eliminate debt and stay debt-free",
            "modules": 5,
            "duration": "1 hour",
            "level": "Beginner",
            "rating": 4.8,
            "enrolled": 22100,
            "instructor": "Akshat Shrivastava",
            "topics": ["Debt Snowball", "Debt Avalanche", "Credit Score", "Avoiding Debt Traps"],
            "badge": "Debt Crusher"
        },
        {
            "id": "course_6",
            "title": "Real Estate Investment",
            "description": "Smart property investment strategies",
            "modules": 8,
            "duration": "2.5 hours",
            "level": "Advanced",
            "rating": 4.5,
            "enrolled": 6540,
            "instructor": "Asset Yogi",
            "topics": ["Property Valuation", "Home Loans", "REITs", "Rental Income"],
            "badge": "Property Pro"
        }
    ]
    return courses

@api_router.get("/learn/articles")
async def get_articles():
    """Get financial literacy articles"""
    articles = [
        {
            "id": "art_1",
            "title": "50-30-20 Budget Rule Explained",
            "summary": "The simplest budgeting framework that actually works",
            "category": "Budgeting",
            "read_time": "5 min",
            "author": "FinanceWise Team",
            "published": "2024-12-20",
            "likes": 1234,
            "bookmarks": 456
        },
        {
            "id": "art_2",
            "title": "Why Your Credit Score Matters More Than You Think",
            "summary": "How a good credit score can save you lakhs",
            "category": "Credit",
            "read_time": "7 min",
            "author": "Priya Sharma",
            "published": "2024-12-18",
            "likes": 2341,
            "bookmarks": 890
        },
        {
            "id": "art_3",
            "title": "Emergency Fund: How Much is Enough?",
            "summary": "Calculate your ideal emergency fund size",
            "category": "Savings",
            "read_time": "4 min",
            "author": "Rahul Verma",
            "published": "2024-12-15",
            "likes": 1876,
            "bookmarks": 654
        },
        {
            "id": "art_4",
            "title": "SIP vs Lump Sum: Which is Better?",
            "summary": "Data-driven analysis of investment strategies",
            "category": "Investing",
            "read_time": "8 min",
            "author": "Amit Gupta",
            "published": "2024-12-12",
            "likes": 3456,
            "bookmarks": 1234
        },
        {
            "id": "art_5",
            "title": "Health Insurance: Don't Make These 5 Mistakes",
            "summary": "Common errors that can cost you dearly",
            "category": "Insurance",
            "read_time": "6 min",
            "author": "Dr. Neha Singh",
            "published": "2024-12-10",
            "likes": 2109,
            "bookmarks": 987
        }
    ]
    return articles

@api_router.get("/learn/progress/{user_id}")
async def get_learning_progress(user_id: str):
    """Get user's learning progress and badges"""
    progress = await db.learning_progress.find_one({"user_id": user_id})
    
    if not progress:
        progress = {
            "user_id": user_id,
            "courses_completed": 0,
            "courses_in_progress": [],
            "badges_earned": ["Beginner"],
            "total_xp": 100,
            "level": 1,
            "streak_days": 0,
            "articles_read": 0,
            "quizzes_passed": 0
        }
        await db.learning_progress.insert_one(progress)
    
    return serialize_doc(progress)

@api_router.post("/learn/complete-module")
async def complete_module(data: dict):
    """Mark a module as complete and earn XP"""
    user_id = data.get("user_id")
    course_id = data.get("course_id")
    module_id = data.get("module_id")
    
    xp_earned = 50
    
    await db.learning_progress.update_one(
        {"user_id": user_id},
        {
            "$inc": {"total_xp": xp_earned},
            "$addToSet": {"courses_in_progress": course_id}
        },
        upsert=True
    )
    
    # Check for level up
    progress = await db.learning_progress.find_one({"user_id": user_id})
    new_level = (progress.get("total_xp", 0) // 500) + 1
    
    if new_level > progress.get("level", 1):
        await db.learning_progress.update_one(
            {"user_id": user_id},
            {"$set": {"level": new_level}}
        )
    
    return {
        "message": "Module completed!",
        "xp_earned": xp_earned,
        "total_xp": progress.get("total_xp", 0) + xp_earned,
        "level": new_level
    }

# Community & Forums
@api_router.get("/community/posts")
async def get_community_posts():
    """Get community discussion posts"""
    posts = [
        {
            "id": "post_1",
            "author": "Rahul M.",
            "avatar": "R",
            "title": "How I cleared ₹5L credit card debt in 18 months",
            "content": "Started with the avalanche method, cut my expenses by 30%, and stayed focused...",
            "category": "Success Story",
            "likes": 456,
            "comments": 89,
            "timestamp": "2 hours ago",
            "verified": True
        },
        {
            "id": "post_2",
            "author": "Priya S.",
            "avatar": "P",
            "title": "Best SIP funds for 2025?",
            "content": "Planning to start SIP of ₹10k/month. Looking for suggestions on fund selection...",
            "category": "Investment",
            "likes": 234,
            "comments": 156,
            "timestamp": "5 hours ago",
            "verified": False
        },
        {
            "id": "post_3",
            "author": "Amit K.",
            "avatar": "A",
            "title": "Emergency fund vs paying off debt - what first?",
            "content": "I have ₹50k saved but also have ₹2L personal loan at 14%. Should I...",
            "category": "Advice",
            "likes": 567,
            "comments": 234,
            "timestamp": "1 day ago",
            "verified": False
        },
        {
            "id": "post_4",
            "author": "Expert: CA Neha",
            "avatar": "N",
            "title": "Tax saving tips before March 31st",
            "content": "Here are 10 last-minute tax saving strategies that are still available...",
            "category": "Expert Advice",
            "likes": 1234,
            "comments": 345,
            "timestamp": "2 days ago",
            "verified": True
        }
    ]
    return posts

# ============== ACCOUNT AGGREGATOR (AA) FRAMEWORK ==============

@api_router.get("/aa/consent-status/{user_id}")
async def get_aa_consent_status(user_id: str):
    """Get Account Aggregator consent status"""
    consent = await db.aa_consents.find_one({"user_id": user_id})
    
    if not consent:
        return {
            "status": "not_linked",
            "message": "No accounts linked yet",
            "linked_accounts": [],
            "available_fips": [
                {"id": "hdfc", "name": "HDFC Bank", "type": "bank", "logo": "hdfc"},
                {"id": "icici", "name": "ICICI Bank", "type": "bank", "logo": "icici"},
                {"id": "sbi", "name": "State Bank of India", "type": "bank", "logo": "sbi"},
                {"id": "axis", "name": "Axis Bank", "type": "bank", "logo": "axis"},
                {"id": "kotak", "name": "Kotak Mahindra", "type": "bank", "logo": "kotak"},
                {"id": "zerodha", "name": "Zerodha", "type": "investment", "logo": "zerodha"},
                {"id": "groww", "name": "Groww", "type": "investment", "logo": "groww"},
                {"id": "lic", "name": "LIC", "type": "insurance", "logo": "lic"},
                {"id": "nps", "name": "NPS", "type": "pension", "logo": "nps"}
            ]
        }
    
    return serialize_doc(consent)

@api_router.post("/aa/initiate-consent")
async def initiate_aa_consent(data: dict):
    """Initiate AA consent flow (Finvu/CAMFinserv simulation)"""
    user_id = data.get("user_id")
    fip_ids = data.get("fip_ids", [])  # Financial Information Providers
    
    # Simulate AA consent flow
    consent_id = str(uuid.uuid4())
    
    consent = {
        "id": consent_id,
        "user_id": user_id,
        "status": "pending",
        "fip_ids": fip_ids,
        "consent_purpose": "Financial data aggregation for expense tracking and insights",
        "data_life": "Until consent revoked",
        "frequency": "Monthly",
        "data_range": "Last 12 months",
        "created_at": datetime.utcnow(),
        "aa_provider": "Finvu",  # or CAMFinserv
        "rbi_compliant": True
    }
    
    await db.aa_consents.insert_one(consent)
    
    return {
        "consent_id": consent_id,
        "status": "pending",
        "redirect_url": f"https://aa.finvu.in/consent/{consent_id}",  # Simulated
        "message": "Please complete consent on your bank app"
    }

@api_router.post("/aa/confirm-consent")
async def confirm_aa_consent(data: dict):
    """Confirm AA consent (callback simulation)"""
    consent_id = data.get("consent_id")
    user_id = data.get("user_id")
    
    # Simulate successful consent
    linked_accounts = [
        {
            "fip_id": "hdfc",
            "account_type": "savings",
            "masked_number": "XXXX1234",
            "balance": random.randint(50000, 500000),
            "last_synced": datetime.utcnow().isoformat()
        },
        {
            "fip_id": "icici",
            "account_type": "savings", 
            "masked_number": "XXXX5678",
            "balance": random.randint(20000, 200000),
            "last_synced": datetime.utcnow().isoformat()
        },
        {
            "fip_id": "zerodha",
            "account_type": "demat",
            "masked_number": "XXXX9012",
            "portfolio_value": random.randint(100000, 1000000),
            "last_synced": datetime.utcnow().isoformat()
        }
    ]
    
    await db.aa_consents.update_one(
        {"id": consent_id},
        {
            "$set": {
                "status": "active",
                "linked_accounts": linked_accounts,
                "confirmed_at": datetime.utcnow()
            }
        }
    )
    
    return {
        "status": "success",
        "message": "Accounts linked successfully!",
        "linked_accounts": linked_accounts
    }

@api_router.get("/aa/aggregated-data/{user_id}")
async def get_aggregated_data(user_id: str):
    """Get all aggregated financial data from AA"""
    consent = await db.aa_consents.find_one({"user_id": user_id, "status": "active"})
    
    if not consent:
        raise HTTPException(status_code=404, detail="No active consent found")
    
    # Simulated aggregated data
    return {
        "bank_accounts": [
            {
                "bank": "HDFC Bank",
                "type": "Savings",
                "balance": 245000,
                "account_number": "XXXX1234",
                "transactions_count": 45
            },
            {
                "bank": "ICICI Bank",
                "type": "Savings",
                "balance": 89000,
                "account_number": "XXXX5678",
                "transactions_count": 23
            }
        ],
        "investments": {
            "mutual_funds": {
                "total_value": 450000,
                "funds": [
                    {"name": "Axis Bluechip Fund", "value": 180000, "returns": 12.5},
                    {"name": "HDFC Mid-Cap Fund", "value": 150000, "returns": 18.2},
                    {"name": "SBI Small Cap Fund", "value": 120000, "returns": 24.1}
                ]
            },
            "stocks": {
                "total_value": 320000,
                "holdings": [
                    {"name": "Reliance Industries", "qty": 50, "value": 145000},
                    {"name": "TCS", "qty": 30, "value": 105000},
                    {"name": "HDFC Bank", "qty": 40, "value": 70000}
                ]
            },
            "fixed_deposits": {
                "total_value": 200000,
                "deposits": [
                    {"bank": "SBI", "amount": 100000, "rate": 7.1, "maturity": "2025-06-15"},
                    {"bank": "HDFC", "amount": 100000, "rate": 7.25, "maturity": "2025-09-20"}
                ]
            }
        },
        "insurance": [
            {"type": "Health", "provider": "HDFC Ergo", "sum_assured": 1000000, "premium": 18000},
            {"type": "Term Life", "provider": "ICICI Pru", "sum_assured": 10000000, "premium": 12000}
        ],
        "loans": [
            {"type": "Home Loan", "bank": "SBI", "outstanding": 3500000, "emi": 32000, "rate": 8.5},
            {"type": "Car Loan", "bank": "HDFC", "outstanding": 450000, "emi": 12000, "rate": 9.2}
        ],
        "net_worth": {
            "total_assets": 1304000,
            "total_liabilities": 3950000,
            "net_worth": -2646000
        },
        "last_synced": datetime.utcnow().isoformat()
    }

@api_router.post("/aa/revoke-consent")
async def revoke_aa_consent(data: dict):
    """Revoke AA consent (RBI compliant)"""
    user_id = data.get("user_id")
    consent_id = data.get("consent_id")
    
    await db.aa_consents.update_one(
        {"id": consent_id, "user_id": user_id},
        {
            "$set": {
                "status": "revoked",
                "revoked_at": datetime.utcnow(),
                "linked_accounts": []
            }
        }
    )
    
    # Log for audit
    await db.audit_logs.insert_one({
        "user_id": user_id,
        "action": "consent_revoked",
        "consent_id": consent_id,
        "timestamp": datetime.utcnow(),
        "ip_address": "system"
    })
    
    return {"message": "Consent revoked successfully. All linked data has been removed."}

# ============== SECURITY & COMPLIANCE ==============

@api_router.get("/security/audit-log/{user_id}")
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

@api_router.get("/security/privacy-settings/{user_id}")
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

@api_router.post("/security/update-privacy")
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

@api_router.get("/compliance/rbi-info")
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
            "email": "grievance@financewise.app",
            "response_time": "48 hours"
        },
        "regulators": [
            {"name": "Reserve Bank of India", "role": "Primary regulator for AA framework"},
            {"name": "SEBI", "role": "Investment data regulations"},
            {"name": "IRDAI", "role": "Insurance data regulations"}
        ]
    }

# ============== UPI PAYMENTS ==============

@api_router.get("/upi/linked-accounts/{user_id}")
async def get_upi_linked_accounts(user_id: str):
    """Get user's UPI linked bank accounts"""
    return {
        "upi_id": f"user{user_id[:4]}@financewise",
        "linked_accounts": [
            {
                "id": "upi_1",
                "bank": "HDFC Bank",
                "account_number": "XXXX1234",
                "ifsc": "HDFC0001234",
                "is_primary": True,
                "balance": random.randint(10000, 500000),
                "upi_handle": "@hdfcbank"
            },
            {
                "id": "upi_2", 
                "bank": "ICICI Bank",
                "account_number": "XXXX5678",
                "ifsc": "ICIC0005678",
                "is_primary": False,
                "balance": random.randint(5000, 200000),
                "upi_handle": "@icici"
            },
            {
                "id": "upi_3",
                "bank": "State Bank of India",
                "account_number": "XXXX9012",
                "ifsc": "SBIN0009012",
                "is_primary": False,
                "balance": random.randint(20000, 300000),
                "upi_handle": "@sbi"
            }
        ],
        "daily_limit": 100000,
        "used_today": random.randint(0, 30000)
    }

@api_router.get("/upi/recent-payees/{user_id}")
async def get_recent_payees(user_id: str):
    """Get recent UPI payees"""
    return [
        {"id": "p1", "name": "Rahul Sharma", "upi_id": "rahul@paytm", "avatar": "R", "last_paid": "₹500", "frequency": "frequent"},
        {"id": "p2", "name": "Swiggy", "upi_id": "swiggy@ybl", "avatar": "S", "last_paid": "₹350", "frequency": "frequent"},
        {"id": "p3", "name": "Amazon Pay", "upi_id": "amazon@apl", "avatar": "A", "last_paid": "₹1,299", "frequency": "weekly"},
        {"id": "p4", "name": "Priya Kumar", "upi_id": "priya@okaxis", "avatar": "P", "last_paid": "₹2,000", "frequency": "monthly"},
        {"id": "p5", "name": "Electricity Board", "upi_id": "mseb@upi", "avatar": "E", "last_paid": "₹2,450", "frequency": "monthly"},
        {"id": "p6", "name": "Netflix", "upi_id": "netflix@icici", "avatar": "N", "last_paid": "₹649", "frequency": "monthly"},
    ]

@api_router.post("/upi/send-money")
async def send_money_upi(data: dict):
    """Send money via UPI"""
    user_id = data.get("user_id")
    recipient_upi = data.get("recipient_upi")
    amount = data.get("amount", 0)
    note = data.get("note", "")
    source_account = data.get("source_account")
    
    # Simulate UPI transaction
    transaction_id = f"UPI{uuid.uuid4().hex[:12].upper()}"
    
    # Earn coins (1 coin per ₹50 for UPI)
    coins_earned = int(amount / 50)
    
    await db.users.update_one(
        {"id": user_id},
        {"$inc": {"reward_coins": coins_earned}}
    )
    
    # Record transaction
    txn = {
        "id": transaction_id,
        "user_id": user_id,
        "type": "upi_send",
        "amount": amount,
        "recipient": recipient_upi,
        "note": note,
        "source_account": source_account,
        "status": "success",
        "coins_earned": coins_earned,
        "timestamp": datetime.utcnow()
    }
    await db.upi_transactions.insert_one(txn)
    
    return {
        "status": "success",
        "transaction_id": transaction_id,
        "amount": amount,
        "recipient": recipient_upi,
        "coins_earned": coins_earned,
        "message": f"₹{amount:,} sent successfully!"
    }

@api_router.post("/upi/request-money")
async def request_money_upi(data: dict):
    """Request money via UPI"""
    user_id = data.get("user_id")
    from_upi = data.get("from_upi")
    amount = data.get("amount", 0)
    note = data.get("note", "")
    
    request_id = f"REQ{uuid.uuid4().hex[:10].upper()}"
    
    return {
        "status": "pending",
        "request_id": request_id,
        "amount": amount,
        "from_upi": from_upi,
        "message": "Payment request sent!"
    }

@api_router.get("/upi/transaction-history/{user_id}")
async def get_upi_history(user_id: str):
    """Get UPI transaction history"""
    transactions = await db.upi_transactions.find({"user_id": user_id}).sort("timestamp", -1).to_list(50)
    
    if not transactions:
        # Sample transactions
        transactions = [
            {"id": "UPI001", "type": "sent", "amount": 500, "to": "rahul@paytm", "timestamp": datetime.utcnow() - timedelta(hours=2), "status": "success"},
            {"id": "UPI002", "type": "received", "amount": 1000, "from": "priya@okaxis", "timestamp": datetime.utcnow() - timedelta(hours=5), "status": "success"},
            {"id": "UPI003", "type": "sent", "amount": 350, "to": "swiggy@ybl", "timestamp": datetime.utcnow() - timedelta(days=1), "status": "success"},
            {"id": "UPI004", "type": "sent", "amount": 2450, "to": "mseb@upi", "timestamp": datetime.utcnow() - timedelta(days=2), "status": "success"},
        ]
    
    return serialize_doc(transactions)

# ============== DIGITAL LOANS ==============

@api_router.get("/loans/eligibility/{user_id}")
async def check_loan_eligibility(user_id: str):
    """Check loan eligibility against assets"""
    # Get user's assets
    credit_score = await db.credit_scores.find_one({"user_id": user_id})
    score = credit_score.get("score", 700) if credit_score else 700
    
    return {
        "credit_score": score,
        "max_loan_amount": 1000000 if score >= 750 else 500000 if score >= 700 else 200000,
        "eligible_loan_types": [
            {
                "type": "loan_against_mf",
                "name": "Loan Against Mutual Funds",
                "max_ltv": 70,  # Loan to Value ratio
                "interest_rate": 10.5,
                "processing_fee": 1,
                "tenure_options": [12, 24, 36, 48, 60],
                "collateral_value": 450000,
                "max_loan": 315000,
                "disbursement_time": "Instant"
            },
            {
                "type": "loan_against_shares",
                "name": "Loan Against Shares",
                "max_ltv": 50,
                "interest_rate": 11.5,
                "processing_fee": 1.5,
                "tenure_options": [12, 24, 36],
                "collateral_value": 320000,
                "max_loan": 160000,
                "disbursement_time": "2-4 hours"
            },
            {
                "type": "loan_against_fd",
                "name": "Loan Against FD",
                "max_ltv": 90,
                "interest_rate": 8.5,
                "processing_fee": 0.5,
                "tenure_options": [12, 24, 36, 48, 60],
                "collateral_value": 200000,
                "max_loan": 180000,
                "disbursement_time": "Instant"
            },
            {
                "type": "personal_loan",
                "name": "Personal Loan",
                "max_ltv": 100,
                "interest_rate": 14.5,
                "processing_fee": 2,
                "tenure_options": [12, 24, 36, 48, 60],
                "collateral_value": 0,
                "max_loan": 500000 if score >= 700 else 200000,
                "disbursement_time": "24-48 hours"
            }
        ],
        "pre_approved_offers": [
            {
                "id": "offer_1",
                "type": "loan_against_mf",
                "amount": 200000,
                "interest_rate": 9.99,
                "tenure": 36,
                "emi": 6451,
                "valid_until": (datetime.utcnow() + timedelta(days=30)).strftime("%Y-%m-%d"),
                "special": True
            }
        ]
    }

@api_router.post("/loans/apply")
async def apply_for_loan(data: dict):
    """Apply for a loan"""
    user_id = data.get("user_id")
    loan_type = data.get("loan_type")
    amount = data.get("amount")
    tenure = data.get("tenure")
    collateral_ids = data.get("collateral_ids", [])
    
    # Calculate EMI
    rate = 10.5 / 12 / 100  # Monthly interest rate
    emi = (amount * rate * (1 + rate)**tenure) / ((1 + rate)**tenure - 1)
    
    loan_id = f"LN{uuid.uuid4().hex[:10].upper()}"
    
    loan = {
        "id": loan_id,
        "user_id": user_id,
        "type": loan_type,
        "amount": amount,
        "tenure": tenure,
        "emi": round(emi, 2),
        "interest_rate": 10.5,
        "status": "approved",
        "disbursement_status": "processing",
        "collateral_ids": collateral_ids,
        "applied_at": datetime.utcnow(),
        "disbursement_date": datetime.utcnow() + timedelta(hours=2)
    }
    
    await db.loans.insert_one(loan)
    
    return {
        "status": "approved",
        "loan_id": loan_id,
        "amount": amount,
        "emi": round(emi, 2),
        "tenure": tenure,
        "message": "Loan approved! Amount will be disbursed within 2 hours."
    }

@api_router.get("/loans/active/{user_id}")
async def get_active_loans(user_id: str):
    """Get user's active loans"""
    loans = await db.loans.find({"user_id": user_id, "status": {"$in": ["approved", "active"]}}).to_list(10)
    
    if not loans:
        # Sample loan
        loans = [
            {
                "id": "LN001",
                "type": "loan_against_mf",
                "name": "Loan Against Mutual Funds",
                "amount": 150000,
                "outstanding": 125000,
                "emi": 4832,
                "interest_rate": 10.5,
                "tenure": 36,
                "remaining_tenure": 26,
                "next_emi_date": (datetime.utcnow() + timedelta(days=15)).strftime("%Y-%m-%d"),
                "status": "active",
                "collateral": {
                    "type": "mutual_funds",
                    "value": 220000,
                    "funds": ["Axis Bluechip Fund", "HDFC Mid-Cap Fund"]
                }
            }
        ]
    
    return serialize_doc(loans)

# ============== COMPREHENSIVE ACCOUNT TRACKING ==============

@api_router.get("/accounts/all/{user_id}")
async def get_all_accounts(user_id: str):
    """Get all user accounts - Bank, Post Office, FD, RD"""
    return {
        "summary": {
            "total_balance": 1245000,
            "total_investments": 970000,
            "total_deposits": 400000,
            "accounts_count": 12
        },
        "bank_accounts": [
            {
                "id": "bank_1",
                "bank": "HDFC Bank",
                "type": "Savings",
                "account_number": "XXXX1234",
                "ifsc": "HDFC0001234",
                "balance": 245000,
                "interest_rate": 3.0,
                "is_salary_account": True,
                "last_transaction": datetime.utcnow().isoformat(),
                "card_color": "#004C8F"
            },
            {
                "id": "bank_2",
                "bank": "ICICI Bank",
                "type": "Savings",
                "account_number": "XXXX5678",
                "ifsc": "ICIC0005678",
                "balance": 89000,
                "interest_rate": 3.0,
                "is_salary_account": False,
                "last_transaction": datetime.utcnow().isoformat(),
                "card_color": "#F58220"
            },
            {
                "id": "bank_3",
                "bank": "State Bank of India",
                "type": "Savings",
                "account_number": "XXXX9012",
                "ifsc": "SBIN0009012",
                "balance": 156000,
                "interest_rate": 2.7,
                "is_salary_account": False,
                "last_transaction": datetime.utcnow().isoformat(),
                "card_color": "#22409A"
            }
        ],
        "post_office_accounts": [
            {
                "id": "po_1",
                "type": "Post Office Savings",
                "account_number": "PO-XXXX3456",
                "branch": "Andheri West",
                "balance": 75000,
                "interest_rate": 4.0,
                "card_color": "#DC2626"
            },
            {
                "id": "po_2",
                "type": "National Savings Certificate",
                "certificate_number": "NSC-XXXX7890",
                "principal": 100000,
                "current_value": 112000,
                "interest_rate": 7.7,
                "maturity_date": "2028-06-15",
                "card_color": "#DC2626"
            }
        ],
        "fixed_deposits": [
            {
                "id": "fd_1",
                "bank": "SBI",
                "type": "Fixed Deposit",
                "fd_number": "FD-XXXX1111",
                "principal": 100000,
                "current_value": 107100,
                "interest_rate": 7.1,
                "tenure_months": 24,
                "start_date": "2024-01-15",
                "maturity_date": "2026-01-15",
                "maturity_amount": 114490,
                "interest_payout": "On Maturity",
                "is_tax_saver": True,
                "card_color": "#22409A"
            },
            {
                "id": "fd_2",
                "bank": "HDFC Bank",
                "type": "Fixed Deposit",
                "fd_number": "FD-XXXX2222",
                "principal": 150000,
                "current_value": 158750,
                "interest_rate": 7.25,
                "tenure_months": 36,
                "start_date": "2024-03-20",
                "maturity_date": "2027-03-20",
                "maturity_amount": 186456,
                "interest_payout": "Quarterly",
                "is_tax_saver": False,
                "card_color": "#004C8F"
            },
            {
                "id": "fd_3",
                "bank": "Post Office",
                "type": "Time Deposit",
                "fd_number": "POTD-XXXX3333",
                "principal": 50000,
                "current_value": 53850,
                "interest_rate": 7.5,
                "tenure_months": 60,
                "start_date": "2023-06-01",
                "maturity_date": "2028-06-01",
                "maturity_amount": 72102,
                "interest_payout": "Annually",
                "is_tax_saver": True,
                "card_color": "#DC2626"
            }
        ],
        "recurring_deposits": [
            {
                "id": "rd_1",
                "bank": "HDFC Bank",
                "type": "Recurring Deposit",
                "rd_number": "RD-XXXX4444",
                "monthly_amount": 5000,
                "total_deposited": 30000,
                "current_value": 31250,
                "interest_rate": 6.75,
                "tenure_months": 24,
                "installments_paid": 6,
                "remaining_installments": 18,
                "start_date": "2024-07-01",
                "maturity_date": "2026-07-01",
                "maturity_amount": 128456,
                "card_color": "#004C8F"
            },
            {
                "id": "rd_2",
                "bank": "Post Office",
                "type": "RD Account",
                "rd_number": "PORD-XXXX5555",
                "monthly_amount": 2000,
                "total_deposited": 24000,
                "current_value": 25200,
                "interest_rate": 6.7,
                "tenure_months": 60,
                "installments_paid": 12,
                "remaining_installments": 48,
                "start_date": "2024-01-01",
                "maturity_date": "2029-01-01",
                "maturity_amount": 143256,
                "card_color": "#DC2626"
            }
        ],
        "ppf_account": {
            "id": "ppf_1",
            "account_number": "PPF-XXXX6666",
            "bank": "SBI",
            "balance": 450000,
            "this_year_deposit": 50000,
            "max_yearly_deposit": 150000,
            "interest_rate": 7.1,
            "maturity_year": 2035,
            "lock_in_remaining_years": 8,
            "card_color": "#059669"
        },
        "sukanya_samriddhi": None,
        "nps_account": {
            "id": "nps_1",
            "pran_number": "XXXX7777XXXX",
            "fund_manager": "HDFC Pension",
            "total_corpus": 280000,
            "equity_allocation": 75,
            "debt_allocation": 25,
            "returns_ytd": 14.5,
            "card_color": "#7C3AED"
        }
    }

@api_router.post("/accounts/add")
async def add_account(data: dict):
    """Add a new account manually"""
    user_id = data.get("user_id")
    account_type = data.get("account_type")  # bank, post_office, fd, rd
    account_data = data.get("account_data", {})
    
    account_id = str(uuid.uuid4())
    account_data["id"] = account_id
    account_data["user_id"] = user_id
    account_data["added_manually"] = True
    account_data["created_at"] = datetime.utcnow()
    
    await db.manual_accounts.insert_one(account_data)
    
    return {
        "status": "success",
        "account_id": account_id,
        "message": "Account added successfully!"
    }

@api_router.get("/investments/portfolio/{user_id}")
async def get_investment_portfolio(user_id: str):
    """Get complete investment portfolio"""
    return {
        "total_value": 970000,
        "total_invested": 850000,
        "total_returns": 120000,
        "returns_percentage": 14.12,
        "xirr": 15.8,
        "mutual_funds": {
            "total_value": 450000,
            "invested": 380000,
            "returns": 70000,
            "funds": [
                {
                    "id": "mf_1",
                    "name": "Axis Bluechip Fund",
                    "category": "Large Cap",
                    "invested": 150000,
                    "current_value": 180000,
                    "units": 1234.56,
                    "nav": 145.82,
                    "returns_pct": 20.0,
                    "sip_amount": 5000,
                    "sip_date": 5,
                    "rating": 5
                },
                {
                    "id": "mf_2",
                    "name": "HDFC Mid-Cap Opportunities",
                    "category": "Mid Cap",
                    "invested": 120000,
                    "current_value": 150000,
                    "units": 789.12,
                    "nav": 190.08,
                    "returns_pct": 25.0,
                    "sip_amount": 3000,
                    "sip_date": 10,
                    "rating": 4
                },
                {
                    "id": "mf_3",
                    "name": "SBI Small Cap Fund",
                    "category": "Small Cap",
                    "invested": 110000,
                    "current_value": 120000,
                    "units": 567.89,
                    "nav": 211.30,
                    "returns_pct": 9.1,
                    "sip_amount": 2000,
                    "sip_date": 15,
                    "rating": 4
                }
            ]
        },
        "stocks": {
            "total_value": 320000,
            "invested": 280000,
            "returns": 40000,
            "holdings": [
                {
                    "id": "stk_1",
                    "symbol": "RELIANCE",
                    "name": "Reliance Industries",
                    "quantity": 50,
                    "avg_price": 2200,
                    "current_price": 2900,
                    "invested": 110000,
                    "current_value": 145000,
                    "returns_pct": 31.82,
                    "day_change": 1.2
                },
                {
                    "id": "stk_2",
                    "symbol": "TCS",
                    "name": "Tata Consultancy Services",
                    "quantity": 30,
                    "avg_price": 3200,
                    "current_price": 3500,
                    "invested": 96000,
                    "current_value": 105000,
                    "returns_pct": 9.38,
                    "day_change": -0.5
                },
                {
                    "id": "stk_3",
                    "symbol": "HDFCBANK",
                    "name": "HDFC Bank",
                    "quantity": 40,
                    "avg_price": 1600,
                    "current_price": 1750,
                    "invested": 64000,
                    "current_value": 70000,
                    "returns_pct": 9.38,
                    "day_change": 0.8
                }
            ]
        },
        "gold": {
            "total_value": 200000,
            "invested": 190000,
            "grams": 32.5,
            "current_price_per_gram": 6154,
            "returns_pct": 5.26
        }
    }

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
