"""Simple greedy snake AI API - Flask version"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import random

app = Flask(__name__)
CORS(app)

UP = (0, -1)
DOWN = (0, 1)
LEFT = (-1, 0)
RIGHT = (1, 0)
DIRS = [RIGHT, UP, DOWN, LEFT]

@app.route('/move', methods=['POST'])
def move():
    data = request.get_json()
    
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
    
    return jsonify({
        "direction": dir_map.get(direction, "RIGHT"),
        "food_distance": abs(head_x - food_x) + abs(head_y - food_y)
    })

@app.route('/init', methods=['POST'])
def init():
    return jsonify({"status": "ok"})

@app.route('/test', methods=['GET'])
def test():
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    print("🚀 Flask Snake AI 启动 (端口 8087)")
    app.run(host='localhost', port=8087, debug=False, threaded=True)
