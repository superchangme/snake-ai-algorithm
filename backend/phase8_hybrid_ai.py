"""
Phase 8 Hybrid AI - 混合策略
- 偶数网格：Hamilton 闭环（已验证满分）
- 奇数网格：智能贪婪 + 逃脱检测（不依赖固定路径）
"""

from collections import deque
import random

UP = (0, -1)
DOWN = (0, 1)
LEFT = (-1, 0)
RIGHT = (1, 0)
DIRS = [UP, DOWN, LEFT, RIGHT]


def build_hamilton_cycle(width, height):
    """构建偶数网格的 Hamilton 闭环"""
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


class HybridSnakeAI:
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
    
    def _is_safe(self, head, direction, snake_set):
        nx, ny = head[0] + direction[0], head[1] + direction[1]
        return self._is_valid((nx, ny)) and (nx, ny) not in snake_set
    
    def _flood_fill(self, start, blocked):
        """计算可达区域大小"""
        if start in blocked or not self._is_valid(start):
            return 0
        visited = {start}
        queue = deque([start])
        while queue:
            x, y = queue.popleft()
            for d in DIRS:
                nx, ny = x + d[0], y + d[1]
                nxt = (nx, ny)
                if self._is_valid(nxt) and nxt not in blocked and nxt not in visited:
                    visited.add(nxt)
                    queue.append(nxt)
        return len(visited)
    
    def _bfs_to_food(self, head, food, snake_set):
        """BFS 找到食物的最短路径"""
        if head == food:
            return []
        queue = deque([(head, [])])
        visited = {head}
        while queue:
            pos, path = queue.popleft()
            for d in DIRS:
                nx, ny = pos[0] + d[0], pos[1] + d[1]
                nxt = (nx, ny)
                if self._is_valid(nxt) and nxt not in snake_set and nxt not in visited:
                    new_path = path + [d]
                    if nxt == food:
                        return new_path
                    visited.add(nxt)
                    queue.append((nxt, new_path))
        return None
    
    def _can_reach_tail(self, head, snake):
        """检查是否能到达自己的尾巴（避免被困）"""
        if len(snake) < 4:
            return True
        tail = snake[-1]
        snake_set = set(snake[:-1])  # 不包括尾巴
        return self._bfs_to_food(head, tail, snake_set) is not None
    
    def _next_in_cycle(self, pos):
        """获取 Hamilton 闭环的下一个位置"""
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
    
    def _evaluate_move(self, head, direction, snake, food):
        """评估一个移动的分数"""
        nx, ny = head[0] + direction[0], head[1] + direction[1]
        new_pos = (nx, ny)
        
        if not self._is_valid(new_pos):
            return -10000
        
        snake_set = set(snake)
        if new_pos in snake_set and new_pos != snake[-1]:
            return -10000
        
        # 计算新状态
        new_snake_set = snake_set.copy()
        new_snake_set.add(new_pos)
        if new_pos != snake[-1]:  # 没吃到食物
            new_snake_set.discard(snake[-1])
        
        # 评分因子
        # 1. 可达区域大小（最重要）
        area = self._flood_fill(new_pos, new_snake_set)
        
        # 2. 到食物的距离
        food_dist = abs(nx - food[0]) + abs(ny - food[1])
        
        # 3. 是否能到达尾巴
        can_tail = 100 if self._can_reach_tail(new_pos, list(new_snake_set)) else 0
        
        # 4. 是否沿着 Hamilton 路径（偶数网格）
        ham_bonus = 0
        if self.is_even and self.order:
            next_pos = self._next_in_cycle(head)
            if next_pos == new_pos:
                ham_bonus = 50
        
        return area * 100 - food_dist * 10 + can_tail + ham_bonus
    
    def get_direction(self, snake, food, grid=None):
        head = snake[0]
        snake_set = set(snake)
        
        # ===== 偶数网格：优先 Hamilton 闭环 =====
        if self.is_even:
            next_pos = self._next_in_cycle(head)
            if next_pos:
                direction = self._dir(head, next_pos)
                if self._is_safe(head, direction, snake_set - {snake[-1]}):
                    return direction
        
        # ===== 通用策略：智能贪婪 =====
        # 收集所有可能的方向并评分
        moves = []
        for d in DIRS:
            if self._is_safe(head, d, snake_set - {snake[-1]}):
                score = self._evaluate_move(head, d, snake, food)
                moves.append((score, d))
        
        if not moves:
            # 最后尝试：任意安全方向
            for d in DIRS:
                if self._is_safe(head, d, snake_set):
                    return d
            return None
        
        # 按分数排序，选最高
        moves.sort(reverse=True)
        return moves[0][1]


def simulate_game(width=8, height=8, max_steps=50000, seed=None):
    if seed is not None:
        random.seed(seed)
    ai = HybridSnakeAI(width, height)
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
    max_no_food = width * height * 4
    
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
    print(f"Phase 8 Hybrid AI - {w}x{h} Grid ({'偶数' if w%2==0 and h%2==0 else '奇数'})")
    print(f"{'='*50}")
    results = []
    perfect = 0
    for i in range(n):
        length, is_perfect = simulate_game(w, h, seed=i * 42 + 7)
        results.append(length)
        if is_perfect:
            perfect += 1
        tag = '满分✅' if is_perfect else f'{length * 100 // (w * h)}%'
        print(f"Game {i+1:2d}: {length:3d}/{w*h} ({tag})")
    avg = sum(results) / len(results)
    print(f"\n平均: {avg:.1f} | 满分: {perfect}/{n} ({perfect*100//n}%)")
    return results, perfect * 100 // n


if __name__ == "__main__":
    run_benchmark(10, 8, 8)
    run_benchmark(10, 7, 7)
    run_benchmark(10, 9, 9)
    run_benchmark(10, 10, 10)
