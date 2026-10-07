import logging

from fastapi import APIRouter

from ..db import db
from ..services import game
from ..utils import serialize_doc

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/learn/courses")
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

@router.get("/learn/articles")
async def get_articles():
    """Get financial literacy articles"""
    articles = [
        {
            "id": "art_1",
            "title": "50-30-20 Budget Rule Explained",
            "summary": "The simplest budgeting framework that actually works",
            "category": "Budgeting",
            "read_time": "5 min",
            "author": "CoinQuest Team",
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

@router.get("/learn/progress/{user_id}")
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
            "quizzes_passed": 0,
            "modules_done": [],
        }
        await db.learning_progress.insert_one(dict(progress))
    
    return serialize_doc(progress)

@router.post("/learn/complete-module")
async def complete_module(data: dict):
    """Mark a module as complete and earn XP"""
    user_id = data.get("user_id")
    course_id = data.get("course_id")
    module_id = data.get("module_id")
    
    xp_earned = 50
    await get_learning_progress(user_id)  # make sure a progress doc exists
    await db.learning_progress.update_one(
        {"user_id": user_id},
        {
            "$inc": {"total_xp": xp_earned},
            "$addToSet": {"courses_in_progress": course_id, "modules_done": f"{course_id}:{module_id}"},
        },
    )

    progress = await db.learning_progress.find_one({"user_id": user_id})
    new_level = (progress.get("total_xp", 0) // 500) + 1
    if new_level > progress.get("level", 1):
        await db.learning_progress.update_one({"user_id": user_id}, {"$set": {"level": new_level}})

    reward = await game.award(user_id, "module_complete")
    return {
        "message": "Module completed!",
        "xp_earned": xp_earned,
        "total_xp": progress.get("total_xp", 0),
        "level": new_level,
        "reward": reward,
    }
