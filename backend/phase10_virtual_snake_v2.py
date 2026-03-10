"""
Phase 10 Virtual Snake AI v2 - 修复版

修复：
1. BFS 的 blocked 不应包含起点
2. 正确模拟蛇吃食物的过程
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


class VirtualSnakeAI:
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
    
    def _bfs_path(self, start, goal, blocked):
        """
        BFS 找最短路径
        注意：blocked 不应包含 start 和 goal
        """
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
        """
        模拟蛇沿着 food_path 移动并吃食物
        返回：吃完后的虚拟蛇状态
        """
        virtual_snake = list(snake)
        
        for i in range(1, len(food_path)):
            new_head = food_path[i]
            virtual_snake.insert(0, new_head)
            
            # 如果到达食物位置（最后一步），蛇变长
            if i == len(food_path) - 1:
                pass  # 吃食物，不移除尾巴
            else:
                virtual_snake.pop()  # 正常移动
        
        return virtual_snake
    
    def _can_reach_tail(self, head, snake):
        """检查从 head 能否到达蛇尾"""
        if len(snake) < 4:
            return True  # 蛇太短，不用担心
        
        tail = snake[-1]
        # blocked 是蛇身（不包括尾巴）
        blocked = set(snake[:-1])
        
        return self._bfs_path(head, tail, blocked) is not None
    
    def _is_safe_to_eat(self, snake, food_path):
        """
        检查沿着 food_path 吃食物是否安全
        关键：模拟吃完后的状态，检查能否到达尾巴
        """
        virtual_snake = self._simulate_eat_food(snake, food_path)
        virtual_head = virtual_snake[0]
        
        return self._can_reach_tail(virtual_head, virtual_snake)
    
    def _follow_tail(self, snake):
        """
        跟随蛇尾策略
        找一个能到达蛇尾的安全方向
        """
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
            
            # 计算这个方向的安全性
            new_snake = [nxt] + snake[:-1]  # 假设不吃食物
            can_tail = self._can_reach_tail(nxt, new_snake)
            
            # 计算到蛇尾的距离
            tail_dist = abs(nx - tail[0]) + abs(ny - tail[1])
            
            score = 0
            if can_tail:
                score += 1000  # 能到达尾巴最重要
            score -= tail_dist  # 离尾巴近一点
            
            candidates.append((score, d, nxt))
        
        if not candidates:
            # 兜底：任意安全方向
            for d in DIRS:
                nx, ny = head[0] + d[0], head[1] + d[1]
                if self._is_valid((nx, ny)) and (nx, ny) not in set(snake):
                    return d
            return None
        
        candidates.sort(reverse=True)
        return candidates[0][1]
    
    def _next_in_cycle(self, pos):
        if not self.order:
            return None
        x, y = pos
        idx = self.order[y][x]
        next_idx = (idx + 1) % self.total
        return self.path[next_idx]
    
    def get_direction(self, snake, food, grid=None):
        head = snake[0]
        
        # ===== 偶数网格：Hamilton 回路 =====
        if self.is_even:
            next_pos = self._next_in_cycle(head)
            if next_pos and next_pos not in set(snake[:-1]):
                return (next_pos[0] - head[0], next_pos[1] - head[1])
        
        # ===== 奇数网格：虚拟蛇模拟 =====
        snake_set = set(snake)
        
        # 1. BFS 找到食物的路径
        # 注意：blocked 是蛇身（不包括蛇头），这样 BFS 才能从蛇头开始
        blocked = set(snake[1:])  # 蛇身（不包括蛇头）
        food_path = self._bfs_path(head, food, blocked)
        
        if food_path and len(food_path) > 1:
            # 2. 虚拟蛇模拟：检查吃完食物后是否安全
            if self._is_safe_to_eat(snake, food_path):
                # 安全，走第一步
                first_step = food_path[1]
                return (first_step[0] - head[0], first_step[1] - head[1])
        
        # 3. 如果不安全或没有路径，跟随蛇尾
        return self._follow_tail(snake)


def simulate_game(width=8, height=8, max_steps=200000, seed=None):
    if seed is not None:
        random.seed(seed)
    ai = VirtualSnakeAI(width, height)
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
    print(f"Virtual Snake AI v2 - {w}x{h} ({'偶数' if w%2==0 and h%2==0 else '奇数'})")
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
