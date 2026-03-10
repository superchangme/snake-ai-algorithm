"""
Phase 8 Dynamic Hamilton - 动态 Hamilton 回路算法

核心洞察：
- 7×7 = 49 格，初始蛇长 3
- 剩余空格：46（偶数）→ 可以形成 Hamilton 回路！
- 每吃一个食物，剩余空格奇偶性变化
- 动态判断当前状态，选择最优策略
"""

from collections import deque
import random

UP = (0, -1)
DOWN = (0, 1)
LEFT = (-1, 0)
RIGHT = (1, 0)
DIRS = [UP, DOWN, LEFT, RIGHT]


class DynamicHamiltonAI:
    def __init__(self, width=8, height=8):
        self.width = width
        self.height = height
        self.total = width * height
        self.is_even_grid = (width % 2 == 0 and height % 2 == 0)
    
    def reset_game(self, snake):
        pass
    
    def _is_valid(self, pos):
        x, y = pos
        return 0 <= x < self.width and 0 <= y < self.height
    
    def _get_neighbors(self, pos, blocked):
        """获取有效邻居"""
        x, y = pos
        result = []
        for d in DIRS:
            nx, ny = x + d[0], y + d[1]
            nxt = (nx, ny)
            if self._is_valid(nxt) and nxt not in blocked:
                result.append(nxt)
        return result
    
    def _flood_fill(self, start, blocked):
        """计算可达区域"""
        if start in blocked or not self._is_valid(start):
            return set()
        visited = {start}
        queue = deque([start])
        while queue:
            pos = queue.popleft()
            for nxt in self._get_neighbors(pos, blocked):
                if nxt not in visited:
                    visited.add(nxt)
                    queue.append(nxt)
        return visited
    
    def _find_path_bfs(self, start, goal, blocked):
        """BFS 寻路"""
        if start == goal:
            return [start]
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
    
    def _build_snake_path_in_region(self, region, start, food):
        """在区域内构建蛇形路径"""
        if not region:
            return None
        
        region_list = sorted(region)
        path_order = {pos: i for i, pos in enumerate(region_list)}
        
        return path_order, region_list
    
    def _is_safe_move(self, head, direction, snake):
        """检查移动是否安全"""
        nx, ny = head[0] + direction[0], head[1] + direction[1]
        new_pos = (nx, ny)
        if not self._is_valid(new_pos):
            return False
        body_without_tail = set(snake[:-1])
        if new_pos in body_without_tail:
            return False
        return True
    
    def _evaluate_move(self, head, direction, snake, food):
        """评估移动分数"""
        nx, ny = head[0] + direction[0], head[1] + direction[1]
        new_pos = (nx, ny)
        
        if not self._is_valid(new_pos):
            return -100000
        
        body_without_tail = set(snake[:-1])
        if new_pos in body_without_tail:
            return -100000
        
        # 新的蛇身位置
        new_blocked = body_without_tail.copy()
        new_blocked.add(new_pos)
        
        # 1. 可达区域大小（最重要）
        reachable = self._flood_fill(new_pos, new_blocked)
        area = len(reachable)
        
        # 2. 到食物的距离
        food_dist = abs(nx - food[0]) + abs(ny - food[1])
        
        # 3. 能否到达尾巴
        tail = snake[-1]
        can_reach_tail = tail in reachable
        
        # 4. 周围空格数（避免死角）
        empty_neighbors = len(self._get_neighbors(new_pos, new_blocked))
        
        # 综合评分
        score = area * 100
        score -= food_dist * 10
        score += 500 if can_reach_tail else -200
        score += empty_neighbors * 50
        
        return score
    
    def get_direction(self, snake, food, grid=None):
        head = snake[0]
        snake_set = set(snake)
        
        # ===== 策略选择 =====
        
        # 计算剩余空格
        empty_count = self.total - len(snake)
        
        # 关键洞察：如果剩余空格是偶数，理论上可以形成闭环
        can_form_cycle = (empty_count % 2 == 0)
        
        # 但我们还是用评估函数来选择最佳方向
        # 因为"可以形成闭环"不等于"当前状态下最优"
        
        best_score = float('-inf')
        best_dir = None
        
        for d in DIRS:
            if not self._is_safe_move(head, d, snake):
                continue
            
            score = self._evaluate_move(head, d, snake, food)
            
            if score > best_score:
                best_score = score
                best_dir = d
        
        if best_dir:
            return best_dir
        
        # 兜底：任意安全方向
        for d in DIRS:
            nx, ny = head[0] + d[0], head[1] + d[1]
            if self._is_valid((nx, ny)) and (nx, ny) not in snake_set:
                return d
        
        return None


def simulate_game(width=8, height=8, max_steps=200000, seed=None):
    if seed is not None:
        random.seed(seed)
    ai = DynamicHamiltonAI(width, height)
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
    print(f"Dynamic Hamilton AI - {w}x{h} ({'偶数' if w%2==0 and h%2==0 else '奇数'})")
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
