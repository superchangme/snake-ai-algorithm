"""
FastAPI 后端 - 贪吃蛇 AI
同时提供 HTTP API 和 WebSocket 服务（同一端口）
"""

import os
import json
import uuid
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse


# MIME 类型映射
def get_content_type(path: str) -> str:
    ext = path.split('.')[-1]
    types = {
        'js': 'application/javascript',
        'css': 'text/css',
        'html': 'text/html',
        'json': 'application/json',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
        'ico': 'image/x-icon',
    }
    return types.get(ext, 'text/plain')



from backend.phase17_tweak import TweakAI

app = FastAPI()

# 静态文件目录
DIST_DIR = os.path.join(os.path.dirname(__file__), "dist")

# 游戏实例缓存
ai_cache = {}

PORT = int(os.environ.get("PORT", 8080))


def get_ai(width, height):
    """获取或创建 AI 实例"""
    key = f"{width}x{height}"
    if key not in ai_cache:
        ai_cache[key] = TweakAI(width, height)
    return ai_cache[key]


# ============ HTTP API ============

@app.get("/api")
async def get_api_info():
    """API 信息"""
    return {"status": "ok", "algorithm": "phase17-tweak"}


@app.post("/api")
async def post_api_move(data: dict):
    """处理移动请求"""
    width = data.get("width", 10)
    height = data.get("height", 10)
    game_id = data.get("game_id")
    
    # 解析蛇身
    snake_body = data.get("snake", [])
    snake_positions = [(p["x"], p["y"]) for p in snake_body]
    
    # 解析食物
    food_pos = data.get("food", {"x": 0, "y": 0})
    food_position = (food_pos["x"], food_pos["y"])
    
    # 获取 AI
    ai = get_ai(width, height)
    
    # 创建临时蛇对象用于 AI 计算
    class TempSnake:
        def __init__(self, body):
            self.body = body
    
    class TempFood:
        def __init__(self, pos):
            self.position = pos
    
    snake = TempSnake(snake_positions)
    food = TempFood(food_position)
    
    # 获取方向
    direction = ai.get_direction(snake_positions, food_position)
    
    # 方向映射
    dir_map = {
        (0, -1): "UP",
        (0, 1): "DOWN",
        (-1, 0): "LEFT",
        (1, 0): "RIGHT"
    }
    
    if not game_id:
        game_id = str(uuid.uuid4())
    
    return {
        "direction": dir_map.get(direction, "DOWN"),
        "game_id": game_id
    }


# ============ WebSocket ============

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket 端点"""
    await websocket.accept()
    
    # 为每个连接创建新的 AI 实例
    ai_instance = None
    game_id = str(uuid.uuid4())
    
    try:
        while True:
            # 接收消息
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
            except json.JSONDecodeError:
                continue
            
            msg_type = msg.get("type")
            
            if msg_type == "init":
                # 初始化
                width = msg.get("width", 10)
                height = msg.get("height", 10)
                ai_instance = TweakAI(width, height)
                game_id = msg.get("game_id", str(uuid.uuid4()))
                
                await websocket.send_json({
                    "status": "initialized",
                    "game_id": game_id
                })
                
            elif msg_type == "move" and ai_instance:
                # 处理移动
                snake_body = msg.get("snake", [])
                snake_positions = [(p["x"], p["y"]) for p in snake_body]
                
                food_pos = msg.get("food", {"x": 0, "y": 0})
                food_position = (food_pos["x"], food_pos["y"])
                
                class TempSnake:
                    def __init__(self, body):
                        self.body = body
                
                class TempFood:
                    def __init__(self, pos):
                        self.position = pos
                
                snake = TempSnake(snake_positions)
                food = TempFood(food_position)
                
                direction = ai_instance.get_direction(snake_positions, food_position)
                
                dir_map = {
                    (0, -1): "UP",
                    (0, 1): "DOWN",
                    (-1, 0): "LEFT",
                    (1, 0): "RIGHT"
                }
                
                await websocket.send_json({
                    "direction": dir_map.get(direction, "DOWN"),
                    "game_id": game_id
                })
                
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WS Error: {e}")
        try:
            await websocket.close()
        except:
            pass


# ============ 静态文件服务 ============

# 使用 FastAPI StaticFiles 更可靠地服务静态文件
app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")


@app.get("/")
async def serve_index():
    """服务 index.html"""
    index_path = os.path.join(DIST_DIR, "index.html")
    return FileResponse(index_path, media_type="text/html")


@app.get("/{path:path}")
async def serve_static(path: str):
    """SPA 路由 fallback - 所有未匹配路径返回 index.html"""
    # API 路径不处理
    if path.startswith("api"):
        return {"error": "Not found"}
    
    # 返回 index.html 让 SPA 处理路由
    index_path = os.path.join(DIST_DIR, "index.html")
    return FileResponse(index_path, media_type="text/html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
