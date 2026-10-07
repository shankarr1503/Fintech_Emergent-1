import csv
import io
import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, File, HTTPException, UploadFile

from ..db import db
from ..models import Transaction, TransactionCreate
from ..services.ai import categorize_transaction_ai
from ..services.sample_data import generate_sample_data
from ..utils import serialize_doc

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/transactions/{user_id}")
async def get_transactions(user_id: str, limit: int = 100, category: str = None):
    """Get user transactions"""
    query = {"user_id": user_id}
    if category:
        query["category"] = category
    
    transactions = await db.transactions.find(query).sort("date", -1).to_list(limit)
    return serialize_doc(transactions)

@router.post("/transactions")
async def create_transaction(transaction: TransactionCreate):
    """Create a new transaction"""
    # Auto-categorize if not provided
    category = transaction.category
    if not category:
        category = await categorize_transaction_ai(transaction.merchant, transaction.description or "")
    
    trans_dict = transaction.model_dump()
    trans_dict['category'] = category.value if hasattr(category, 'value') else category
    trans_obj = Transaction(**trans_dict)
    
    await db.transactions.insert_one(trans_obj.model_dump())
    return trans_obj

@router.post("/transactions/upload-csv/{user_id}")
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

@router.post("/transactions/mock-sync/{user_id}")
async def mock_bank_sync(user_id: str):
    """Mock Account Aggregator sync - generates realistic transactions"""
    result = await generate_sample_data(user_id, days=3, with_portfolio=False)
    return {"message": "Bank sync completed", "synced": result}
