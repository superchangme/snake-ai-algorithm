"""
Phase 11 Unified Server
支持所有网格尺寸
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
from phase11_hybrid_v2 import HybridAI

ai_instance = None
current_size = None

class SnakeHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8')
        
        try:
            data = json.loads(body)
        except:
            self.send_error(400, "Invalid JSON")
            return
        
        if self.path == '/move':
            try:
                global ai_instance, current_size
                
                head_x = data['headX']
                head_y = data['headY']
                body_list = data.get('body', [])
                food_x = data['foodX']
                food_y = data['foodY']
                size = data.get('size', 10)
                
                # 构建蛇
                snake = [(head_x, head_y)]
                for p in body_list:
                    snake.append((p['x'], p['y']))
                
                food = (food_x, food_y)
                
                # 初始化或更新 AI
                if ai_instance is None or current_size != size:
                    ai_instance = HybridAI(size, size)
                    current_size = size
                
                # 获取方向
                direction = ai_instance.get_direction(snake, food)
                
                if direction:
                    dir_map = {
                        (0, -1): 'UP',
                        (0, 1): 'DOWN',
                        (-1, 0): 'LEFT',
                        (1, 0): 'RIGHT'
                    }
                    result = {'direction': dir_map.get(direction, 'RIGHT')}
                else:
                    result = {'direction': 'RIGHT'}
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(result).encode())
                
            except Exception as e:
                import traceback
                traceback.print_exc()
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
        
        elif self.path == '/init':
            result = {'status': 'ok', 'game_id': 'phase11'}
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
        
        elif self.path == '/gameover':
            print(f"[Game Over] Score: {data.get('score')}, Steps: {data.get('steps')}, Food: {data.get('food_eaten')}")
            result = {'status': 'recorded'}
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
        
        else:
            self.send_error(404)
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def log_message(self, format, *args):
        pass

if __name__ == '__main__':
    server = HTTPServer(('localhost', 8090), SnakeHandler)
    print("Phase 11 Unified Server running on port 8090...")
    server.serve_forever()
