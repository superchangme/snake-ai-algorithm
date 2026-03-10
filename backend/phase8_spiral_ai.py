"""
Phase 8 Snake AI - 螺旋式"活口"路径
核心思路：
1. 偶数网格：使用传统 Hamilton 闭环
2. 奇数网格：使用螺旋式路径，末端自然连接到中间点形成"类闭环"
3. 动态修复：当路径被堵时，实时计算替代路径
"""

from collections import deque
import random

UP = (0, -1)
DOWN = (0, 1)
LEFT = (-1, 0)
RIGHT = (1, 0)
DIRS = [UP, DOWN, LEFT, RIGHT]


def build_spiral_path(width, height):
    """
    构造螺旋式路径（从外到内）
    适用于任意尺寸，特别是奇数
    """
    path = []
    visited = [[False] * width for _ in range(height)]
    
    x, y = 0, 0
    direction = RIGHT
    turn_right = {RIGHT: DOWN, DOWN: LEFT, LEFT: UP, UP: RIGHT}
    dx = {RIGHT: 1, DOWN: 0, LEFT: -1, UP: 0}
    dy = {RIGHT: 0, DOWN: 1, LEFT: 0, UP: -1}
    
    for _ in range(width * height):
        path.append((x, y))
        visited[y][x] = True
        
        nx, ny = x + dx[direction], y + dy[direction]
        
        if not (0 <= nx < width and 0 <= ny < height) or visited[ny][nx]:
            direction = turn_right[direction]
            nx, ny = x + dx[direction], y + dy[direction]
            
            if not (0 <= nx < width and 0 <= ny < height) or visited[ny][nx]:
                break
        
        x, y = nx, ny
    
    order = [[0] * width for _ in range(height)]
    for i, (px, py) in enumerate(path):
        order[py][px] = i
    
    return order, path


def build_snake_path(width, height):
    """构造蛇形路径"""
    path = []
    
    for x in range(width):
        if x % 2 == 0:
            for y in range(height):
                path.append((x, y))
        else:
            for y in range(height - 1, -1, -1):
                path.append((x, y))
    
    order = [[0] * width for _ in range(height)]
    for i, (px, py) in enumerate(path):
        order[py][px] = i
    
    return order, path


class SpiralSnakeAI:
    def __init__(self, width=8, height=8):
        self.width = width
        self.height = height
        self.total = width * height
        
        if width % 2 == 0 and height % 2 == 0:
            self.order, self.path = build_snake_path(width, height)
            self.is_even = True
        else:
            self.order, self.path = build_spiral_path(width, height)
            self.is_even = False
    
    def reset_game(self, snake):
        pass
    
    def _is_safe(self, head, direction, snake_set):
        nx, ny = head[0] + direction[0], head[1] + direction[1]
        if not (0 <= nx < self.width and 0 <= ny < self.height):
            return False
        if (nx, ny) in snake_set:
            return False
        return True
    
    def _is_safe_with_tail(self, head, direction, snake_body):
        nx, ny = head[0] + direction[0], head[1] + direction[1]
        if not (0 <= nx < self.width and 0 <= ny < self.height):
            return False
        if (nx, ny) in set(snake_body[:-1]):
            return False
        return True
    
    def _flood_fill_area(self, start, blocked):
        if start in blocked:
            return 0
        visited = {start}
        queue = deque([start])
        while queue:
            x, y = queue.popleft()
            for d in DIRS:
                nx, ny = x + d[0], y + d[1]
                if (0 <= nx < self.width and 0 <= ny < self.height 
                    and (nx, ny) not in blocked and (nx, ny) not in visited):
                    visited.add((nx, ny))
                    queue.append((nx, ny))
        return len(visited)
    
    def _has_escape_route(self, pos, blocked, min_steps=3):
        queue = deque([(pos, 0)])
        visited = {pos}
        while queue:
            p, steps = queue.popleft()
            if steps >= min_steps:
                return True
            for d in DIRS:
                nx, ny = p[0] + d[0], p[1] + d[1]
                if (0 <= nx < self.width and 0 <= ny < self.height 
                    and (nx, ny) not in blocked and (nx, ny) not in visited):
                    visited.add((nx, ny))
                    queue.append(((nx, ny), steps + 1))
        return False
    
    def _next_in_path(self, pos):
        try:
            idx = self.order[pos[1]][pos[0]]
            next_idx = (idx + 1) % self.total
            return self.path[next_idx]
        except:
            return None
    
    def _dir(self, a, b):
        return (b[0] - a[0], b[1] - a[1])
    
    def _bfs_path(self, start, goal, obstacles):
        if start == goal:
            return [start]
        queue = deque([(start, [start])])
        visited = {start}
        while queue:
            pos, path = queue.popleft()
            for d in DIRS:
                nx, ny = pos[0] + d[0], pos[1] + d[1]
                if (0 <= nx < self.width and 0 <= ny < self.height 
                    and (nx, ny) not in obstacles and (nx, ny) not in visited):
                    new_path = path + [(nx, ny)]
                    if (nx, ny) == goal:
                        return new_path
                    visited.add((nx, ny))
                    queue.append(((nx, ny), new_path))
        return None
    
    def _find_safest_direction(self, head, snake_set, food=None):
        safe_moves = []
        for d in DIRS:
            nx, ny = head[0] + d[0], head[1] + d[1]
            if 0 <= nx < self.width and 0 <= ny < self.height and (nx, ny) not in snake_set:
                new_pos = (nx, ny)
                new_blocked = snake_set - {head}
                new_blocked.add(new_pos)
                area = self._flood_fill_area(new_pos, new_blocked)
                food_dist = abs(nx - food[0]) + abs(ny - food[1]) if food else 0
                score = area * 10 - food_dist
                safe_moves.append((score, d, new_pos))
        if not safe_moves:
            return None, None
        safe_moves.sort(reverse=True)
        return safe_moves[0][1], safe_moves[0][2]
    
    def get_direction(self, snake, food, grid=None):
        head = snake[0]
        snake_set = set(snake)
        
        # 策略1：沿路径走
        next_pos = self._next_in_path(head)
        if next_pos and self._is_safe_with_tail(head, self._dir(head, next_pos), snake):
            future_blocked = snake_set - {snake[-1]}
            future_blocked.add(next_pos)
            if self._has_escape_route(next_pos, future_blocked, min_steps=2):
                return self._dir(head, next_pos)
        
        # 策略2：追食物
        path_to_food = self._bfs_path(head, food, snake_set)
        if path_to_food and len(path_to_food) > 1:
            first_step = path_to_food[1]
            first_dir = self._dir(head, first_step)
            if self._is_safe_with_tail(head, first_dir, snake):
                future_blocked = snake_set - {snake[-1]}
                future_blocked.add(first_step)
                if self._has_escape_route(first_step, future_blocked, min_steps=2):
                    return first_dir
        
        # 策略3：找最安全方向
        safe_dir, _ = self._find_safest_direction(head, snake_set, food)
        if safe_dir:
            return safe_dir
        
        # 策略4：任意能走的方向
        for d in DIRS:
            if self._is_safe(head, d, snake_set):
                return d
        
        return None


