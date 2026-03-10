"""
Phase 16 - 2步前瞻版
增加2步前瞻检查
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


class TwoStepAI:
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
        snake_set = set(snake)
        
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
    
    def _can_reach(self, start, goal, blocked):
        return self._bfs_path(start, goal, blocked) is not None
    
    def _safe_to_eat(self, snake, food):
        """检查吃完食物后是否安全"""
        head = snake[0]
        body = set(snake[1:])
        
        # 移动到食物
        path = self._bfs_path(head, food, body)
        if not path or len(path) < 2:
            return False
        
        # 模拟吃完
        new_snake = [food] + snake[:-1]
        
        # 检查能否到达尾巴
        if len(new_snake) < 4:
            return True
        return self._can_reach(new_snake[0], new_snake[-1], set(new_snake[1:-1]))
    
    def _two_step_check(self, snake, food):
        """2步前瞻：吃完这个食物后，还能吃到下一个食物吗？"""
        head = snake[0]
        body = set(snake[1:])
        
        # 移动到食物
        path = self._bfs_path(head, food, body)
        if not path or len(path) < 2:
            return False, None
        
        # 模拟吃完
        new_snake = [food] + snake[:-1]
        new_body = set(new_snake[1:])
        
        # 模拟生成几个可能的下一个食物位置
        next_foods = []
        for _ in range(3):
            empty = [(x, y) for x in range(self.width) for y in range(self.height) 
                     if (x, y) not in new_body]
            if empty:
                next_foods.append(random.choice(empty))
        
        if not next_foods:
            return True, None
        
        # 检查能否到达至少一个下一个食物
        reachable_count = 0
        reachable_food = None
        for nf in next_foods:
            if self._can_reach(new_snake[0], nf, new_body):
                reachable_count += 1
                if reachable_food is None:
                    reachable_food = nf
        
        # 如果吃完当前食物后还能到达至少1个下一个食物，且能到达尾巴，则安全
        can_tail = len(new_snake) < 4 or self._can_reach(new_snake[0], new_snake[-1], set(new_snake[1:-1]))
        
        if can_tail and reachable_count >= 1:
            return True, reachable_food
        return False, None
    
    def _smart_follow_tail(self, snake):
        head = snake[0]
        tail = snake[-1]
        body_without_tail = set(snake[:-1])
        
        candidates = []
        for d in DIRS:
            nx, ny = head[0] + d[0], head[1] + d[1]
            nxt = (nx, ny)
            if not self._is_valid(nxt) or nxt in body_without_tail:
                continue
            
            new_snake = [nxt] + snake[:-1]
            can_tail = len(new_snake) < 4 or self._can_reach(nxt, new_snake[-1], set(new_snake[:-1]))
            
            score = 0
            if can_tail:
                score += 100
            
            away_score = (nx - tail[0]) * d[0] + (ny - tail[1]) * d[1]
            score += away_score * 2
            
            if nx == 0 or nx == self.width - 1:
                score += 5
            if ny == 0 or ny == self.height - 1:
                score += 5
            
            candidates.append((score, d))
        
        if candidates:
            candidates.sort(reverse=True)
            return candidates[0][1]
        return None
    
    def get_direction(self, snake, food, grid=None):
        head = snake[0]
        body_without_tail = set(snake[:-1])
        
        if self.is_even:
            return self._hamilton_next_safe(snake)
        
        # 2步前瞻检查
        safe, next_food = self._two_step_check(snake, food)
        
        if safe:
            # 安全的吃
            food_path = self._bfs_path(head, food, body_without_tail)
            if food_path and len(food_path) > 1:
                first_step = food_path[1]
                return (first_step[0] - head[0], first_step[1] - head[1])
        
        return self._smart_follow_tail(snake)


def simulate_game(width=8, height=8, max_steps=200000, seed=None):
    if seed is not None:
        random.seed(seed)
    ai = TwoStepAI(width, height)
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
    print(f"Two-Step AI v16 - {w}x{h}")
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
        print(f"Game {i+1:2d}: {length:3d}/{w*h} ({tag}) | 步数: {steps}")
    avg = sum(results) / len(results)
    print(f"平均: {avg:.1f} | 满分: {perfect}/{n}")
    return results, perfect


if __name__ == "__main__":
    run_benchmark(5, 7, 7)
    run_benchmark(5, 9, 9)
    run_benchmark(5, 8, 8)
