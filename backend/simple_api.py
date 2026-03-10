"""Simple greedy snake AI API - with better tie-breaking"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json

UP = (0, -1)
DOWN = (0, 1)
LEFT = (-1, 0)
RIGHT = (1, 0)
DIRS = [RIGHT, UP, DOWN, LEFT]  # 优先 RIGHT

PORT = 8087

class SnakeAPIHandler(BaseHTTPRequestHandler):
    def _send_json_response(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def do_OPTIONS(self):
        self._send_json_response({})
    
    def do_GET(self):
        if self.path == '/test':
            self._send_json_response({"status": "ok"})
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
        
        if '/move' in self.path:
            head_x = data.get('headX', 0)
            head_y = data.get('headY', 0)
            body = data.get('body', [])
            food_x = data.get('foodX', 0)
            food_y = data.get('foodY', 0)
            size = data.get('size', 8)
            
            head = (head_x, head_y)
            food = (food_x, food_y)
            snake = [head]
            for p in body:
                if isinstance(p, dict):
                    snake.append((p.get('x', 0), p.get('y', 0)))
                elif isinstance(p, list):
                    snake.append((p[0], p[1]))
            
            snake_set = set(snake)
            
            # 找所有安全方向
            safe_dirs = []
            for d in DIRS:
                nx, ny = head[0] + d[0], head[1] + d[1]
                if 0 <= nx < size and 0 <= ny < size and (nx, ny) not in snake_set:
                    safe_dirs.append(d)
            
            if not safe_dirs:
                direction = RIGHT
            else:
                # 选择离食物几何距离最近的方向
                best_dir = None
                best_dist = float('inf')
                for d in safe_dirs:
                    nx, ny = head[0] + d[0], head[1] + d[1]
                    dist = abs(nx - food[0]) + abs(ny - food[1])
                    if dist < best_dist:
                        best_dist = dist
                        best_dir = d
                direction = best_dir if best_dir else RIGHT
            
            dir_map = {(0, -1): "UP", (0, 1): "DOWN", (-1, 0): "LEFT", (1, 0): "RIGHT"}
            
            self._send_json_response({
                "direction": dir_map.get(direction, "RIGHT"),
                "food_distance": abs(head_x - food_x) + abs(head_y - food_y)
            })
        else:
            self._send_json_response({"error": "Not found"}, 404)
    
    def log_message(self, format, *args):
        pass

print(f"🚀 Simple Greedy Snake AI (端口 {PORT})")
server = HTTPServer(('localhost', PORT), SnakeAPIHandler)
server.serve_forever()
