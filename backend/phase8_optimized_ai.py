"""
Phase 8 Optimized AI - 优化版混合策略
关键改进：
1. 更精准的评分函数
2. 更好的逃脱检测
3. 针对奇数网格的特殊优化
"""

from collections import deque
import random

UP = (0, -1)
DOWN = (0, 1)
LEFT = (-1, 0)
RIGHT = (1, 0)
DIRS = [UP, DOWN, LEFT, RIGHT]


def build_hamilton_cycle(width, height):
    """偶数网格的 Hamilton 闭环"""
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


class OptimizedAI:
    def __init__(self, width=8, height=8):
        self.width = width
        self.height = height
        self.total = width * height
        self.is_even = (width % 2 == 0 and height % 2 == 0)
        
        if self.is_even:
            self.order, self.path = build_hamilton_cycle(width, height)
        else:
            self.order, self.path = None, None
    
    def reset_game(self, snake):
        pass
    
    def _is_valid(self, pos):
        x, y = pos
        return 0 <= x < self.width and 0 <= y < self.height
    
    def _flood_fill(self, start, blocked):
        if start in blocked or not self._is_valid(start):
            return 0
        visited = {start}
        queue = deque([start])
        while queue:
            x, y = queue.popleft()
            for d in DIRS:
                nx, ny = x + d[0], y + d[1]
                nxt = (nx, ny)
                if self._is_valid(nxt) and nxt not in blocked and nxt not in visited:
                    visited.add(nxt)
                    queue.append(nxt)
        return len(visited)
    
    def _bfs_to_target(self, start, target, blocked):
        if start == target:
            return 0
        queue = deque([(start, 0)])
        visited = {start}
        while queue:
            pos, dist = queue.popleft()
            for d in DIRS:
                nx, ny = pos[0] + d[0], pos[1] + d[1]
                nxt = (nx, ny)
                if self._is_valid(nxt) and nxt not in blocked and nxt not in visited:
                    if nxt == target:
                        return dist + 1
                    visited.add(nxt)
                    queue.append((nxt, dist + 1))
        return float('inf')
    
    def _next_in_cycle(self, pos):
        if not self.order:
            return None
        x, y = pos
        if not self._is_valid(pos):
            return None
        idx = self.order[y][x]
        next_idx = (idx + 1) % self.total
        return self.path[next_idx]
    
    def _dir(self, a, b):
        return (b[0] - a[0], b[1] - a[1])
    
    def get_direction(self, snake, food, grid=None):
        head = snake[0]
        tail = snake[-1]
        snake_set = set(snake)
        snake_len = len(snake)
        body_without_tail = set(snake[:-1])
        
        # ===== 偶数网格：Hamilton 闭环 =====
        if self.is_even:
            next_pos = self._next_in_cycle(head)
            if next_pos and next_pos not in body_without_tail:
                return self._dir(head, next_pos)
        
        # ===== 奇数网格：智能策略 =====
        best_score = float('-inf')
        best_dir = None
        
        for d in DIRS:
            nx, ny = head[0] + d[0], head[1] + d[1]
            new_pos = (nx, ny)
            
            # 安全检查
            if not self._is_valid(new_pos):
                continue
            if new_pos in body_without_tail:
                continue
            
            # 计算新状态
            new_blocked = body_without_tail.copy()
            new_blocked.add(new_pos)
            
            # 评分
            score = 0
            
            # 1. 可达区域（最重要）
            area = self._flood_fill(new_pos, new_blocked)
            score += area * 100
            
            # 2. 到食物的距离
            food_dist = abs(nx - food[0]) + abs(ny - food[1])
            score -= food_dist * 5
            
            # 3. 能否到达尾巴
            tail_dist = self._bfs_to_target(new_pos, tail, new_blocked)
            if tail_dist < float('inf'):
                score += 500
            else:
                score -= 1000  # 无法到达尾巴，危险
            
            # 4. 避免死角（周围空格数）
            empty_neighbors = 0
            for d2 in DIRS:
                n2x, n2y = nx + d2[0], ny + d2[1]
                n2 = (n2x, n2y)
                if self._is_valid(n2) and n2 not in new_blocked:
                    empty_neighbors += 1
            score += empty_neighbors * 50
            
            # 5. 鼓励向食物移动
            if food_dist < abs(head[0] - food[0]) + abs(head[1] - food[1]):
                score += 30
            
            if score > best_score:
                best_score = score
                best_dir = d
        
        if best_dir:
            return best_dir
        
        # 兜底
        for d in DIRS:
            nx, ny = head[0] + d[0], head[1] + d[1]
            if self._is_valid((nx, ny)) and (nx, ny) not in snake_set:
                return d
        
        return None


def simulate_game(width=8, height=8, max_steps=100000, seed=None):
    if seed is not None:
        random.seed(seed)
    ai = OptimizedAI(width, height)
    mid_x, mid_y = width // 2, height // 2
    snake = [(mid_x, mid_y), (mid_x - 1, mid_y), (mid_x - 2, mid_y)]
    
    def place_food():
        snake_set = set(snake)
        empty = [(x, y) for x in range(width) for y in range(height) if (x, y) not in snake_set]
        return random.choice(empty) if empty else None
    
    food = place_food()
    if not food:
        return len(snake), True
    
    steps = 0
    no_food = 0
    max_no_food = width * height * 8
    
    while steps < max_steps:
        d = ai.get_direction(snake, food)
        if d is None:
            break
        nh = (snake[0][0] + d[0], snake[0][1] + d[1])
        if not ai._is_valid(nh) or nh in set(snake[:-1]):
            break
        snake.insert(0, nh)
        if nh == food:
            no_food = 0
            food = place_food()
            if not food:
                return len(snake), True
        else:
            snake.pop()
            no_food += 1
        if no_food > max_no_food:
            break
        steps += 1
    return len(snake), len(snake) == width * height


def run_benchmark(n=30, w=8, h=8):
    print(f"\n{'='*50}")
    print(f"Phase 8 Optimized AI - {w}x{h} ({'偶数' if w%2==0 and h%2==0 else '奇数'})")
    print(f"{'='*50}")
    results = []
    perfect = 0
    for i in range(n):
        length, is_perfect = simulate_game(w, h, seed=i * 42 + 7)
        results.append(length)
        if is_perfect:
            perfect += 1
        pct = length * 100 // (w * h)
        tag = '满分✅' if is_perfect else f'{pct}%'
        print(f"Game {i+1:2d}: {length:3d}/{w*h} ({tag})")
    avg = sum(results) / len(results)
    print(f"\n平均: {avg:.1f} | 满分: {perfect}/{n} ({perfect*100//n}%)")
    return results, perfect * 100 // n


if __name__ == "__main__":
    run_benchmark(30, 8, 8)
    run_benchmark(30, 7, 7)
    run_benchmark(30, 9, 9)
    run_benchmark(30, 10, 10)
