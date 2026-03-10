#!/usr/bin/env python3
"""
Phase 17 Tweak Snake AI API Server
端口: 8089
"""

import json
import sys
import uuid
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
from datetime import datetime

PORT = 8087

sys.path.insert(0, "/Users/tom.chang/code/ai_projects/shake-py/claude-version")
from phase17_tweak import TweakAI

ai_cache = {}
game_records = {}


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    allow_reuse_address = True
    daemon_threads = True


class TweakAIHandler(BaseHTTPRequestHandler):
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

    def _save_game_record(self, game_id):
        import os
        records_dir = "/Users/tom.chang/code/ai_projects/shake-py/claude-version/game_records"
        os.makedirs(records_dir, exist_ok=True)
        record = game_records[game_id]
        filename = f"{records_dir}/{game_id}.json"
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(record, f, indent=2, ensure_ascii=False)
        print(f"[SAVE] Saved to {filename}")

    def do_OPTIONS(self):
        self._send_json({"status": "ok"})

    def do_GET(self):
        self._send_json({"status": "ok", "algorithm": "phase17-tweak"})

    def do_POST(self):
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
                    self._save_game_record(game_id)
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
    print(f"🚀 Phase 17 Tweak API - 端口 {PORT}")
    server = ThreadedHTTPServer(("127.0.0.1", PORT), TweakAIHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()


if __name__ == "__main__":
    main()
