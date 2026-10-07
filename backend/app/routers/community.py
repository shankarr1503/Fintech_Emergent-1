import logging

from fastapi import APIRouter

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/community/posts")
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
