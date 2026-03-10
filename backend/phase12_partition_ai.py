"""
Phase 12 - 分区 + 多哈密顿循环算法

思路：
1. 把奇数网格分成偶数区域
2. 每个区域有哈密顿循环
3. 蛇在区内循环，吃完后再到下一区
"""

from collections import deque
import random

UP = (0, -1)
DOWN = (0, 1)
LEFT = (-1, 0)
RIGHT = (1, 0)
DIRS = [UP, DOWN, LEFT, RIGHT]


def build_hamilton_cycle(width, height):
    """构建哈密顿回路"""
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


def split_grid(width, height):
    """把奇数网格分成偶数区域"""
    # 7x7 -> 3x7 + 4x7
    # 9x9 -> 4x9 + 5x9
    w1 = width // 2
    w2 = width - w1
    zones = [
        (0, 0, w1, height),      # 左区
        (w1, 0, w2, height),     # 右区
    ]
    return zones


class PartitionAI:
    def __init__(self, width=8, height=8):
        self.width = width
        self.height = height
        self.total = width * height
        self.is_even = (width % 2 == 0 and height % 2 == 0)
        
        if self.is_even:
            # 偶数网格：直接用哈密顿
            self.order, self.path = build_hamilton_cycle(width, height)
            self.zones = None
        else:
            # 奇数网格：分区
            self.zones = split_grid(width, height)
            # 为每个区构建哈密顿
            self.zone_ai = []
            for x, y, w, h in self.zones:
                if w > 0 and h > 0 and w % 2 == 0:
                    order, path = build_hamilton_cycle(w, h)
                    self.zone_ai.append((x, y, w, h, order, path))
            self.current_zone = 0  # 当前区域
        
        # 当前在哪个区
        self.current_zone = 0
    
    def _is_valid(self, pos):
        x, y = pos
        return 0 <= x < self.width and 0 <= y < self.height
    
    def _get_zone(self, pos):
        """获取位置所在的区"""
        x, y = pos
        for i, (zx, zy, zw, zh, _, _) in enumerate(self.zone_ai):
            if zx <= x < zx + zw and zy <= y < zy + zh:
                return i
        return -1
    
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
    
    def _get_zone_path(self, zone_idx, pos):
        """在区内移动到下一个位置"""
        if zone_idx < 0 or zone_idx >= len(self.zone_ai):
            return None
        zx, zy, zw, zh, order, path = self.zone_ai[zone_idx]
        
        # 转换到区内坐标
        local_x = pos[0] - zx
        local_y = pos[1] - zy
        
        if not (0 <= local_x < zw and 0 <= local_y < zh):
            return None
        
        local_idx = order[local_y][local_x]
        next_local_idx = (local_idx + 1) % (zw * zh)
        next_local = path[next_local_idx]
        
        # 转回全局坐标
        return (next_local[0] + zx, next_local[1] + zy)
    
    def _next_in_cycle(self, pos):
        if not self.is_even:
            return None
        x, y = pos
        if not self._is_valid(pos):
            return None
        idx = self.order[y][x]
        next_idx = (idx + 1) % self.total
        return self.path[next_idx]
    
    def get_direction(self, snake, food, grid=None):
        head = snake[0]
        body_without_tail = set(snake[:-1])
        
        # 偶数网格：直接哈密顿
        if self.is_even:
            next_pos = self._next_in_cycle(head)
            if next_pos and next_pos not in body_without_tail:
                return (next_pos[0] - head[0], next_pos[1] - head[1])
            # 等待
            for d in DIRS:
                nx, ny = head[0] + d[0], head[1] + d[1]
                if self._is_valid((nx, ny)) and (nx, ny) not in body_without_tail:
                    return d
            return None
        
        # 奇数网格：分区策略
        food_zone = self._get_zone(food)
        head_zone = self._get_zone(head)
        
        # 尝试吃食物
        food_path = self._bfs_path(head, food, body_without_tail)
        
        if food_path and len(food_path) > 1:
            # 模拟吃完
            virtual_snake = list(snake)
            for i in range(1, len(food_path)):
                virtual_snake.insert(0, food_path[i])
                if i < len(food_path) - 1:
                    virtual_snake.pop()
            
            # 检查能否到达尾巴
            if len(virtual_snake) < 4 or self._can_reach(virtual_snake[0], virtual_snake[-1], set(virtual_snake[:-1])):
                first_step = food_path[1]
                return (first_step[0] - head[0], first_step[1] - head[1])
        
        # 区内移动
        if head_zone >= 0:
            next_pos = self._get_zone_path(head_zone, head)
            if next_pos and next_pos not in body_without_tail:
                return (next_pos[0] - head[0], next_pos[1] - head[1])
        
        # 找安全方向
        for d in DIRS:
            nx, ny = head[0] + d[0], head[1] + d[1]
            if self._is_valid((nx, ny)) and (nx, ny) not in body_without_tail:
                return d
        
        return None


def simulate_game(width=8, height=8, max_steps=200000, seed=None):
    if seed is not None:
        random.seed(seed)
    ai = PartitionAI(width, height)
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
    print(f"Partition AI - {w}x{h}")
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
        print(f"Game {i+1:2d}: {length:3d}/{w*h} ({tag}) | {steps}步")
    avg = sum(results) / len(results)
    print(f"平均: {avg:.1f} | 满分: {perfect}/{n}")
    return results, perfect


if __name__ == "__main__":
    run_benchmark(5, 7, 7)
    run_benchmark(5, 9, 9)
    run_benchmark(5, 8, 8)
