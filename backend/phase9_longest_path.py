"""
Phase 9 Longest Path AI - 最长路径策略

核心思路：
1. 不用静态 Hamilton 回路（奇数网格没有）
2. 每一步都找一条"最长安全路径"
3. 沿着这条路走，确保不会被困

关键：使用 BFS 找到食物的路径，但要确保路径安全
"""

from collections import deque
import random

UP = (0, -1)
DOWN = (0, 1)
LEFT = (-1, 0)
RIGHT = (1, 0)
DIRS = [UP, DOWN, LEFT, RIGHT]


def build_hamilton_cycle(width, height):
    """偶数网格的 Hamilton 回路"""
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


class LongestPathAI:
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
    
    def _get_neighbors(self, pos, blocked):
        x, y = pos
        result = []
        for d in DIRS:
            nx, ny = x + d[0], y + d[1]
            nxt = (nx, ny)
            if self._is_valid(nxt) and nxt not in blocked:
                result.append(nxt)
        return result
    
    def _bfs_path(self, start, goal, blocked):
        """BFS 找最短路径"""
        if start == goal:
            return [start]
        if start in blocked or goal in blocked:
            return None
        
        queue = deque([(start, [start])])
        visited = {start}
        
        while queue:
            pos, path = queue.popleft()
            for nxt in self._get_neighbors(pos, blocked):
                if nxt not in visited:
                    new_path = path + [nxt]
                    if nxt == goal:
                        return new_path
                    visited.add(nxt)
                    queue.append((nxt, new_path))
        return None
    
    def _flood_fill(self, start, blocked):
        """计算可达区域"""
        if start in blocked:
            return 0
        visited = {start}
        queue = deque([start])
        while queue:
            pos = queue.popleft()
            for nxt in self._get_neighbors(pos, blocked):
                if nxt not in visited:
                    visited.add(nxt)
                    queue.append(nxt)
        return len(visited)
    
    def _simulate_move(self, snake, direction):
        """模拟移动后的蛇"""
        head = snake[0]
        new_head = (head[0] + direction[0], head[1] + direction[1])
        
        if not self._is_valid(new_head):
            return None
        if new_head in set(snake[:-1]):
            return None
        
        # 新蛇身（假设不吃食物）
        return [new_head] + snake[:-1]
    
    def _is_safe_long_term(self, snake, direction, food):
        """检查这一步是否长期安全"""
        new_snake = self._simulate_move(snake, direction)
        if new_snake is None:
            return False
        
        new_head = new_snake[0]
        new_blocked = set(new_snake)
        
        # 检查1：可达区域足够大
        area = self._flood_fill(new_head, new_blocked)
        min_area = len(snake) + 5  # 至少要有蛇长度+5的空间
        if area < min_area:
            return False
        
        # 检查2：能到达尾巴
        tail = new_snake[-1]
        if len(new_snake) >= 4:
            path_to_tail = self._bfs_path(new_head, tail, new_blocked - {tail})
            if path_to_tail is None:
                return False
        
        return True
    
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
        body_without_tail = set(snake[:-1])
        
        # ===== 偶数网格：Hamilton 回路 =====
        if self.is_even:
            next_pos = self._next_in_cycle(head)
            if next_pos and next_pos not in body_without_tail:
                return self._dir(head, next_pos)
        
        # ===== 奇数网格：安全贪婪策略 =====
        
        # 策略：找一条到食物的安全路径
        path_to_food = self._bfs_path(head, food, snake_set)
        
        if path_to_food and len(path_to_food) > 1:
            first_step = path_to_food[1]
            first_dir = self._dir(head, first_step)
            
            # 检查这步是否长期安全
            if self._is_safe_long_term(snake, first_dir, food):
                return first_dir
        
        # 如果到食物的路径不安全，找一个安全的方向
        safe_moves = []
        
        for d in DIRS:
            new_snake = self._simulate_move(snake, d)
            if new_snake is None:
                continue
            
            new_head = new_snake[0]
            new_blocked = set(new_snake)
            
            # 计算安全分数
            score = 0
            
            # 可达区域
            area = self._flood_fill(new_head, new_blocked)
            score += area * 10
            
            # 能否到达尾巴
            if len(new_snake) >= 4:
                tail = new_snake[-1]
                if self._bfs_path(new_head, tail, new_blocked - {tail}):
                    score += 1000
            
            # 到食物的距离
            food_dist = abs(new_head[0] - food[0]) + abs(new_head[1] - food[1])
            score -= food_dist
            
            safe_moves.append((score, d))
        
        if not safe_moves:
            # 兜底
            for d in DIRS:
                nx, ny = head[0] + d[0], head[1] + d[1]
                if self._is_valid((nx, ny)) and (nx, ny) not in snake_set:
                    return d
            return None
        
        safe_moves.sort(reverse=True)
        return safe_moves[0][1]


def simulate_game(width=8, height=8, max_steps=200000, seed=None):
    if seed is not None:
        random.seed(seed)
    ai = LongestPathAI(width, height)
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
    max_no_food = width * height * 10
    
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
    print(f"Longest Path AI - {w}x{h} ({'偶数' if w%2==0 and h%2==0 else '奇数'})")
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
