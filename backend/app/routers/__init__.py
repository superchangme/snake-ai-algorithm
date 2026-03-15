from app.routers.games import router as games_router
from app.routers.health import router as health_router
from app.routers.ai import router as ai_router

__all__ = ["games_router", "health_router", "ai_router"]
