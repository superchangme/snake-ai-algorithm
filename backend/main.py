#!/usr/bin/env python3
"""
FastAPI Snake AI Server
Provides GET /api and POST /api endpoints for snake AI moves
"""

import os
import uuid
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

from phase17_tweak import TweakAI

# Global AI cache
ai_cache = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    print("FastAPI Snake AI Server starting...")
    yield
    print("FastAPI Snake AI Server shutting down...")


app = FastAPI(
    title="Snake AI API",
    description="FastAPI-based Snake AI move prediction",
    version="1.0.0",
    lifespan=lifespan,
)


# Request/Response models
class SnakeSegment(BaseModel):
    x: int
    y: int


class MoveRequest(BaseModel):
    snake: List[SnakeSegment]
    food: SnakeSegment
    width: int
    height: int


class MoveResponse(BaseModel):
    direction: str
    algorithm: str = "phase17-tweak"


class StatusResponse(BaseModel):
    status: str
    algorithm: str
    ws_port: int


@app.get("/api", response_model=StatusResponse)
async def get_status():
    """GET /api - Returns server status"""
    return StatusResponse(
        status="ok",
        algorithm="phase17-tweak",
        ws_port=8080
    )


@app.post("/api", response_model=MoveResponse)
async def predict_move(request: MoveRequest):
    """POST /api - Predict next move based on snake state"""
    try:
        # Convert request to internal format
        snake = [(seg.x, seg.y) for seg in request.snake]
        food = (request.food.x, request.food.y)
        width = request.width
        height = request.height
        
        # Get or create AI instance for this size
        cache_key = f"ai_{width}_{height}"
        if cache_key not in ai_cache:
            ai_cache[cache_key] = TweakAI(width=width, height=height)
        
        ai = ai_cache[cache_key]
        
        # Get direction
        direction = ai.get_direction(snake, food)
        
        # Map direction to string
        dir_map = {
            (0, -1): "UP",
            (0, 1): "DOWN", 
            (-1, 0): "LEFT",
            (1, 0): "RIGHT"
        }
        dir_name = dir_map.get(direction, "RIGHT")
        
        return MoveResponse(direction=dir_name)
        
    except Exception as e:
        print(f"Error predicting move: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


# Also support /init and /move for compatibility with existing client
class InitRequest(BaseModel):
    size: int = 8
    headX: int = 4
    headY: int = 4
    body: List[dict] = []


class InitResponse(BaseModel):
    status: str
    game_id: str
    size: int


@app.post("/init", response_model=InitResponse)
async def init_game(request: InitRequest):
    """Initialize a new game"""
    size = request.size
    head_x = request.headX
    head_y = request.headY
    body = request.body
    
    cache_key = f"ai_{size}"
    if cache_key not in ai_cache:
        ai_cache[cache_key] = TweakAI(width=size, height=size)
    
    ai = ai_cache[cache_key]
    snake = [(head_x, head_y)]
    for p in body:
        if isinstance(p, dict):
            snake.append((p.get("x", 0), p.get("y", 0)))
        elif isinstance(p, (list, tuple)) and len(p) >= 2:
            snake.append((p[0], p[1]))
    
    ai.reset_game(snake)
    
    game_id = str(uuid.uuid4())
    return InitResponse(status="initialized", game_id=game_id, size=size)


class MoveRequestLegacy(BaseModel):
    headX: int
    headY: int
    body: List[dict]
    foodX: int
    foodY: int
    size: int = 8


@app.post("/move")
async def move_legacy(request: MoveRequestLegacy):
    """Legacy /move endpoint for compatibility"""
    try:
        head_x = request.headX
        head_y = request.headY
        body = request.body
        food_x = request.foodX
        food_y = request.foodY
        size = request.size

        snake = [(head_x, head_y)]
        for p in body:
            if isinstance(p, dict):
                snake.append((p.get("x", 0), p.get("y", 0)))
            elif isinstance(p, (list, tuple)) and len(p) >= 2:
                snake.append((p[0], p[1]))

        cache_key = f"ai_{size}"
        if cache_key not in ai_cache:
            ai_cache[cache_key] = TweakAI(width=size, height=size)
        ai = ai_cache[cache_key]

        direction = ai.get_direction(snake, (food_x, food_y))
        dir_map = {(0, -1): "UP", (0, 1): "DOWN", (-1, 0): "LEFT", (1, 0): "RIGHT"}
        dir_name = dir_map.get(direction, "RIGHT")
        
        return {"direction": dir_name}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8080))
    print(f"Starting FastAPI Snake AI Server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
