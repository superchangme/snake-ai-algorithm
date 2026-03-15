# 后端数据库代码审查报告

**审查分支**: `feature/backend-api`  
**审查日期**: 2026-03-15  
**审查人**: Code Review Expert

---

## 🔴 高严重级别问题

### 1. 数据库密码在 URL 中明文传输
**文件**: `app/config.py`

**问题描述**: `database_url` 属性直接将密码拼接到 URL 中，如果日志记录或调试时打印该 URL，密码会泄露。

```python
@property
def database_url(self) -> str:
    return (
        f"postgresql+asyncpg://{self.database_user}:{self.database_password}"
        f"@{self.database_host}:{self.database_port}/{self.database_name}"
    )
```

**风险**: 密码泄露、安全隐患

**建议修复**:
```python
@property
def database_url(self) -> str:
    # 使用 URL 编码处理特殊字符
    from urllib.parse import quote_plus
    password = quote_plus(self.database_password)
    return (
        f"postgresql+asyncpg://{self.database_user}:{password}"
        f"@{self.database_host}:{self.database_port}/{self.database_name}"
    )
```

---

### 2. 数据库连接缺少 SSL 配置
**文件**: `app/config.py`, `app/database.py`

**问题描述**: 生产环境数据库连接没有强制使用 SSL，存在中间人攻击风险。

**建议修复**:
```python
# config.py 添加
ssl_mode: str = "prefer"  # 或 "require" 用于生产环境

# database.py
engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_size=10,
    max_overflow=20,
    connect_args={"ssl": settings.ssl_mode} if settings.ssl_mode != "disable" else {},
)
```

---

### 3. `datetime.utcnow()` 已弃用
**文件**: `app/models/game.py`

**问题描述**: SQLAlchemy 2.0 中 `datetime.utcnow()` 在 Python 3.12+ 中已弃用，应该使用 `datetime.now(timezone.utc)`。

```python
created_at: Mapped[datetime] = mapped_column(nullable=False, default=datetime.utcnow)
```

**建议修复**:
```python
from datetime import datetime, timezone

created_at: Mapped[datetime] = mapped_column(
    nullable=False, 
    default=lambda: datetime.now(timezone.utc)
)
```

---

## 🟡 中严重级别问题

### 4. 连接池配置缺少超时设置
**文件**: `app/database.py`

**问题描述**: 连接池没有配置连接超时、池回收等关键参数，长时间运行的应用可能遇到连接失效问题。

**建议修复**:
```python
engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,        # 验证连接有效性
    pool_recycle=3600,         # 1小时后回收连接
    pool_timeout=30,           # 获取连接超时时间
    connect_args={
        "timeout": 10,         # 连接超时
        "command_timeout": 30, # 命令执行超时
    },
)
```

---

### 5. 事务处理逻辑问题
**文件**: `app/database.py`

**问题描述**: `get_db()` 函数在 yield 之后自动 commit，这可能导致意外的数据持久化。FastAPI 依赖通常只负责提供 session，commit 应该由调用方控制。

```python
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()  # 这里自动 commit 有风险
        except Exception:
            await session.rollback()
            raise
```

**建议修复**:
```python
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

# 在业务层显式控制事务
async def create_record(db: AsyncSession, ...):
    db.add(record)
    await db.commit()
    await db.refresh(record)
```

---

### 6. 缺少数据库迁移工具配置
**文件**: `requirements.txt`

**问题描述**: 项目使用了 SQLAlchemy 但没有包含 alembic 迁移工具，手动维护迁移脚本容易出错。

**建议**: 添加 `alembic>=1.13.0` 到 requirements.txt

---

### 7. 索引设计优化建议
**文件**: `migrations/001_create_game_records.sql`

**问题描述**: 当前索引设计基本合理，但可以进一步优化排行榜查询。

**当前索引**:
```sql
CREATE INDEX IF NOT EXISTS idx_game_records_leaderboard ON game_records(
    map_size, 
    score DESC, 
    steps ASC
);
```

**建议优化**（添加部分索引和覆盖索引）:
```sql
-- 为高频查询的 map_size 添加部分索引（高分段）
CREATE INDEX IF NOT EXISTS idx_game_records_top_scores ON game_records(
    map_size, 
    score DESC, 
    steps ASC
) WHERE score > 100;

-- 覆盖索引，避免回表查询
CREATE INDEX IF NOT EXISTS idx_game_records_leaderboard_covering ON game_records(
    map_size, 
    score DESC, 
    steps ASC, 
    player_name, 
    created_at
);
```

---

## 🟢 低严重级别问题

### 8. 环境变量缺少验证
**文件**: `app/config.py`

**问题描述**: 关键配置项如 `database_password` 为空时启动应用，会导致运行时错误。

**建议修复**:
```python
from pydantic import field_validator

class Settings(BaseSettings):
    # ... 现有配置 ...
    
    @field_validator('database_password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not v:
            raise ValueError('DATABASE_PASSWORD cannot be empty')
        return v
```

---

### 9. 缺少字段长度验证
**文件**: `app/models/game.py`

**问题描述**: `player_name` 在数据库中限制为 64 字符，但在模型层没有验证。

**建议修复**:
```python
from pydantic import StringConstraints
from typing import Annotated

class GameRecord(Base):
    __tablename__ = "game_records"
    
    player_name: Mapped[str] = mapped_column(
        String(64), 
        nullable=False, 
        index=True,
        comment="玩家名称"
    )
    # ...
```

---

### 10. 元数据字段类型不一致
**文件**: `migrations/001_create_game_records.sql`, `app/models/game.py`

**问题描述**: 迁移脚本中定义了 `metadata JSONB` 字段，但 SQLAlchemy 模型中没有对应字段。

**建议**: 在模型中添加（如果计划使用）:
```python
from sqlalchemy import JSON

class GameRecord(Base):
    # ... 现有字段 ...
    metadata: Mapped[dict | None] = mapped_column(JSON, default=None)
```

---

## ✅ 代码亮点

1. **SQLAlchemy 2.0 语法规范**: 正确使用 `Mapped` 和 `mapped_column`
2. **异步支持完善**: 正确使用了 `create_async_engine` 和 `AsyncSession`
3. **约束设计合理**: 使用 `CheckConstraint` 确保数据完整性
4. **索引设计**:  leaderboard 复合索引考虑了查询场景
5. **依赖版本**: 使用了较新的稳定版本

---

## 整体评价

| 维度 | 评分 | 说明 |
|------|------|------|
| 代码规范 | ⭐⭐⭐⭐☆ | SQLAlchemy 2.0 语法正确，结构清晰 |
| 安全性 | ⭐⭐⭐☆☆ | 缺少 SSL 配置，密码处理需改进 |
| 性能 | ⭐⭐⭐⭐☆ | 连接池和索引设计基本合理 |
| 可维护性 | ⭐⭐⭐☆☆ | 缺少 alembic，事务处理需优化 |

**总体评价**: 代码结构良好，采用了现代 SQLAlchemy 2.0 语法，异步处理正确。但存在几个需要关注的安全和稳定性问题，建议在生产部署前修复高严重级别问题。

---

## 修复优先级建议

1. **立即修复**: 🔴 高严重级别问题（1-3）
2. **本周修复**: 🟡 中严重级别问题（4-7）
3. **后续优化**: 🟢 低严重级别问题（8-10）
