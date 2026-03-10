"""
Phase 10 Server - 虚拟蛇模拟算法
支持奇数网格，理论上限 mn-1
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
from phase10_virtual_snake_v2 import VirtualSnakeAI
import re

# 全局 AI 实例，按尺寸缓存
ai_instances = {}

def get_ai(width, height):
    key = (width, height)
    if key not in ai_instances:
        ai_instances[key] = VirtualSnakeAI(width, height)
    return ai_instances[key]

class SnakeHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        # 解析请求
        if '/next' in self.path:
            try:
                # 从查询参数获取数据
                params = {}
                if '?' in self.path:
                    query = self.path.split('?')[1]
                    for pair in query.split('&'):
                        if '=' in pair:
                            k, v = pair.split('=', 1)
                            params[k] = v
                
                # 获取参数
                snake_str = params.get('snake', '[]')
                food_str = params.get('food', '(0,0)')
                width = int(params.get('width', 10))
                height = int(params.get('height', 10))
                
                # 解析 snake
                snake = json.loads(snake_str)
                if isinstance(snake[0], list):
                    snake = [tuple(p) for p in snake]
                else:
                    snake = eval(snake_str)
                    snake = [tuple(p) if isinstance(p, list) else p for p in snake]
                
                # 解析 food
                if food_str.startswith('('):
                    food = eval(food_str)
                else:
                    food = json.loads(food_str)
                    if isinstance(food, list):
                        food = tuple(food)
                
                # 获取 AI
                ai = get_ai(width, height)
                
                # 获取方向
                direction = ai.get_direction(snake, food)
                
                if direction:
                    dir_map = {
                        (0, -1): 'up',
                        (0, 1): 'down',
                        (-1, 0): 'left',
                        (1, 0): 'right'
                    }
                    result = {'direction': dir_map.get(direction, 'right')}
                else:
                    result = {'direction': 'right', 'error': 'no valid direction'}
                
                # 返回结果
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(result).encode())
                
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        pass  # 禁用日志

if __name__ == '__main__':
    server = HTTPServer(('localhost', 8089), SnakeHandler)
    print("Phase 10 Server running on port 8089...")
    server.serve_forever()
