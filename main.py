"""
FastAPI 后端 - 贪吃蛇 AI
同时提供 HTTP API 和 WebSocket 服务（同一端口）
"""

import os
import json
import uuid
import sys
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
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
async def post_api_move(request: Request):
    """处理移动请求"""
    body = await request.json()
    
    # Debug
    sys.stderr.write(f"DEBUG: received body = {body}\n")
    
    # 安全提取数值
    try:
        width = int(body.get("width", 10))
    except (TypeError, ValueError):
        width = 10
    try:
        height = int(body.get("height", 10))
    except (TypeError, ValueError):
        height = 10
    
    game_id = body.get("game_id")
    
    # 解析蛇身
    snake_body = body.get("snake", [])
    snake_positions = [(p["x"], p["y"]) for p in snake_body]
    
    # 解析食物
    food_pos = body.get("food", {"x": 0, "y": 0})
    food_position = (food_pos["x"], food_pos["y"])
    
    # 获取 AI
    ai = get_ai(width, height)
    
    # 获取方向 - 传入列表而不是对象
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
# 只在 dist 存在时挂载静态文件（生产模式）
if os.path.exists(os.path.join(DIST_DIR, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")
else:
    # dev 模式：静默跳过静态文件（前端独立运行在 3000）
    pass


@app.get("/")
async def serve_index():
    """服务 index.html（仅生产模式需要）"""
    index_path = os.path.join(DIST_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path, media_type="text/html")
    else:
        # dev 模式：返回简单消息
        return {"message": "API Running - use frontend on port 3000"}


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
