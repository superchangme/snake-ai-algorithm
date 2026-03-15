import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.database import engine, Base
from app.routers import health_router, games_router, ai_router
from app.routers.ai import websocket_endpoint


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时创建数据库表
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield
    
    # 关闭时释放连接
    await engine.dispose()


app = FastAPI(
    title="Snake AI API",
    version="2.0.0",
    lifespan=lifespan,
)

# API 路由
app.include_router(health_router)
app.include_router(games_router)
app.include_router(ai_router)

# WebSocket 独立路由（前端直接连 /ws）
app.add_api_websocket_route("/ws", websocket_endpoint)

# 静态文件 + SPA 兜底
dist_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "dist")
if os.path.exists(dist_dir):
    # html=True 会自动处理 SPA 路由
    app.mount("/", StaticFiles(directory=dist_dir, html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    from app.config import settings
    uvicorn.run("app.main:app", host=settings.app_host, port=settings.app_port, reload=settings.debug)
