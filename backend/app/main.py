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

# WebSocket 独立路由
app.add_api_websocket_route("/ws", websocket_endpoint)

# 静态文件 - 检查多个可能的位置
dist_dir = None
possible_paths = [
    os.path.join(os.path.dirname(os.path.dirname(__file__)), "dist"),  # backend/dist
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "dist"),  # /app/dist
    os.path.join(os.path.dirname(__file__), "dist"),  # app/dist
    "dist",  # 当前目录
    "../dist",  # 上级目录
]

for path in possible_paths:
    abs_path = os.path.abspath(path)
    if os.path.exists(abs_path):
        dist_dir = abs_path
        print(f"[INFO] Found static files at: {dist_dir}")
        break

if dist_dir:
    app.mount("/", StaticFiles(directory=dist_dir, html=True), name="static")
else:
    print("[WARNING] No static files found!")


if __name__ == "__main__":
    import uvicorn
    from app.config import settings
    uvicorn.run("app.main:app", host=settings.app_host, port=settings.app_port, reload=settings.debug)
