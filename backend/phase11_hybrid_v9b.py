"""
Phase 11 Hybrid v9b - 简化的中心惩罚
"""

from collections import deque
import random

UP = (0, -1)
DOWN = (0, 1)
LEFT = (-1, 0)
RIGHT = (1, 0)
DIRS = [UP, DOWN, LEFT, RIGHT]


def build_hamilton_cycle(width, height):
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
    for i, (px, py) in enumerate(path):
        order[py][px] = i
    return order, path


class HybridAI:
    def __init__(self, width=8, height=8):
        self.width = width
        self.height = height
        self.total = width * height
        self.is_even = (width % 2 == 0 and height % 2 == 0)
        
        if self.is_even:
            self.order, self.path = build_hamilton_cycle(width, height)
        else:
            self.order, self.path = None, None
    
    def _is_valid(self, pos):
        x, y = pos
        return 0 <= x < self.width and 0 <= y < self.height
    
    def _bfs_path(self, start, goal, blocked):
        if start == goal:
            return [start]
        queue = deque([(start, [start])])
        visited = {start}
        while queue:
            pos, path = queue.popleft()
            for d in DIRS:
                nx, ny = pos[0] + d[0], pos[1] + d[1]
                nxt = (nx, ny)
                if self._is_valid(nxt) and nxt not in blocked and nxt not in visited:
                    new_path = path + [nxt]
                    if nxt == goal:
                        return new_path
                    visited.add(nxt)
                    queue.append((nxt, new_path))
        return None
    
    def _can_reach(self, start, goal, blocked):
        return self._bfs_path(start, goal, blocked) is not None
    
    def _center_distance(self, pos):
        cx, cy = self.width // 2, self.height // 2
        return abs(pos[0] - cx) + abs(pos[1] - cy)
    
    def _follow_tail(self, snake):
        """跟随尾巴 - 优先远离中心"""
        head = snake[0]
        tail = snake[-1]
        body_without_tail = set(snake[:-1])
        
        best_dir = None
        best_score = -float('inf')
        
        for d in DIRS:
            nx, ny = head[0] + d[0], head[1] + d[1]
            nxt = (nx, ny)
            
            if not self._is_valid(nxt) or nxt in body_without_tail:
                continue
            
            new_snake = [nxt] + snake[:-1]
            
            # 必须能到尾巴
            if len(new_snake) >= 4:
                if not self._can_reach(nxt, tail, set(new_snake[:-1])):
                    continue
            
            # 中心惩罚：离中心越远越好
            center_dist = self._center_distance(nxt)
            score = 100 - center_dist  # 简化：只考虑中心距离
            
            if score > best_score:
                best_score = score
                best_dir = d
        
        return best_dir
    
    def _next_in_cycle(self, pos):
        if not self.order:
            return None
        x, y = pos
        if not self._is_valid(pos):
            return None
        idx = self.order[y][x]
        return self.path[(idx + 1) % self.total]
    
    def _prev_in_cycle(self, pos):
        if not self.order:
            return None
        x, y = pos
        if not self._is_valid(pos):
            return None
        idx = self.order[y][x]
        return self.path[(idx - 1) % self.total]
    
    def _hamilton_next_safe(self, snake):
        head = snake[0]
        tail = snake[-1]
        
        next_pos = self._next_in_cycle(head)
        
        if next_pos and next_pos in set(snake[:-1]):
            if tail == self._prev_in_cycle(head):
                return (next_pos[0] - head[0], next_pos[1] - head[1])
            for d in DIRS:
                nx, ny = head[0] + d[0], head[1] + d[1]
                if self._is_valid((nx, ny)) and (nx, ny) not in set(snake[:-1]):
                    return d
            return None
        
        if next_pos:
            return (next_pos[0] - head[0], next_pos[1] - head[1])
        return None
    
    def get_direction(self, snake, food, grid=None):
        head = snake[0]
        body = set(snake[1:])
        
        if self.is_even:
            return self._hamilton_next_safe(snake)
        
        # 奇数网格
        food_path = self._bfs_path(head, food, body)
        
        if food_path and len(food_path) > 1:
            virtual_snake = list(snake)
            for i in range(1, len(food_path)):
                virtual_snake.insert(0, food_path[i])
                if i < len(food_path) - 1:
                    virtual_snake.pop()
            
            if len(virtual_snake) < 4 or self._can_reach(virtual_snake[0], virtual_snake[-1], set(virtual_snake[:-1])):
                return (food_path[1][0] - head[0], food_path[1][1] - head[1])
        
        return self._follow_tail(snake)


def simulate_game(width=8, height=8, max_steps=200000, seed=None):
    if seed is not None:
        random.seed(seed)
    ai = HybridAI(width, height)
    mid_x, mid_y = width // 2, height // 2
    snake = [(mid_x, mid_y), (mid_x - 1, mid_y), (mid_x - 2, mid_y)]
    
    def place_food():
        snake_set = set(snake)
        empty = [(x, y) for x in range(width) for y in range(height) if (x, y) not in snake_set]
        return random.choice(empty) if empty else None
    
    food = place_food()
    if not food:
        return len(snake), True, 0
    
    steps = 0
    max_no_food = width * height * 20
    
    while steps < max_steps:
        d = ai.get_direction(snake, food)
        if d is None:
            break
        nh = (snake[0][0] + d[0], snake[0][1] + d[1])
        if not ai._is_valid(nh) or nh in set(snake[:-1]):
            break
        snake.insert(0, nh)
        if nh == food:
            food = place_food()
            if not food:
                return len(snake), True, steps
        else:
            snake.pop()
        steps += 1
    
    return len(snake), len(snake) == width * height, steps


def run_benchmark(n=10, w=8, h=8):
    print(f"\n{'='*50}")
    print(f"Hybrid AI v9b - {w}x{h}")
    print(f"{'='*50}")
    results = []
    perfect = 0
    for i in range(n):
        length, is_perfect, steps = simulate_game(w, h, seed=i * 42 + 7)
        results.append(length)
        if is_perfect:
            perfect += 1
        pct = length * 100 // (w * h)
        tag = '满分✅' if is_perfect else f'{pct}%'
        print(f"Game {i+1}: {length:3d}/{w*h} ({tag}) | {steps}步")
    avg = sum(results) / len(results)
    print(f"平均: {avg:.1f} | 满分: {perfect}/10")
    return results, perfect


if __name__ == "__main__":
    run_benchmark(10, 7, 7)
    run_benchmark(10, 9, 9)
    run_benchmark(10, 8, 8)