def simulate_game(width=8, height=8, max_steps=50000, seed=None):
    if seed is not None:
        random.seed(seed)
    ai = SpiralSnakeAI(width, height)
    mid_x, mid_y = width // 2, height // 2
    snake = [(mid_x, mid_y), (mid_x - 1, mid_y), (mid_x - 2, mid_y)]
    
    def place_food():
        snake_set = set(snake)
        empty = [(x, y) for x in range(width) for y in range(height) if (x, y) not in snake_set]
        return random.choice(empty) if empty else None
    
    food = place_food()
    if not food:
        return len(snake), True
    
    ai.reset_game(snake)
    steps = 0
    no_food_steps = 0
    max_no_food = width * height * 4
    
    while steps < max_steps:
        direction = ai.get_direction(snake, food)
        if direction is None:
            break
        new_head = (snake[0][0] + direction[0], snake[0][1] + direction[1])
        if not (0 <= new_head[0] < width and 0 <= new_head[1] < height):
            break
        if new_head in set(snake[:-1]):
            break
        snake.insert(0, new_head)
        if new_head == food:
            no_food_steps = 0
            food = place_food()
            if not food:
                return len(snake), True
        else:
            snake.pop()
            no_food_steps += 1
        if no_food_steps > max_no_food:
            break
        steps += 1
    return len(snake), len(snake) == width * height


def run_benchmark(n=30, w=8, h=8):
    print(f"\n{'='*50}")
    print(f"Phase 8 Spiral AI - {w}x{h} Grid")
    print(f"{'='*50}")
    results = []
    perfect_count = 0
    for i in range(n):
        length, is_perfect = simulate_game(w, h, seed=i * 42 + 7)
        results.append(length)
        if is_perfect:
            perfect_count += 1
        tag = '满分✅' if is_perfect else f'{length * 100 // (w * h)}%'
        print(f"Game {i+1:2d}: {length:2d}/{w*h} ({tag})")
    avg = sum(results) / len(results)
    print(f"\n平均: {avg:.1f} | 满分: {perfect_count}/{n}")
    return results, perfect_count * 100 // n


if __name__ == "__main__":
    run_benchmark(10, 8, 8)
    run_benchmark(10, 7, 7)
    run_benchmark(10, 9, 9)
