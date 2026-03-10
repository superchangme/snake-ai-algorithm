"""
Phase 10 Virtual Snake AI - 虚拟蛇模拟算法

核心思路（来自用户提供的解决方案）：
1. BFS 找到食物的路径
2. 虚拟蛇模拟：模拟吃完食物后的完整状态
3. 安全检测：吃完后能否到达蛇尾？
4. 如果安全 → 走这条路径
5. 如果不安全 → 跟随蛇尾移动

关键改进：
- 不是只检查"这一步"，而是检查"吃完食物后"的状态
- 使用虚拟蛇模拟完整的吃食物过程
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
        """BFS 找最短路径"""
        if start == goal:
            return [start]
        if start in blocked or goal in blocked:
            return None
        
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
    
    def _can_reach_tail(self, head, snake):
        """检查从 head 能否到达蛇尾"""
        if len(snake) < 4:
            return True
        
        tail = snake[-1]
        blocked = set(snake[:-1])  # 蛇身（不包括尾巴）
        
        return self._bfs_path(head, tail, blocked) is not None
    
    def _simulate_eat_food(self, snake, food_path):
        """
        模拟蛇沿着 food_path 吃食物
        返回：吃完后的虚拟蛇状态
        """
        virtual_snake = list(snake)
        
        for i in range(1, len(food_path)):
            new_head = food_path[i]
            virtual_snake.insert(0, new_head)
            
            # 如果这一步是食物位置，蛇变长（不移除尾巴）
            if i == len(food_path) - 1:  # 最后一步是吃食物
                pass  # 蛇变长
            else:
                virtual_snake.pop()  # 正常移动，尾巴移走
        
        return virtual_snake
    
    def _is_safe_to_eat(self, snake, food_path):
        """
        检查沿着 food_path 吃食物是否安全
        核心逻辑：
        1. 模拟吃完后的虚拟蛇
        2. 检查虚拟蛇能否到达自己的尾巴
        """
        virtual_snake = self._simulate_eat_food(snake, food_path)
        virtual_head = virtual_snake[0]
        
        return self._can_reach_tail(virtual_head, virtual_snake)
    
    def _follow_tail(self, snake):
        """
        跟随蛇尾策略
        当无法安全吃到食物时，移动到离蛇尾最近的安全位置
        """
        head = snake[0]
        tail = snake[-1]
        body_without_tail = set(snake[:-1])
        
        # 尝试到达蛇尾附近
        tail_path = self._bfs_path(head, tail, body_without_tail)
        
        if tail_path and len(tail_path) > 1:
            return (tail_path[1][0] - head[0], tail_path[1][1] - head[1])
        
        # 如果连蛇尾都到达不了，找任意安全方向
        safe_moves = []
        for d in DIRS:
            nx, ny = head[0] + d[0], head[1] + d[1]
            nxt = (nx, ny)
            if self._is_valid(nxt) and nxt not in body_without_tail:
                # 计算这个方向的安全性分数
                new_snake = [nxt] + snake[:-1]
                if self._can_reach_tail(nxt, new_snake):
                    safe_moves.append((1000, d))
                else:
                    safe_moves.append((0, d))
        
        if safe_moves:
            safe_moves.sort(reverse=True)
            return safe_moves[0][1]
        
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
    
    def get_direction(self, snake, food, grid=None):
        head = snake[0]
        body_without_tail = set(snake[:-1])
        
        # ===== 偶数网格：Hamilton 回路 =====
        if self.is_even:
            next_pos = self._next_in_cycle(head)
            if next_pos and next_pos not in body_without_tail:
                d = (next_pos[0] - head[0], next_pos[1] - head[1])
                return d
        
        # ===== 奇数网格：虚拟蛇模拟 =====
        
        # 1. BFS 找到食物的路径
        food_path = self._bfs_path(head, food, set(snake))
        
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
    print(f"Virtual Snake AI - {w}x{h} ({'偶数' if w%2==0 and h%2==0 else '奇数'})")
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
