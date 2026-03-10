"""
Phase 12 Partition v2 - 改进的混合算法

核心思路：
1. 偶数网格：纯哈密顿回路（100%满分）
2. 奇数网格：改进的BFS策略
   - 优先向食物移动
   - 保持与尾巴的连通性
   - 避免自我封锁

改进点：
1. BFS寻找食物时，考虑蛇身移动后的空间
2. 增加安全性检查
3. 智能等待策略
"""

from collections import deque
import random

UP = (0, -1)
DOWN = (0, 1)
LEFT = (-1, 0)
RIGHT = (1, 0)
DIRS = [UP, DOWN, LEFT, RIGHT]


def build_hamilton_cycle(width, height):
    """构建哈密顿回路 - 蛇形路径"""
    if width == 0 or height == 0:
        return None, []
    
    path = []
    for x in range(width):
        if x % 2 == 0:
            for y in range(height):
                path.append((x, y))
        else:
            for y in range(height - 1, -1, -1):
                path.append((x, y))
    
    order = {}
    for i, (px, py) in enumerate(path):
        order[(px, py)] = i
    
    return order, path


class PartitionAI:
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
        """BFS寻路"""
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
    
    def _bfs_distance(self, start, goal, blocked):
        """BFS距离"""
        path = self._bfs_path(start, goal, blocked)
        return len(path) - 1 if path else float('inf')
    
    def _count_reachable(self, start, blocked):
        """统计从start可达的格子数"""
        visited = {start}
        queue = deque([start])
        while queue:
            pos = queue.popleft()
            for d in DIRS:
                nx, ny = pos[0] + d[0], pos[1] + d[1]
                nxt = (nx, ny)
                if self._is_valid(nxt) and nxt not in blocked and nxt not in visited:
                    visited.add(nxt)
                    queue.append(nxt)
        return len(visited)
    
    def _is_safe_move(self, head, direction, snake):
        """检查移动是否安全（不会自我封锁）"""
        nx, ny = head[0] + direction[0], head[1] + direction[1]
        new_head = (nx, ny)
        
        if not self._is_valid(new_head):
            return False
        
        if new_head in set(snake[:-1]):
            return False
        
        # 模拟移动后的蛇
        new_snake = [new_head] + snake[:-1]
        new_body = set(new_snake[:-1])
        
        # 检查能否到达尾巴
        if len(new_snake) < 4:
            return True
        
        tail_path = self._bfs_path(new_head, new_snake[-1], new_body)
        return tail_path is not None
    
    def _next_in_cycle(self, pos):
        if not self.order or not self.path:
            return None
        if pos not in self.order:
            return None
        idx = self.order[pos]
        next_idx = (idx + 1) % len(self.path)
        return self.path[next_idx]
    
    def _prev_in_cycle(self, pos):
        if not self.order or not self.path:
            return None
        if pos not in self.order:
            return None
        idx = self.order[pos]
        prev_idx = (idx - 1) % len(self.path)
        return self.path[prev_idx]
    
    def _hamilton_next_safe(self, snake):
        """安全的哈密顿下一步"""
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
                    if self._is_safe_move(head, d, snake):
                        return d
                return None
        
        return (next_pos[0] - head[0], next_pos[1] - head[1])
    
    def _follow_tail(self, snake):
        """跟随蛇尾策略"""
        head = snake[0]
        tail = snake[-1]
        body = set(snake[1:])
        
        # 尝试直接到达尾巴
        tail_path = self._bfs_path(head, tail, body)
        if tail_path and len(tail_path) > 1:
            # 检查第一步是否安全
            first = tail_path[1]
            d = (first[0] - head[0], first[1] - head[1])
            if self._is_safe_move(head, d, snake):
                return d
        
        # 选择最远离食物但安全的方向（给尾巴时间移动）
        candidates = []
        for d in DIRS:
            if self._is_safe_move(head, d, snake):
                nx, ny = head[0] + d[0], head[1] + d[1]
                new_pos = (nx, ny)
                # 评估这个位置的价值
                new_snake = [new_pos] + snake[:-1]
                new_body = set(new_snake[:-1])
                reachable = self._count_reachable(new_pos, new_body)
                candidates.append((reachable, d))
        
        if candidates:
            candidates.sort(reverse=True)
            return candidates[0][1]
        
        return None
    
    def _smart_bfs_to_food(self, snake, food):
        """智能BFS寻找食物"""
        head = snake[0]
        body = set(snake[1:])
        
        food_path = self._bfs_path(head, food, body)
        
        if food_path and len(food_path) > 1:
            # 模拟吃完食物后的蛇
            virtual_snake = list(snake)
            for i in range(1, len(food_path)):
                virtual_snake.insert(0, food_path[i])
                if i < len(food_path) - 1:
                    virtual_snake.pop()
            
            virtual_body = set(virtual_snake[:-1])
            
            # 检查能否到达尾巴
            can_reach_tail = len(virtual_snake) < 4 or self._bfs_path(virtual_snake[0], virtual_snake[-1], virtual_body)
            
            if can_reach_tail:
                first = food_path[1]
                return (first[0] - head[0], first[1] - head[1])
        
        return None
    
    def get_direction(self, snake, food, grid=None):
        head = snake[0]
        
        # ===== 偶数网格：纯哈密顿回路 =====
        if self.is_even:
            return self._hamilton_next_safe(snake)
        
        # ===== 奇数网格：改进的BFS策略 =====
        
        # 策略1：尝试智能BFS吃食物
        food_dir = self._smart_bfs_to_food(snake, food)
        if food_dir:
            return food_dir
        
        # 策略2：跟随尾巴（保持存活）
        tail_dir = self._follow_tail(snake)
        if tail_dir:
            return tail_dir
        
        # 策略3：任意安全移动
        for d in DIRS:
            if self._is_safe_move(head, d, snake):
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
    print(f"Partition AI v2 - {w}x{h} ({'偶数' if w%2==0 and h%2==0 else '奇数'})")
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
    print("对比测试：phase11_hybrid_v3 vs phase12_partition_v2")
    print("\n" + "="*60)
    
    # 测试偶数网格
    print("\n【偶数网格】")
    run_benchmark(10, 8, 8)
    run_benchmark(10, 10, 10)
    run_benchmark(10, 6, 6)
    
    # 测试奇数网格
    print("\n【奇数网格】")
    run_benchmark(10, 7, 7)
    run_benchmark(10, 9, 9)
    run_benchmark(10, 5, 5)
    run_benchmark(10, 11, 11)
    run_benchmark(10, 13, 13)
