from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.game import GameRecord
from app.schemas.game import (
    GameCreate,
    GameResponse,
    GameHistoryResponse,
    LeaderboardResponse,
    LeaderboardEntry,
)

router = APIRouter(prefix="/api/games", tags=["games"])


@router.post("", response_model=GameResponse, status_code=201)
async def create_game(
    game: GameCreate,
    db: AsyncSession = Depends(get_db)
):
    """保存游戏记录"""
    game_data = game.model_dump()
    if game_data.get("created_at") is None:
        game_data["created_at"] = datetime.now(timezone.utc)
    
    db_game = GameRecord(**game_data)
    db.add(db_game)
    await db.flush()
    await db.commit()
    await db.refresh(db_game)
    return db_game


@router.get("/history", response_model=GameHistoryResponse)
async def get_player_history(
    player_name: str = Query(..., min_length=1, max_length=64),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """查询玩家历史记录"""
    # 查询记录
    stmt = (
        select(GameRecord)
        .where(GameRecord.player_name == player_name)
        .order_by(GameRecord.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(stmt)
    games = result.scalars().all()
    
    # 统计总数
    count_stmt = select(func.count(GameRecord.id)).where(GameRecord.player_name == player_name)
    count_result = await db.execute(count_stmt)
    total = count_result.scalar() or 0
    
    return GameHistoryResponse(
        player_name=player_name,
        total=total,
        limit=limit,
        offset=offset,
        games=[GameResponse.model_validate(g) for g in games]
    )


@router.get("/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard(
    map_size: int = Query(..., ge=5),
    limit: int = Query(10, ge=1, le=100),
    mode: Optional[str] = Query(None, pattern="^(ai|human|all)$"),
    db: AsyncSession = Depends(get_db)
):
    """查询排行榜"""
    # 构建查询：按 map_size 分组，分数降序，步数升序
    stmt = (
        select(GameRecord)
        .where(GameRecord.map_size == map_size)
        .order_by(GameRecord.score.desc(), GameRecord.steps.asc())
        .limit(limit)
    )
    
    if mode and mode != "all":
        stmt = stmt.where(GameRecord.mode == mode)
    
    result = await db.execute(stmt)
    games = result.scalars().all()
    
    leaderboard = [
        LeaderboardEntry(
            rank=idx + 1,
            player_name=g.player_name,
            score=g.score,
            steps=g.steps,
            mode=g.mode,
            created_at=g.created_at
        )
        for idx, g in enumerate(games)
    ]
    
    return LeaderboardResponse(
        map_size=map_size,
        mode=mode or "all",
        limit=limit,
        leaderboard=leaderboard
    )
