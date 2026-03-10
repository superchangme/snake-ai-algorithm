"""
Phase 8 Virtual Cycle AI - 虚拟闭环策略
核心思路：
1. 为奇数网格构建"虚拟闭环"（虽然数学上不可能，但行为上类似）
2. 关键：蛇沿着路径走，但时刻保持"尾巴可达"
3. 如果尾巴不可达 → 说明即将被困 → 立即绕行
"""

from collections import deque
import random

UP = (0, -1)
DOWN = (0, 1)
LEFT = (-1, 0)
RIGHT = (1, 0)
DIRS = [UP, DOWN, LEFT, RIGHT]


def build_zigzag_path(width, height):
    """构建蛇形路径（适用于任意尺寸）"""
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


class VirtualCycleAI:
    def __init__(self, width=8, height=8):
        self.width = width
        self.height = height
        self.total = width * height
        self.order, self.path = build_zigzag_path(width, height)
        self.is_even = (width % 2 == 0 and height % 2 == 0)
    
    def reset_game(self, snake):
        pass
    
    def _is_valid(self, pos):
        x, y = pos
        return 0 <= x < self.width and 0 <= y < self.height
    
    def _neighbors(self, pos):
        """获取有效邻居"""
        x, y = pos
        result = []
        for d in DIRS:
            nx, ny = x + d[0], y + d[1]
            if self._is_valid((nx, ny)):
                result.append((nx, ny))
        return result
    
    def _next_in_path(self, pos):
        """路径上的下一个位置"""
        x, y = pos
        if not self._is_valid(pos):
            return None
        idx = self.order[y][x]
        next_idx = (idx + 1) % self.total
        return self.path[next_idx]
    
    def _prev_in_path(self, pos):
        """路径上的上一个位置（尾巴方向）"""
        x, y = pos
        if not self._is_valid(pos):
            return None
        idx = self.order[y][x]
        prev_idx = (idx - 1) % self.total
        return self.path[prev_idx]
    
    def _dir(self, a, b):
        return (b[0] - a[0], b[1] - a[1])
    
    def _bfs_distance(self, start, goal, blocked):
        """BFS 计算距离"""
        if start == goal:
            return 0
        queue = deque([(start, 0)])
        visited = {start}
        while queue:
            pos, dist = queue.popleft()
            for nxt in self._neighbors(pos):
                if nxt not in blocked and nxt not in visited:
                    if nxt == goal:
                        return dist + 1
                    visited.add(nxt)
                    queue.append((nxt, dist + 1))
        return float('inf')
    
    def _can_reach_tail(self, head, snake):
        """检查是否能到达尾巴"""
        if len(snake) < 3:
            return True
        tail = snake[-1]
        blocked = set(snake[:-1])  # 蛇身（不包括尾巴）
        return self._bfs_distance(head, tail, blocked) < float('inf')
    
    def _is_after_tail(self, pos, tail, snake_len):
        """检查 pos 是否在尾巴"后面"（沿着路径方向）"""
        if not self._is_valid(pos) or not self._is_valid(tail):
            return False
        pos_idx = self.order[pos[1]][pos[0]]
        tail_idx = self.order[tail[1]][tail[0]]
        
        # 在路径上，pos 应该在 tail 后面
        if pos_idx > tail_idx:
            return True
        # 处理环形情况
        if self.is_even:
            return (pos_idx - tail_idx) % self.total < self.total // 2
        return pos_idx > tail_idx
    
    def get_direction(self, snake, food, grid=None):
        head = snake[0]
        tail = snake[-1]
        snake_set = set(snake)
        snake_len = len(snake)
        
        # 辅助函数：检查方向是否安全
        def is_safe(pos):
            return self._is_valid(pos) and pos not in snake_set
        
        def is_safe_with_tail(pos):
            return self._is_valid(pos) and pos not in set(snake[:-1])
        
        # ===== 核心策略 =====
        
        # 1. 尝试沿路径走
        next_pos = self._next_in_path(head)
        if next_pos and is_safe_with_tail(next_pos):
            # 关键检查：走这步后还能到达尾巴吗？
            future_snake = [next_pos] + snake[:-1]
            if self._can_reach_tail(next_pos, future_snake):
                return self._dir(head, next_pos)
        
        # 2. 如果路径方向不安全，找替代方向
        candidates = []
        for d in DIRS:
            nx, ny = head[0] + d[0], head[1] + d[1]
            nxt = (nx, ny)
            if not is_safe_with_tail(nxt):
                continue
            
            # 计算这个方向的分数
            score = 0
            
            # A. 检查能否到达尾巴
            future_snake = [nxt] + snake[:-1]
            if self._can_reach_tail(nxt, future_snake):
                score += 1000
            else:
                score -= 500  # 无法到达尾巴很危险
            
            # B. 检查是否在路径上"正确"的位置（在尾巴后面）
            if self._is_after_tail(nxt, tail, snake_len):
                score += 100
            
            # C. 到食物的距离
            food_dist = abs(nx - food[0]) + abs(ny - food[1])
            score -= food_dist * 10
            
            # D. 可达空间大小
            blocked = set(snake[:-1])
            blocked.add(nxt)
            area = 0
            visited = {nxt}
            queue = deque([nxt])
            while queue and area < 50:
                p = queue.popleft()
                area += 1
                for nb in self._neighbors(p):
                    if nb not in blocked and nb not in visited:
                        visited.add(nb)
                        queue.append(nb)
            score += area
            
            candidates.append((score, d, nxt))
        
        if not candidates:
            # 最后尝试：任意安全方向
            for d in DIRS:
                nx, ny = head[0] + d[0], head[1] + d[1]
                if is_safe((nx, ny)):
                    return d
            return None
        
        # 选择最高分
        candidates.sort(reverse=True)
        return candidates[0][1]


def simulate_game(width=8, height=8, max_steps=100000, seed=None):
    if seed is not None:
        random.seed(seed)
    ai = VirtualCycleAI(width, height)
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
    print(f"Phase 8 Virtual Cycle AI - {w}x{h} ({'偶数' if w%2==0 and h%2==0 else '奇数'})")
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
    run_benchmark(10, 8, 8)
    run_benchmark(10, 7, 7)
    run_benchmark(10, 9, 9)
