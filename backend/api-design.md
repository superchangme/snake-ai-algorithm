# Snake AI 后端 API 设计

## 技术栈

| 组件 | 技术选择 | 说明 |
|------|----------|------|
| Web 框架 | FastAPI | 高性能异步框架，自动生成 OpenAPI 文档 |
| 数据库 | PostgreSQL | 关系型数据，支持复杂查询 |
| ORM/驱动 | asyncpg | 异步 PostgreSQL 驱动，性能优秀 |
| 配置管理 | pydantic-settings | 环境变量管理 |
| 数据验证 | Pydantic | 请求/响应模型校验 |

---

## 1. API 端点规范

### 1.1 健康检查

```
GET /health
```

**响应 (200 OK):**
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2026-03-15T17:42:00Z"
}
```

---

### 1.2 保存游戏记录

```
POST /api/games
```

**请求体:**
```json
{
  "player_name": "player_001",
  "score": 1500,
  "steps": 230,
  "map_size": 10,
  "mode": "ai",
  "connection": "ws",
  "duration_seconds": 45,
  "created_at": "2026-03-15T17:40:00Z"
}
```

**字段说明:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| player_name | string | 是 | 玩家名称（最大 64 字符） |
| score | integer | 是 | 游戏得分（>= 0） |
| steps | integer | 是 | 总步数（>= 0） |
| map_size | integer | 是 | 地图尺寸（10, 15, 20 等） |
| mode | string | 是 | 游戏模式：`ai` 或 `human` |
| connection | string | 是 | 连接方式：`ws` 或 `http` |
| duration_seconds | integer | 是 | 游戏时长（秒） |
| created_at | datetime | 否 | 创建时间（默认服务器时间） |

**响应 (201 Created):**
```json
{
  "id": 1,
  "player_name": "player_001",
  "score": 1500,
  "steps": 230,
  "map_size": 10,
  "mode": "ai",
  "connection": "ws",
  "duration_seconds": 45,
  "created_at": "2026-03-15T17:40:00Z"
}
```

**错误响应 (422 Validation Error):**
```json
{
  "detail": [
    {
      "loc": ["body", "score"],
      "msg": "ensure this value is greater than or equal to 0",
      "type": "value_error"
    }
  ]
}
```

---

### 1.3 查询个人历史

```
GET /api/games/history?player_name=xxx&limit=20
```

**查询参数:**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| player_name | string | 是 | - | 玩家名称 |
| limit | integer | 否 | 20 | 返回记录数（1-100） |
| offset | integer | 否 | 0 | 偏移量 |

**响应 (200 OK):**
```json
{
  "player_name": "player_001",
  "total": 50,
  "limit": 20,
  "offset": 0,
  "games": [
    {
      "id": 50,
      "score": 1500,
      "steps": 230,
      "map_size": 10,
      "mode": "ai",
      "connection": "ws",
      "duration_seconds": 45,
      "created_at": "2026-03-15T17:40:00Z"
    },
    {
      "id": 49,
      "score": 1200,
      "steps": 200,
      "map_size": 10,
      "mode": "ai",
      "connection": "http",
      "duration_seconds": 38,
      "created_at": "2026-03-15T17:30:00Z"
    }
  ]
}
```

---

### 1.4 查询排行榜

```
GET /api/games/leaderboard?map_size=10&limit=10
```

**查询参数:**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| map_size | integer | 是 | - | 地图尺寸 |
| limit | integer | 否 | 10 | 返回记录数（1-100） |
| mode | string | 否 | all | 过滤模式：`ai`, `human`, `all` |

**响应 (200 OK):**
```json
{
  "map_size": 10,
  "mode": "all",
  "limit": 10,
  "leaderboard": [
    {
      "rank": 1,
      "player_name": "player_001",
      "score": 1500,
      "steps": 230,
      "mode": "ai",
      "created_at": "2026-03-15T17:40:00Z"
    },
    {
      "rank": 2,
      "player_name": "player_002",
      "score": 1400,
      "steps": 250,
      "mode": "ai",
      "created_at": "2026-03-15T17:35:00Z"
    }
  ]
}
```

**排名规则:**
1. 分数降序
2. 同分时步数少的优先

---

## 2. 数据库 Schema

### 2.1 表结构

```sql
-- 游戏记录表
CREATE TABLE game_records (
    id BIGSERIAL PRIMARY KEY,
    player_name VARCHAR(64) NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 0),
    steps INTEGER NOT NULL CHECK (steps >= 0),
    map_size INTEGER NOT NULL,
    mode VARCHAR(10) NOT NULL CHECK (mode IN ('ai', 'human')),
    connection VARCHAR(10) NOT NULL CHECK (connection IN ('ws', 'http')),
    duration_seconds INTEGER NOT NULL CHECK (duration_seconds >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 扩展字段（JSONB，用于未来特性）
    metadata JSONB DEFAULT '{}'
);

