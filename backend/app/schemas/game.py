from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class GameCreate(BaseModel):
    """创建游戏记录的请求模型"""
    player_name: str = Field(..., min_length=1, max_length=64, description="玩家名称")
    score: int = Field(..., ge=0, description="游戏得分")
    steps: int = Field(..., ge=0, description="总步数")
    map_size: int = Field(..., ge=5, description="地图尺寸")
    mode: str = Field(..., pattern="^(ai|human)$", description="游戏模式")
    connection: str = Field(..., pattern="^(ws|http)$", description="连接方式")
    duration_seconds: float = Field(..., ge=0, description="游戏时长（秒）")
    created_at: Optional[datetime] = None


class GameResponse(BaseModel):
    """游戏记录响应模型"""
    id: int
    player_name: str
    score: int
    steps: int
    map_size: int
    mode: str
    connection: str
    duration_seconds: float
    created_at: datetime

    class Config:
        from_attributes = True


class GameHistoryResponse(BaseModel):
    """玩家历史记录响应模型"""
    player_name: str
    total: int
    limit: int
    offset: int
    games: List[GameResponse]


class LeaderboardEntry(BaseModel):
    """排行榜条目"""
    rank: int
    player_name: str
    score: int
    steps: int
    mode: str
    created_at: datetime


class LeaderboardResponse(BaseModel):
    """排行榜响应模型"""
    map_size: int
    mode: str
    limit: int
    leaderboard: List[LeaderboardEntry]
