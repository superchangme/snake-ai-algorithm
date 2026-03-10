#!/usr/bin/env python3
"""
最终版 Snake AI - 带线程保护的稳定版本
"""

import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn

PORT = 8087


def build_hamiltonian_cycle(width, height):
    path = []
    for x in range(width):
        if x == 0:
            for y in range(height):
                path.append((x, y))
        elif x % 2 == 1:
            for y in range(height - 1, 0, -1):
                path.append((x, y))
        else:
            for y in range(1, height):
                path.append((x, y))
    for x in range(width - 1, 0, -1):
        path.append((x, 0))

    order = [[0] * width for _ in range(height)]
    for i, (x, y) in enumerate(path):
        order[y][x] = i
    return order, path


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    allow_reuse_address = True
    daemon_threads = True


path_cache = {}


class HamiltonHandler(BaseHTTPRequestHandler):
    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def do_GET(self):
        self._send_json({"status": "ok"})

    def do_POST(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            data = json.loads(self.rfile.read(length).decode())
        except:
            self._send_json({"error": "Invalid"}, 400)
            return

        if self.path == '/init':
            size = data.get('size', 8)
            if size not in path_cache:
                path_cache[size] = build_hamiltonian_cycle(size, size)
            self._send_json({"status": "initialized"})

        elif self.path == '/move':
            try:
                head_x = data.get('headX', 0)
                head_y = data.get('headY', 0)
                size = data.get('size', 8)

                # 边界修正
                if head_x < 0: head_x = 0
                if head_y < 0: head_y = 0
                if head_x >= size: head_x = size - 1
                if head_y >= size: head_y = size - 1

                if size not in path_cache:
                    path_cache[size] = build_hamiltonian_cycle(size, size)
                order, path = path_cache[size]

                # 纯 Hamilton 路径
                current_idx = order[head_y][head_x]
                next_idx = (current_idx + 1) % len(path)
                next_pos = path[next_idx]

                dx = next_pos[0] - head_x
                dy = next_pos[1] - head_y

                if dx == 0 and dy == 0:
                    dx, dy = 0, 1

                Dir_map = {(0, -1): "UP", (0, 1): "DOWN", (-1, 0): "LEFT", (1, 0): "RIGHT"}
                self._send_json({"direction": Dir_map.get((dx, dy), "RIGHT")})

            except Exception as e:
                self._send_json({"direction": "RIGHT", "error": str(e)})


def main():
    print(f"🐍 Final Hamilton AI - 端口 {PORT} (稳定版)")
    server = ThreadedHTTPServer(('127.0.0.1', PORT), HamiltonHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()


if __name__ == "__main__":
    main()