-- 索引
CREATE INDEX idx_game_records_player_name ON game_records(player_name);
CREATE INDEX idx_game_records_map_size ON game_records(map_size);
CREATE INDEX idx_game_records_created_at ON game_records(created_at DESC);

-- 复合索引：排行榜查询优化
-- (map_size, score DESC, steps ASC) - 支持排行榜高效查询
CREATE INDEX idx_game_records_leaderboard ON game_records(
    map_size, 
    score DESC, 
    steps ASC
);

-- 用户表（未来扩展）
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(64) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 算法记录表（未来扩展：记录不同算法的表现）
CREATE TABLE algorithm_runs (
    id BIGSERIAL PRIMARY KEY,
    game_record_id BIGINT REFERENCES game_records(id),
    algorithm_name VARCHAR(64) NOT NULL,
    algorithm_params JSONB DEFAULT '{}',
    execution_time_ms INTEGER,
    path_length INTEGER,
    efficiency_score FLOAT
);

CREATE INDEX idx_algorithm_runs_algorithm ON algorithm_runs(algorithm_name);
```

### 2.2 ER 关系

```
┌──────────────┐       ┌─────────────────┐
│    users     │       │  game_records   │
├──────────────┤       ├─────────────────┤
│ id (PK)      │──1:N──│ user_id (FK)    │
│ username     │       │ id (PK)         │
│ email        │       │ player_name     │
│ password_hash│       │ score           │
└──────────────┘       │ steps           │
                       │ map_size        │
                       │ mode            │
                       │ connection      │
                       │ duration_seconds│
                       │ created_at      │
                       │ metadata (JSONB)│
                       └─────────────────┘
                              │
                              │ 1:1
                              ▼
                       ┌─────────────────┐
                       │ algorithm_runs  │
                       ├─────────────────┤
                       │ id (PK)         │
                       │ game_record_id  │
                       │ algorithm_name  │
                       │ algorithm_params │
                       │ execution_time  │
                       └─────────────────┘
```

---

## 3. 项目目录结构

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI 应用入口
│   ├── config.py               # 配置管理
│   ├── database.py             # 数据库连接池
│   ├── models/                 # Pydantic 模型
│   │   ├── __init__.py
│   │   ├── game.py             # 游戏相关模型
│   │   └── user.py             # 用户相关模型
│   ├── schemas/                # 请求/响应模型
│   │   ├── __init__.py
│   │   ├── game.py             # 游戏 API 模型
│   │   └── user.py             # 用户 API 模型
│   ├── routers/                # API 路由
│   │   ├── __init__.py
│   │   ├── health.py           # 健康检查
│   │   └── games.py            # 游戏 API
│   ├── services/               # 业务逻辑
│   │   ├── __init__.py
│   │   └── game_service.py     # 游戏服务
│   └── utils/
│       ├── __init__.py
│       └── ranking.py           # 排名计算
├── tests/
│   ├── __init__.py
│   ├── test_games.py           # 游戏 API 测试
│   └── test_database.py        # 数据库测试
├── alembic/                    # 数据库迁移
│   ├── env.py
│   └── versions/
├── .env.example                # 环境变量示例
├── requirements.txt
├── pyproject.toml
└── README.md
```

---

## 4. 核心代码实现

### 4.1 配置管理 (.env)

