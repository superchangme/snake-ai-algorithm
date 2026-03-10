#!/usr/bin/env python3
"""
Phase 4 Hamilton Snake AI API Server - 调试版
"""

import json
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn

PORT = 8087

sys.path.insert(0, '/Users/tom.chang/code/ai_projects/shake-py/claude-version')
from phase4_hamilton_ai import HamiltonSnakeAI

ai_cache = {}

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    allow_reuse_address = True
    daemon_threads = True

class HamiltonHandler(BaseHTTPRequestHandler):
    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Accept')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def do_OPTIONS(self):
        self._send_json({"status": "ok"})
    
    def do_GET(self):
        self._send_json({"status": "ok", "algorithm": "hamilton"})
    
    def do_POST(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            data = json.loads(self.rfile.read(length).decode())
        except Exception as e:
            self._send_json({"error": str(e)}, 400)
            return
        
        if self.path == '/init':
            size = data.get('size', 8)
            cache_key = f"ai_{size}"
            if cache_key not in ai_cache:
                ai_cache[cache_key] = HamiltonSnakeAI(width=size, height=size)
            print(f"[INIT] size={size}")
            self._send_json({"status": "initialized", "size": size})
        
        elif self.path == '/move':
            try:
                head_x = data.get('headX', 0)
                head_y = data.get('headY', 0)
                body = data.get('body', [])
                food_x = data.get('foodX', 0)
                food_y = data.get('foodY', 0)
                size = data.get('size', 8)
                
                # 构建蛇身
                snake = [(head_x, head_y)]
                for p in body:
                    if isinstance(p, dict):
                        snake.append((p.get('x', 0), p.get('y', 0)))
                    elif isinstance(p, (list, tuple)) and len(p) >= 2:
                        snake.append((p[0], p[1]))
                
                food = (food_x, food_y)
                
                print(f"[MOVE] head=({head_x},{head_y}) snake={snake[:4]}... food={food} size={size}")
                
                # 获取或创建 AI 实例
                cache_key = f"ai_{size}"
                if cache_key not in ai_cache:
                    ai_cache[cache_key] = HamiltonSnakeAI(width=size, height=size)
                ai = ai_cache[cache_key]
                
                direction = ai.get_direction(snake, food)
                
                dir_map = {
                    (0, -1): "UP",
                    (0, 1): "DOWN",
                    (-1, 0): "LEFT",
                    (1, 0): "RIGHT"
                }
                
                dir_name = dir_map.get(direction, "RIGHT")
                print(f"       -> direction={direction} -> {dir_name}")
                
                self._send_json({
                    "direction": dir_name,
                    "algorithm": "hamilton"
                })
                
            except Exception as e:
                print(f"[ERROR] {e}")
                import traceback
                traceback.print_exc()
                self._send_json({"error": str(e), "direction": "RIGHT"})
        else:
            self._send_json({"error": "Not found"}, 404)

def main():
    print(f"🚀 Phase 4 Hamilton API (调试版) - 端口 {PORT}")
    server = ThreadedHTTPServer(('127.0.0.1', PORT), HamiltonHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()

if __name__ == "__main__":
    main()
