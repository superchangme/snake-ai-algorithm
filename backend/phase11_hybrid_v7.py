"""
Phase 11 Hybrid v7 - 智能跟随尾巴

改进：
1. 路径连通性检查（不只是距离）
2. 根据网格大小设置阈值
3. 更聪明的跟随尾巴策略
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
        
        # 根据网格大小设置阈值
        self.min_free_space = 15 if width <= 7 else 20
        self.max_food_distance = 4 if width <= 7 else 5
    
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
    
    def _count_free_space(self, pos, blocked):
        """计算从位置出发可以到达多少空格（连通分量大小）"""
        if pos in blocked:
            return 0
        
        queue = deque([pos])
        visited = {pos}
        count = 0
        
        while queue:
            current = queue.popleft()
            count += 1
            for d in DIRS:
                nx, ny = current[0] + d[0], current[1] + d[1]
                nxt = (nx, ny)
                if self._is_valid(nxt) and nxt not in blocked and nxt not in visited:
                    visited.add(nxt)
                    queue.append(nxt)
        
        return count
    
    def _distance_to_food(self, head, food, body):
        path = self._bfs_path(head, food, body)
        return len(path) - 1 if path else 999
    
    def _smart_follow_tail(self, snake):
        """
        智能跟随尾巴：
        1. 找能保持连通性的方向
        2. 优先选择空格更多的方向
        """
        head = snake[0]
        body_list = list(snake)
        body_without_tail = set(snake[:-1])
        tail = snake[-1]
        
        candidates = []
        
        for d in DIRS:
            nx, ny = head[0] + d[0], head[1] + d[1]
            nxt = (nx, ny)
            
            if not self._is_valid(nxt):
                continue
            if nxt in body_without_tail:
                continue
            
            # 模拟移动
            new_snake = [nxt] + snake[:-1]
            new_body = set(new_snake)
            
            # 必须能存活：能到尾巴
            can_reach_tail = len(new_snake) < 4 or self._can_reach(nxt, tail, new_body)
            
            if not can_reach_tail:
                continue
            
            # 计算移动后的连通空间
            free_space = self._count_free_space(nxt, new_body)
            
            # 计算到最近食物的距离
            food = (self.width // 2, self.height // 2)  # 简化
            food_dist = self._distance_to_food(nxt, food, new_body)
            
            # 分数 = 连通空间 - 食物距离（优先空格多，其次离食物近）
            score = free_space * 10 - food_dist
            
            candidates.append((score, d))
        
        if candidates:
            candidates.sort(reverse=True)
            return candidates[0][1]
        
        return None
    
    def _next_in_cycle(self, pos):
        if not self.order:
            return None
        x, y = pos
        if not self._is_valid(pos):
            return None
        idx = self.order[y][x]
        next_idx = (idx + 1) % self.total
        return self.path[next_idx]
    
    def _prev_in_cycle(self, pos):
        if not self.order:
            return None
        x, y = pos
        if not self._is_valid(pos):
            return None
        idx = self.order[y][x]
        prev_idx = (idx - 1) % self.total
        return self.path[prev_idx]
    
    def _hamilton_next_safe(self, snake):
        head = snake[0]
        tail = snake[-1]
        
        next_pos = self._next_in_cycle(head)
        
        if next_pos is None:
            return None
        
        if next_pos in set(snake[:-1]):
            tail_expected = self._prev_in_cycle(head)
            
            if tail == tail_expected:
                return (next_pos[0] - head[0], next_pos[1] - head[1])
            else:
                for d in DIRS:
                    nx, ny = head[0] + d[0], head[1] + d[1]
                    if self._is_valid((nx, ny)) and (nx, ny) not in set(snake[:-1]):
                        return d
                return None
        
        return (next_pos[0] - head[0], next_pos[1] - head[1])
    
    def get_direction(self, snake, food, grid=None):
        head = snake[0]
        body = set(snake[1:])
        
        # 偶数网格：哈密顿回路
        if self.is_even:
            return self._hamilton_next_safe(snake)
        
        # 奇数网格
        else:
            # 1. 计算到食物的距离
            food_dist = self._distance_to_food(head, food, body)
            
            # 2. 尝试找食物路径
            food_path = self._bfs_path(head, food, body)
            
            if food_path and len(food_path) > 1:
                # 模拟吃完
                virtual_snake = list(snake)
                for i in range(1, len(food_path)):
                    virtual_snake.insert(0, food_path[i])
                    if i < len(food_path) - 1:
                        virtual_snake.pop()
                
                virtual_head = virtual_snake[0]
                virtual_body = set(virtual_snake[:-1])
                
                # 检查能否到达尾巴
                can_reach_tail = len(virtual_snake) < 4 or self._can_reach(virtual_head, virtual_snake[-1], virtual_body)
                
                # 检查吃完后的连通空间
                free_space = self._count_free_space(virtual_head, virtual_body)
                
                # 决策：距离近 + 有足够空间 → 吃
                should_eat = (
                    food_dist <= self.max_food_distance and 
                    can_reach_tail and 
                    free_space >= self.min_free_space
                )
                
                if should_eat:
                    first_step = food_path[1]
                    return (first_step[0] - head[0], first_step[1] - head[1])
            
            # 3. 智能跟随尾巴
            return self._smart_follow_tail(snake)


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
    print(f"Hybrid AI v7 - {w}x{h} (智能版)")
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
