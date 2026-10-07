from fastapi import APIRouter

from ..models import CheckIn
from ..services import game

router = APIRouter(prefix="/game", tags=["game"])


@router.get("/profile/{user_id}")
async def get_profile(user_id: str):
    """Player card: level, XP, coins, streak, today's quests and achievements."""
    return await game.get_game_profile(user_id)


@router.post("/checkin")
async def daily_checkin(body: CheckIn):
    return await game.check_in(body.user_id)


@router.get("/leaderboard/{user_id}")
async def get_leaderboard(user_id: str):
    return await game.leaderboard(user_id)
