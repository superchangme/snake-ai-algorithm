from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

from app.config import settings

# 根据 ssl_mode 配置 SSL 参数
ssl_config = {}
if settings.ssl_mode != "disable":
    ssl_config = {"ssl": settings.ssl_mode}

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
        **ssl_config,
    },
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
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
