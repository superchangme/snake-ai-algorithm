#!/usr/bin/env python3
"""
Phase 17 Tweak Snake AI API Server + Static Files
用于 Railway 部署
"""

import json
import sys
import os
import uuid
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
from datetime import datetime
from urllib.parse import urlparse, parse_qs

PORT = int(os.environ.get("PORT", 8080))

# 前端静态文件目录
DIST_DIR = os.path.join(os.path.dirname(__file__), "..", "dist")

print(f"[DEBUG] PORT: {PORT}")
print(f"[DEBUG] DIST_DIR: {DIST_DIR}")
print(f"[DEBUG] DIST_DIR exists: {os.path.exists(DIST_DIR)}")
if os.path.exists(DIST_DIR):
    print(f"[DEBUG] DIST_DIR files: {os.listdir(DIST_DIR)}")

sys.path.insert(0, os.path.dirname(__file__))
from phase17_tweak import TweakAI

ai_cache = {}
game_records = {}


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    allow_reuse_address = True
    daemon_threads = True


class SnakeAIHandler(BaseHTTPRequestHandler):
    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Accept")
        json_str = json.dumps(data)
        self.send_header("Content-Length", str(len(json_str)))
        self.end_headers()
        self.wfile.write(json_str.encode())

    def _send_file(self, filepath, content_type):
        try:
            with open(filepath, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
            print(f"[DEBUG] Served file: {filepath}")
        except FileNotFoundError:
            print(f"[DEBUG] File not found: {filepath}")
            self.send_error(404, "File not found")

    def do_OPTIONS(self):
        self._send_json({"status": "ok"})

    def do_GET(self):
        print(f"[DEBUG] GET: {self.path}")
        
        # API 路由（只匹配 /api 开头）
        if self.path == "/api":
            self._send_json({"status": "ok", "algorithm": "phase17-tweak"})
            return
        
        # 静态文件服务
        if self.path.startswith("/assets/"):
            filepath = os.path.join(DIST_DIR, self.path.lstrip("/"))
            print(f"[DEBUG] Serving asset: {filepath}")
            ext = os.path.splitext(filepath)[1]
            content_type = {
                ".js": "application/javascript",
                ".css": "text/css",
                ".png": "image/png",
                ".jpg": "image/jpeg",
                ".svg": "image/svg+xml",
            }.get(ext, "text/plain")
            self._send_file(filepath, content_type)
            return
        
        # 根路径和其他路径返回 index.html (SPA)
        filepath = os.path.join(DIST_DIR, "index.html")
        print(f"[DEBUG] Serving index: {filepath}")
        self._send_file(filepath, "text/html")

    def do_POST(self):
        print(f"[DEBUG] POST: {self.path}")
        # ... 保持不变
        try:
            length = int(self.headers.get("Content-Length", 0))
            data = json.loads(self.rfile.read(length).decode())
        except Exception as e:
            self._send_json({"error": str(e)}, 400)
            return

        if self.path == "/init":
            size = data.get("size", 8)
            head_x = data.get("headX", size // 2)
            head_y = data.get("headY", size // 2)
            body = data.get("body", [])
            
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
            game_records[game_id] = {
                "game_id": game_id,
                "size": size,
                "start_time": datetime.now().isoformat(),
                "score": 0,
                "steps": 0,
                "food_eaten": 0,
                "death_reason": "",
                "death_position": {},
                "moves": [],
            }

            print(f"[SERVER] INIT game_id={game_id}, size={size}, snake={snake}")
            self._send_json({"status": "initialized", "game_id": game_id, "size": size})

        elif self.path == "/move":
            try:
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

                food = (food_x, food_y)

                cache_key = f"ai_{size}"
                if cache_key not in ai_cache:
                    ai_cache[cache_key] = TweakAI(width=size, height=size)
                ai = ai_cache[cache_key]

                direction = ai.get_direction(snake, food)

                dir_map = {
                    (0, -1): "UP",
                    (0, 1): "DOWN",
                    (-1, 0): "LEFT",
                    (1, 0): "RIGHT",
                }

                dir_name = dir_map.get(direction, "RIGHT")
                self._send_json({"direction": dir_name, "algorithm": "phase17-tweak"})

            except Exception as e:
                print(f"[ERROR] {e}")
                import traceback
                traceback.print_exc()
                self._send_json({"error": str(e), "direction": "RIGHT"})

        elif self.path == "/gameover":
            try:
                game_id = data.get("game_id", "")
                score = data.get("score", 0)
                steps = data.get("steps", 0)
                food_eaten = data.get("food_eaten", 0)
                death_reason = data.get("death_reason", "")
                death_x = data.get("death_x", 0)
                death_y = data.get("death_y", 0)

                if game_id in game_records:
                    game_records[game_id]["score"] = score
                    game_records[game_id]["steps"] = steps
                    game_records[game_id]["food_eaten"] = food_eaten
                    game_records[game_id]["death_reason"] = death_reason
                    game_records[game_id]["death_position"] = {"x": death_x, "y": death_y}
                    game_records[game_id]["end_time"] = datetime.now().isoformat()
                    print(f"[GAMEOVER] game_id={game_id}, score={score}, reason={death_reason}")
                    self._send_json({"status": "recorded", "game_id": game_id})
                else:
                    self._send_json({"error": "Game not found"}, 404)
            except Exception as e:
                print(f"[GAMEOVER ERROR] {e}")
                self._send_json({"error": str(e)}, 500)
        else:
            self._send_json({"error": "Not found"}, 404)


def main():
    print(f"🚀 Snake AI Server - 端口 {PORT}")
    
    server = ThreadedHTTPServer(("0.0.0.0", PORT), SnakeAIHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()


if __name__ == "__main__":
    main()
