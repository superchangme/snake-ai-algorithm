#!/usr/bin/env python3
"""
Phase 17 Tweak Snake AI API Server + Static Files + WebSocket
支持 HTTP 和 WebSocket 两种模式
"""

import json
import os
import sys
import uuid
import asyncio
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler

PORT = int(os.environ.get("PORT", 8080))
DIST_DIR = os.path.join(os.path.dirname(__file__), "..", "dist")

sys.path.insert(0, os.path.dirname(__file__))
from phase17_tweak import TweakAI

ai_cache = {}

print(f"Server - Port {PORT}")
print(f"Dist: {DIST_DIR}")


class SnakeHTTPHandler(BaseHTTPRequestHandler):
    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
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
        except FileNotFoundError:
            self.send_error(404, "File not found")

    def do_GET(self):
        if self.path == "/api":
            self._send_json({"status": "ok", "algorithm": "phase17-tweak", "ws_port": PORT + 1})
            return
        
        if self.path.startswith("/assets/"):
            filepath = os.path.join(DIST_DIR, self.path.lstrip("/"))
            ext = os.path.splitext(filepath)[1]
            content_type = {".js": "application/javascript", ".css": "text/css"}.get(ext, "text/plain")
            self._send_file(filepath, content_type)
            return
        
        filepath = os.path.join(DIST_DIR, "index.html")
        self._send_file(filepath, "text/html")

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            data = json.loads(self.rfile.read(length).decode())
        except:
            self._send_json({"error": "Invalid request"}, 400)
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
            self._send_json({"status": "initialized", "game_id": game_id, "size": size})

        elif self.path == "/move":
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
                ai_cache[cache_key] = TweakAI(width=size, height=size)
            ai = ai_cache[cache_key]

            direction = ai.get_direction(snake, (food_x, food_y))
            dir_map = {(0, -1): "UP", (0, 1): "DOWN", (-1, 0): "LEFT", (1, 0): "RIGHT"}
            dir_name = dir_map.get(direction, "RIGHT")
            
            self._send_json({"direction": dir_name})


# WebSocket
try:
    import websockets
    
    async def ws_handler(websocket):
        print(f"[WS] Client connected")
        try:
            async for message in websocket:
                try:
                    data = json.loads(message)
                    action = data.get("action")
                    
                    if action == "init":
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
                        
                        await websocket.send(json.dumps({"status": "initialized", "game_id": str(uuid.uuid4())}))
                    
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
                            ai_cache[cache_key] = TweakAI(width=size, height=size)
                        ai = ai_cache[cache_key]

                        direction = ai.get_direction(snake, (food_x, food_y))
                        dir_map = {(0, -1): "UP", (0, 1): "DOWN", (-1, 0): "LEFT", (1, 0): "RIGHT"}
                        dir_name = dir_map.get(direction, "RIGHT")
                        
                        await websocket.send(json.dumps({"direction": dir_name}))
                        
                except Exception as e:
                    await websocket.send(json.dumps({"error": str(e)}))
        except:
            pass
        print(f"[WS] Client disconnected")

    async def start_ws():
        async with websockets.serve(ws_handler, "0.0.0.0", PORT + 1):
            print(f"WebSocket: ws://0.0.0.0:{PORT + 1}")
            await asyncio.Future()

    WEBSOCKET_AVAILABLE = True
except ImportError:
    WEBSOCKET_AVAILABLE = False
    print("websockets not installed, HTTP only")


def main():
    http_server = HTTPServer(("0.0.0.0", PORT), SnakeHTTPHandler)
    http_thread = threading.Thread(target=http_server.serve_forever, daemon=True)
    http_thread.start()
    
    print(f"HTTP: http://0.0.0.0:{PORT}")
    
    if WEBSOCKET_AVAILABLE:
        asyncio.run(start_ws())
    else:
        http_server.serve_forever()


if __name__ == "__main__":
    main()
