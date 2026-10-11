import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


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

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    phone: str
    name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserUpdate(BaseModel):
    name: Optional[str] = None
    avatar: Optional[str] = None

class UserCreate(BaseModel):
    phone: str
    name: Optional[str] = None

class OTPRequest(BaseModel):
    phone: str = Field(pattern=r"^[6-9]\d{9}$")

class OTPVerify(BaseModel):
    phone: str = Field(pattern=r"^[6-9]\d{9}$")
    otp: str = Field(pattern=r"^\d{6}$")
    # Version of the Terms & Privacy Policy the user accepted on this screen.
    accept_terms: Optional[str] = None
    # Explicit confirmation that the user is 18 or older (CoinQuest is for adults only).
    confirm_age: bool = False

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
    name: str = Field(min_length=1)
    type: DebtType
    principal: float = Field(gt=0)
    outstanding: float = Field(ge=0)
    interest_rate: float = Field(ge=0, le=100)
    emi_amount: float = Field(gt=0)
    remaining_tenure: int = Field(gt=0)

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
    name: str = Field(min_length=1)
    target_amount: float = Field(gt=0)
    monthly_contribution: float = 0
    target_date: Optional[datetime] = None

class SavingsContribution(BaseModel):
    goal_id: str
    amount: float = Field(gt=0)

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

class LanguageUpdate(BaseModel):
    user_id: str
    language: str  # en, hi, ta, te, etc.

class SecuritySettings(BaseModel):
    user_id: str
    biometric_enabled: bool = False
    transaction_alerts: bool = True
    login_notifications: bool = True


class DebtPayment(BaseModel):
    amount: float = Field(gt=0)


class CheckIn(BaseModel):
    user_id: str
