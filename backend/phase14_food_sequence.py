"""
Phase 14 - 食物序列预判（v3优化版）

基于v3，优化奇数网格策略：
1. 保持v3核心逻辑：BFS找食物 + 虚拟蛇安全检查
2. 增加食物选择优化：当有多个安全路径时，选择更优的
3. 优化跟随尾巴策略：让它更有效地填满空间

偶数网格：纯哈密顿回路（保持100%）
奇数网格：BFS + 虚拟蛇 + 优化跟随尾巴
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
    
    def reset_game(self, snake):
        pass
    
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
    
    def _bfs_dist(self, start, goal, blocked):
        """BFS计算最短距离"""
        if start == goal:
            return 0
        queue = deque([(start, 0)])
        visited = {start}
        while queue:
            pos, dist = queue.popleft()
            for d in DIRS:
                nx, ny = pos[0] + d[0], pos[1] + d[1]
                nxt = (nx, ny)
                if self._is_valid(nxt) and nxt not in blocked and nxt not in visited:
                    if nxt == goal:
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
    
    def _prev_in_cycle(self, pos):
        """获取哈密顿回路的上一个位置"""
        if not self.order:
            return None
        x, y = pos
        if not self._is_valid(pos):
            return None
        idx = self.order[y][x]
        prev_idx = (idx - 1) % self.total
        return self.path[prev_idx]
    
    def _count_accessible(self, start, blocked, limit=30):
        """计算可达格子数量"""
        queue = deque([start])
        visited = {start}
        count = 1
        while queue and count < limit:
            pos = queue.popleft()
            for d in DIRS:
                nx, ny = pos[0] + d[0], pos[1] + d[1]
                nxt = (nx, ny)
                if self._is_valid(nxt) and nxt not in blocked and nxt not in visited:
                    visited.add(nxt)
                    queue.append(nxt)
                    count += 1
        return count
    
    def _follow_tail_optimized(self, snake):
        """优化的跟随蛇尾策略"""
        head = snake[0]
        tail = snake[-1]
        body_without_tail = set(snake[:-1])
        body_all = set(snake[1:])
        
        best_dir = None
        best_score = -float('inf')
        
        for d in DIRS:
            nx, ny = head[0] + d[0], head[1] + d[1]
            nxt = (nx, ny)
            if self._is_valid(nxt) and nxt not in body_without_tail:
                # 计算能否到达尾巴
                new_snake = [nxt] + snake[:-1]
                can_tail = len(new_snake) < 4 or self._bfs_path(nxt, new_snake[-1], set(new_snake[:-1]))
                
                # 计算可达空间
                accessible = self._count_accessible(nxt, body_all, limit=25)
                
                # 计算到尾巴的距离（曼哈顿）
                tail_dist = abs(nxt[0] - tail[0]) + abs(nxt[1] - tail[1])
                
                # 计算到中心的距离（鼓励舒展）
                center_x, center_y = self.width // 2, self.height // 2
                center_dist = abs(nxt[0] - center_x) + abs(nxt[1] - center_y)
                
                # 综合评分
                score = 0
                if can_tail:
                    score += 1000  # 能到尾巴最重要
                score += accessible * 10  # 可达空间
                score -= tail_dist * 2  # 靠近尾巴
                score += center_dist  # 远离中心（舒展蛇身）
                
                if score > best_score:
                    best_score = score
                    best_dir = d
        
        return best_dir
    
    def _hamilton_next_safe(self, snake):
        """安全的哈密顿下一步"""
        head = snake[0]
        next_pos = self._next_in_cycle(head)
        
        if next_pos is None:
            return None
        
        if next_pos in set(snake[:-1]):
            tail_expected = self._prev_in_cycle(head)
            tail = snake[-1]
            
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
        body_without_tail = set(snake[:-1])
        body_all = set(snake[1:])
        
        # 偶数网格：纯哈密顿回路
        if self.is_even:
            return self._hamilton_next_safe(snake)
        
        # 奇数网格策略
        # 1. 尝试BFS找食物路径
        food_path = self._bfs_path(head, food, body_all)
        
        if food_path and len(food_path) > 1:
            # 模拟吃完食物
            virtual_snake = list(snake)
            for i in range(1, len(food_path)):
                virtual_snake.insert(0, food_path[i])
                if i < len(food_path) - 1:
                    virtual_snake.pop()
            
            # 检查吃完后能否到达尾巴
            virtual_body = set(virtual_snake[1:])
            can_reach_tail = len(virtual_snake) < 4 or self._bfs_path(virtual_snake[0], virtual_snake[-1], virtual_body)
            
            if can_reach_tail:
                # 额外检查：吃完后可达空间是否充足
                accessible = self._count_accessible(virtual_snake[0], virtual_body, limit=20)
                snake_len = len(virtual_snake)
                ratio = snake_len / self.total
                
                # 如果蛇较长（>50%），需要更多检查
                if ratio > 0.5:
                    # 至少需要能到达3个格子
                    if accessible >= 3:
                        first_step = food_path[1]
                        return (first_step[0] - head[0], first_step[1] - head[1])
                else:
                    # 蛇较短，直接吃
                    first_step = food_path[1]
                    return (first_step[0] - head[0], first_step[1] - head[1])
        
        # 无法安全吃食物，跟随尾巴
        return self._follow_tail_optimized(snake)


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
    print(f"Phase 14 Food Sequence v3 - {w}x{h} ({'偶数' if w%2==0 and h%2==0 else '奇数'})")
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
    run_benchmark(10, 7, 7)
    run_benchmark(10, 9, 9)
    run_benchmark(10, 8, 8)