```bash
# 数据库配置
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=snake_ai
DATABASE_USER=snake_user
DATABASE_PASSWORD=your_secure_password

# 应用配置
APP_HOST=0.0.0.0
APP_PORT=8000
DEBUG=false
```

### 4.2 配置类 (config.py)

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    
    # Database
    database_host: str = "localhost"
    database_port: int = 5432
    database_name: str = "snake_ai"
    database_user: str = "snake_user"
    database_password: str = ""
    
    # App
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    debug: bool = False
    
    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.database_user}:{self.database_password}"
            f"@{self.database_host}:{self.database_port}/{self.database_name}"
        )


settings = Settings()
```

### 4.3 数据库连接 (database.py)

```python
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

from app.config import settings

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_size=10,
    max_overflow=20,
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

### 4.4 游戏记录模型 (models/game.py)

```python
from datetime import datetime
from sqlalchemy import BigInteger, Integer, String, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class GameRecord(Base):
    __tablename__ = "game_records"
    
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    player_name: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    steps: Mapped[int] = mapped_column(Integer, nullable=False)
    map_size: Mapped[int] = mapped_column(Integer, nullable=False)
    mode: Mapped[str] = mapped_column(String(10), nullable=False)
    connection: Mapped[str] = mapped_column(String(10), nullable=False)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(nullable=False, default=datetime.utcnow)
    
    __table_args__ = (
        CheckConstraint("score >= 0", name="check_score_positive"),
        CheckConstraint("steps >= 0", name="check_steps_positive"),
        CheckConstraint("mode IN ('ai', 'human')", name="check_mode_valid"),
        CheckConstraint("connection IN ('ws', 'http')", name="check_connection_valid"),
    )
```

### 4.5 API 路由 (routers/games.py)

```python
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
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
    db_game = GameRecord(**game.model_dump())
    db.add(db_game)
    await db.flush()
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
    count_stmt = select(GameRecord).where(GameRecord.player_name == player_name)
    count_result = await db.execute(count_stmt)
    total = len(count_result.scalars().all())
    
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
    from sqlalchemy import func
    
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
```

### 4.6 主应用入口 (main.py)

```python
from fastapi import FastAPI
from app.routers import health, games
from app.config import settings

app = FastAPI(
    title="Snake AI API",
    description="贪食蛇游戏后端 API",
    version="1.0.0",
)

# 注册路由
app.include_router(health.router)
app.include_router(games.router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.app_host,
        port=settings.app_port,
        reload=settings.debug
    )
```

---

## 5. 未来扩展设计

### 5.1 用户认证系统

```python
# 扩展：用户注册/登录
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh

# JWT 认证
Authorization: Bearer <token>
```

### 5.2 算法对比

```python
# 扩展：记录算法执行详情
POST /api/algorithms/runs
GET /api/algorithms/{name}/stats
GET /api/algorithms/comparison?map_size=10
```

### 5.3 数据分析

```python
# 扩展：统计数据
GET /api/stats/overview
GET /api/stats/player/{player_name}/analytics
GET /api/stats/algorithm/{algorithm_name}/performance
```

---

## 6. 部署建议

### 6.1 Docker Compose

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_HOST=postgres
    depends_on:
      - postgres

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: snake_ai
      POSTGRES_USER: snake_user
      POSTGRES_PASSWORD: your_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### 6.2 运行命令

```bash
# 安装依赖
pip install -r requirements.txt

# 运行数据库迁移
alembic upgrade head

# 启动服务
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 或使用 Python
python -m app.main
```

---

## 7. API 完整端点列表

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| GET | /health | 健康检查 | ✅ |
| POST | /api/games | 保存游戏记录 | ✅ |
| GET | /api/games/history | 查询玩家历史 | ✅ |
| GET | /api/games/leaderboard | 查询排行榜 | ✅ |
| POST | /api/auth/register | 用户注册 | 🔄 未来 |
| POST | /api/auth/login | 用户登录 | 🔄 未来 |
| GET | /api/stats/overview | 统计数据概览 | 🔄 未来 |

---

*文档版本: 1.0.0*  
*更新时间: 2026-03-15*
