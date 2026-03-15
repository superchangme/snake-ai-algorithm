from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.database import engine
from app.routers import health_router, games_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时
    yield
    # 关闭时
    await engine.dispose()


app = FastAPI(
    title="Snake AI API",
    description="贪食蛇游戏后端 API",
    version="1.0.0",
    lifespan=lifespan,
)

# 注册路由
app.include_router(health_router)
app.include_router(games_router)


if __name__ == "__main__":
    import uvicorn
    from app.config import settings
    
    uvicorn.run(
        "app.main:app",
        host=settings.app_host,
        port=settings.app_port,
        reload=settings.debug
    )
