"""AI 算法路由 - 合并自 main.py"""
import os
import sys
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import List, Dict

# 添加 backend 目录到路径
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

try:
    from phase17_tweak import TweakAI
except ImportError as e:
    print(f"[ERROR] Failed to import TweakAI: {e}")
    # 创建一个模拟类用于测试
    class TweakAI:
        def __init__(self, width=10, height=10):
            self.width = width
            self.height = height
        
        def get_direction(self, snake, food):
            # 简单的朝向食物移动
            head = snake[0]
            fx, fy = food
            hx, hy = head
            
            if fx > hx:
                return (1, 0)  # RIGHT
            elif fx < hx:
                return (-1, 0)  # LEFT
            elif fy > hy:
                return (0, 1)  # DOWN
            else:
                return (0, -1)  # UP
        
        def reset_game(self, snake):
            pass

router = APIRouter(prefix="/api", tags=["ai"])

# AI 缓存
ai_cache: Dict[str, TweakAI] = {}

class MoveRequest(BaseModel):
    snake: List[dict]
    food: dict
    width: int = 10
    height: int = 10
    game_id: str = None

class MoveResponse(BaseModel):
    direction: str
    algorithm: str = "phase17-tweak"


@router.get("")
async def get_api_info():
    """API 信息"""
    return {"status": "ok", "algorithm": "phase17-tweak", "ws_port": None}


@router.post("", response_model=MoveResponse)
async def post_api_move(data: MoveRequest):
    """处理移动请求"""
    width = data.width
    height = data.height
    
    # 解析蛇身
    snake_body = [(s["x"], s["y"]) for s in data.snake]
    food_pos = (data.food["x"], data.food["y"])
    
    # 获取或创建 AI
    cache_key = f"{width}x{height}"
    if cache_key not in ai_cache:
        ai_cache[cache_key] = TweakAI(width, height)
    
    ai = ai_cache[cache_key]
    direction = ai.get_direction(snake_body, food_pos)
    
    # 转换方向
    dir_map = {(0, -1): "UP", (0, 1): "DOWN", (-1, 0): "LEFT", (1, 0): "RIGHT"}
    dir_name = dir_map.get(direction, "RIGHT")
    
    return MoveResponse(direction=dir_name)


@router.post("/init")
async def init_game(data: dict):
    """初始化游戏"""
    size = data.get("size", 8)
    head_x = data.get("headX", size // 2)
    head_y = data.get("headY", size // 2)
    body = data.get("body", [])
    
    cache_key = f"{size}x{size}"
    if cache_key not in ai_cache:
        ai_cache[cache_key] = TweakAI(size, size)
    
    ai = ai_cache[cache_key]
    snake = [(head_x, head_y)]
    for p in body:
        if isinstance(p, dict):
            snake.append((p.get("x", 0), p.get("y", 0)))
        elif isinstance(p, (list, tuple)) and len(p) >= 2:
            snake.append((p[0], p[1]))
    
    ai.reset_game(snake)
    game_id = str(uuid.uuid4())
    
    return {"status": "initialized", "game_id": game_id, "size": size}


@router.post("/move")
async def move(data: dict):
    """获取移动方向"""
    head_x = data.get("headX", 0)
    head_y = data.get("headY", 0)
    body = data.get("body", [])
    food_x = data.get("foodX", 0)
    food_y = data.get("foodY", 0)
    size = data.get("size", 8)
    
    snake = [(head_x, head_y)]
    for p in body:
        if isinstance(p, dict):
            snake.append((p.get("x", 0), p.get("y", 0)))
        elif isinstance(p, (list, tuple)) and len(p) >= 2:
            snake.append((p[0], p[1]))
    
    cache_key = f"{size}x{size}"
    if cache_key not in ai_cache:
        ai_cache[cache_key] = TweakAI(size, size)
    
    ai = ai_cache[cache_key]
    direction = ai.get_direction(snake, (food_x, food_y))
    
    dir_map = {(0, -1): "UP", (0, 1): "DOWN", (-1, 0): "LEFT", (1, 0): "RIGHT"}
    dir_name = dir_map.get(direction, "RIGHT")
    
    return {"direction": dir_name, "algorithm": "phase17-tweak"}


@router.websocket("/ws")  # 路径: /api/ws
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket 连接"""
    await websocket.accept()
    ai_instance = None
    
    try:
        while True:
            message = await websocket.receive_text()
            import json
            data = json.loads(message)
            action = data.get("action")
            
            if action == "init":
                size = data.get("size", 8)
                head_x = data.get("headX", size // 2)
                head_y = data.get("headY", size // 2)
                body = data.get("body", [])
                
                cache_key = f"ai_{size}"
                if cache_key not in ai_cache:
                    ai_cache[cache_key] = TweakAI(size, size)
                
                ai_instance = ai_cache[cache_key]
                snake = [(head_x, head_y)]
                for p in body:
                    if isinstance(p, dict):
                        snake.append((p.get("x", 0), p.get("y", 0)))
                    elif isinstance(p, (list, tuple)) and len(p) >= 2:
                        snake.append((p[0], p[1]))
                ai_instance.reset_game(snake)
                
                await websocket.send_json({
                    "status": "initialized",
                    "game_id": str(uuid.uuid4())
                })
            
            elif action == "move":
                head_x = data.get("headX", 0)
                head_y = data.get("headY", 0)
                body = data.get("body", [])
                food_x = data.get("foodX", 0)
                food_y = data.get("foodY", 0)
                size = data.get("size", 8)
                
                snake = [(head_x, head_y)]
                for p in body:
                    if isinstance(p, dict):
                        snake.append((p.get("x", 0), p.get("y", 0)))
                    elif isinstance(p, (list, tuple)) and len(p) >= 2:
                        snake.append((p[0], p[1]))
                
                cache_key = f"ai_{size}"
                if cache_key not in ai_cache:
                    ai_cache[cache_key] = TweakAI(size, size)
                
                ai = ai_cache[cache_key]
                direction = ai.get_direction(snake, (food_x, food_y))
                
                dir_map = {(0, -1): "UP", (0, 1): "DOWN", (-1, 0): "LEFT", (1, 0): "RIGHT"}
                dir_name = dir_map.get(direction, "RIGHT")
                
                await websocket.send_json({"direction": dir_name})
                
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[WS] Error: {e}")
