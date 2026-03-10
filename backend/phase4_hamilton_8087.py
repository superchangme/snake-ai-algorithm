#!/usr/bin/env python3
"""
Phase 4 Hamilton Snake AI API Server
端口: 8087 (完整版 - 带CORS)
"""


import json as _json
from datetime import datetime as _datetime

LOG_FILE = "/Users/tom.chang/code/ai_projects/shake-py/claude-version/actions.json"

def _log_action(action_type, request, response):
    try:
        with open(LOG_FILE, "r") as f:
            log_data = _json.load(f)
    except:
        log_data = {"actions": [], "game_state": []}
    
    log_data["actions"].append({
        "timestamp": _datetime.now().isoformat(),
        "type": action_type,
        "request": request,
        "response": response
    })
    
    with open(LOG_FILE, "w") as f:
        _json.dump(log_data, f, indent=2)


from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import random

PORT = 8087

# 存储游戏状态
games = {}

class Phase4APIHandler(BaseHTTPRequestHandler):
    def _send_json_response(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        parsed = self.path.split('?')[0]
        
        if parsed == '/status':
            self._send_json_response({
                "status": "ok",
                "service": "Phase 4 Hamilton AI",
                "port": PORT,
                "algorithm": "Phase 4 Hamilton",
                "description": "满分算法 - 理论64分",
                "cors": "enabled"
            })
        elif parsed == '/test':
            from phase4_hamilton_ai import HamiltonSnakeAI
            
            ai = HamiltonSnakeAI(8, 8)
            snake = [(4, 4), (3, 4), (2, 4)]
            
            ss = set(snake)
            empty = [(x, y) for x in range(8) for y in range(8) if (x, y) not in ss]
            food = random.choice(empty) if empty else None
            
            steps = 0
            while steps < 50000:
                d = ai.get_direction(snake, food)
                nh = (snake[0][0] + d[0], snake[0][1] + d[1])
                
                if not (0 <= nh[0] < 8 and 0 <= nh[1] < 8):
                    break
                if nh in set(snake[:-1]):
                    break
                
                snake.insert(0, nh)
                if nh == food:
                    ss = set(snake)
                    empty = [(x, y) for x in range(8) for y in range(8) if (x, y) not in ss]
                    if empty:
                        food = random.choice(empty)
                    else:
                        break
                else:
                    snake.pop()
                steps += 1
            
            self._send_json_response({
                "final_length": len(snake),
                "steps": steps,
                "score": len(snake) - 3
            })
        else:
            self._send_json_response({"error": "Not found"}, 404)
    
    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body_data = self.rfile.read(content_length)
            data = json.loads(body_data.decode())
        except:
            self._send_json_response({"error": "Invalid JSON"}, 400)
            return
        
        parsed = self.path.split('?')[0]
        
        if parsed == '/init':
            game_id = data.get('game_id', 'default')
            grid_size = data.get('size', 10)
            
            # 创建新游戏
            from phase4_hamilton_ai import HamiltonSnakeAI
            ai = HamiltonSnakeAI(width=grid_size, height=grid_size)
            
            mid = grid_size // 2
            games[game_id] = {
                'ai': ai,
                'snake': [(mid, mid), (mid - 1, mid), (mid - 2, mid)],
                'score': 0
            }
            
            self._send_json_response({
                "status": "initialized",
                "game_id": game_id,
                "message": "Phase 4 Hamilton AI 已初始化"
            })
        
        elif parsed == '/move':
            try:
                game_id = data.get('game_id', 'default')
                head_x = data.get('headX', 0)
                head_y = data.get('headY', 0)
                body = data.get('body', [])  # 这是蛇身（不含头）！
                food_x = data.get('foodX', 0)
                food_y = data.get('foodY', 0)
                grid_size = data.get('size', 8)
                
                # 转换body格式
                snake = []
                for p in body:
                    if isinstance(p, dict):
                        snake.append((p.get('x', 0), p.get('y', 0)))
                    elif isinstance(p, list) and len(p) >= 2:
                        snake.append((p[0], p[1]))
                    elif isinstance(p, tuple) and len(p) >= 2:
                        snake.append(p)
                
                # 前端发送的是：head + body(不含头)
                # 需要合并成完整蛇身
                snake = [(head_x, head_y)] + snake
                
                if len(snake) < 2:
                    self._send_json_response({"direction": "RIGHT", "error": "Snake too short"})
                    return
                
                food = (food_x, food_y)
                
                # 获取AI决策 - 根据网格大小创建
                if game_id in games:
                    ai = games[game_id]['ai']
                else:
                    from phase4_hamilton_ai import HamiltonSnakeAI
                    ai = HamiltonSnakeAI(width=grid_size, height=grid_size)
                
                direction = ai.get_direction(snake, food)
                
                # 转换方向
                dir_map = {
                    (0, -1): "UP",
                    (0, 1): "DOWN", 
                    (-1, 0): "LEFT",
                    (1, 0): "RIGHT"
                }
                
                dir_name = dir_map.get(direction, "RIGHT")
                
                self._send_json_response({
                    "direction": dir_name,
                    "food_distance": abs(head_x - food_x) + abs(head_y - food_y)
                })
                
            except Exception as e:
                self._send_json_response({"error": str(e), "direction": "RIGHT"}, 500)
        
        else:
            self._send_json_response({"error": "Not found"}, 404)
    
    def log_message(self, format, *args):
        pass

def main():
    print(f"🚀 Phase 4 Hamilton API 启动 (端口 {PORT})")
    print(f"   CORS: 已启用")
    print(f"   /init - 初始化游戏")
    print(f"   /move - 获取移动方向")
    print(f"   /test - 完整测试")
    
    server = HTTPServer(('localhost', PORT), Phase4APIHandler)
    print(f"\n✅ 运行中: http://localhost:{PORT}")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()

if __name__ == "__main__":
    main()