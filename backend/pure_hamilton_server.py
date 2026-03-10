#!/usr/bin/env python3
"""Pure Hamilton Snake AI API Server - 调试版"""

import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn

PORT = 8087

def build_hamilton_path(size):
    path = []
    order = {}
    for y in range(size):
        if y % 2 == 0:
            for x in range(size):
                path.append((x, y))
                order[(x, y)] = len(path) - 1
        else:
            for x in range(size - 1, -1, -1):
                path.append((x, y))
                order[(x, y)] = len(path) - 1
    return path, order

path_cache = {}

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
        self._send_json({"status": "ok", "algorithm": "pure-hamilton"})
    
    def do_POST(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            data = json.loads(self.rfile.read(length).decode())
        except Exception as e:
            self._send_json({"error": str(e)}, 400)
            return
        
        if self.path == '/init':
            size = data.get('size', 8)
            if size not in path_cache:
                path_cache[size] = build_hamilton_path(size)
            print(f"[INIT] size={size}")
            self._send_json({"status": "initialized", "size": size})
        
        elif self.path == '/move':
            try:
                head_x = data.get('headX', 0)
                head_y = data.get('headY', 0)
                size = data.get('size', 8)
                
                if size not in path_cache:
                    path_cache[size] = build_hamilton_path(size)
                path, order = path_cache[size]
                
                current_idx = order.get((head_x, head_y), 0)
                next_pos = path[(current_idx + 1) % len(path)]
                
                dx = next_pos[0] - head_x
                dy = next_pos[1] - head_y
                
                dir_map = {
                    (0, -1): "UP",
                    (0, 1): "DOWN",
                    (-1, 0): "LEFT",
                    (1, 0): "RIGHT"
                }
                
                dir_name = dir_map.get((dx, dy), "RIGHT")
                print(f"[MOVE] head=({head_x},{head_y}) -> next={next_pos} -> direction={dir_name}")
                
                self._send_json({
                    "direction": dir_name,
                    "algorithm": "pure-hamilton"
                })
                
            except Exception as e:
                print(f"[ERROR] {e}")
                self._send_json({"error": str(e), "direction": "RIGHT"})
        else:
            self._send_json({"error": "Not found"}, 404)

def main():
    print(f"🚀 Pure Hamilton API (调试版) - 端口 {PORT}")
    server = ThreadedHTTPServer(('127.0.0.1', PORT), HamiltonHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()

if __name__ == "__main__":
    main()
