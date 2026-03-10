"""
Phase 11 Unified AI - 统一算法

核心思路（适用于所有网格）：
1. BFS 找到食物的最短路径
2. 虚拟蛇模拟：模拟吃完后的状态
3. 安全检测：吃完后能否到达尾巴？
4. 能 → 走这条路径
5. 不能 → 跟随蛇尾

偶数网格额外优化：
- 如果检测到可以安全走捷径，就不需要绕路
- 理论上可以大幅减少步数
"""

from collections import deque
import random

UP = (0, -1)
DOWN = (0, 1)
LEFT = (-1, 0)
RIGHT = (1, 0)
DIRS = [UP, DOWN, LEFT, RIGHT]


class UnifiedAI:
    def __init__(self, width=8, height=8):
        self.width = width
        self.height = height
        self.total = width * height
        self.is_even = (width % 2 == 0 and height % 2 == 0)
        self.steps = 0  # 统计步数
    
    def reset_game(self, snake):
        self.steps = 0
    
    def _is_valid(self, pos):
        x, y = pos
        return 0 <= x < self.width and 0 <= y < self.height
    
    def _bfs_path(self, start, goal, blocked):
        """BFS 找最短路径"""
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
    
    def _simulate_eat_food(self, snake, food_path):
        """模拟蛇沿路径吃食物"""
        virtual_snake = list(snake)
        
        for i in range(1, len(food_path)):
            new_head = food_path[i]
            virtual_snake.insert(0, new_head)
            
            # 最后一步是吃食物，不移除尾巴
            if i < len(food_path) - 1:
                virtual_snake.pop()
        
        return virtual_snake
    
    def _can_reach_tail(self, head, snake):
        """检查能否到达蛇尾"""
        if len(snake) < 4:
            return True
        
        tail = snake[-1]
        blocked = set(snake[:-1])
        
        return self._bfs_path(head, tail, blocked) is not None
    
    def _is_safe_to_eat(self, snake, food_path):
        """检查沿路径吃食物是否安全"""
        virtual_snake = self._simulate_eat_food(snake, food_path)
        virtual_head = virtual_snake[0]
        
        return self._can_reach_tail(virtual_head, virtual_snake)
    
    def _follow_tail(self, snake):
        """跟随蛇尾策略"""
        head = snake[0]
        tail = snake[-1]
        body_without_tail = set(snake[:-1])
        
        candidates = []
        
        for d in DIRS:
            nx, ny = head[0] + d[0], head[1] + d[1]
            nxt = (nx, ny)
            
            if not self._is_valid(nxt):
                continue
            if nxt in body_without_tail:
                continue
            
            # 计算安全分数
            new_snake = [nxt] + snake[:-1]
            can_tail = self._can_reach_tail(nxt, new_snake)
            
            # 到尾巴的距离
            tail_dist = abs(nx - tail[0]) + abs(ny - tail[1])
            
            score = 0
            if can_tail:
                score += 1000
            score -= tail_dist
            
            candidates.append((score, d, nxt))
        
        if not candidates:
            for d in DIRS:
                nx, ny = head[0] + d[0], head[1] + d[1]
                if self._is_valid((nx, ny)) and (nx, ny) not in set(snake):
                    return d
            return None
        
        candidates.sort(reverse=True)
        return candidates[0][1]
    
    def get_direction(self, snake, food, grid=None):
        head = snake[0]
        body = set(snake[1:])
        
        self.steps += 1
        
        # 1. BFS 找食物路径
        food_path = self._bfs_path(head, food, body)
        
        if food_path and len(food_path) > 1:
            # 2. 虚拟蛇模拟检查
            if self._is_safe_to_eat(snake, food_path):
                first_step = food_path[1]
                return (first_step[0] - head[0], first_step[1] - head[1])
        
        # 3. 不安全，跟随蛇尾
        return self._follow_tail(snake)


def simulate_game(width=8, height=8, max_steps=200000, seed=None):
    if seed is not None:
        random.seed(seed)
    ai = UnifiedAI(width, height)
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
    no_food = 0
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
            no_food = 0
            food = place_food()
            if not food:
                return len(snake), True, steps
        else:
            snake.pop()
            no_food += 1
        if no_food > max_no_food:
            break
        steps += 1
    return len(snake), len(snake) == width * height, steps


def run_benchmark(n=10, w=8, h=8):
    print(f"\n{'='*50}")
    print(f"Unified AI - {w}x{h} ({'偶数' if w%2==0 and h%2==0 else '奇数'})")
    print(f"{'='*50}")
    results = []
    steps_list = []
    perfect = 0
    for i in range(n):
        length, is_perfect, steps = simulate_game(w, h, seed=i * 42 + 7)
        results.append(length)
        steps_list.append(steps)
        if is_perfect:
            perfect += 1
        pct = length * 100 // (w * h)
        tag = '满分✅' if is_perfect else f'{pct}%'
        print(f"Game {i+1:2d}: {length:3d}/{w*h} ({tag}) | 步数: {steps}")
    avg = sum(results) / len(results)
    avg_steps = sum(steps_list) / len(steps_list)
    print(f"\n平均: {avg:.1f} | 满分: {perfect}/{n} ({perfect*100//n}%) | 平均步数: {avg_steps:.0f}")
    return results, perfect * 100 // n, avg_steps


if __name__ == "__main__":
    run_benchmark(10, 8, 8)
    run_benchmark(10, 7, 7)
