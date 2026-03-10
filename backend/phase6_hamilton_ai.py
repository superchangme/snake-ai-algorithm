"""
Phase 6 Snake AI - 保守的 Hamilton + 有限捷径
核心思路：始终保持蛇能移动，不把自己困住
"""

from collections import deque

UP = (0, -1)
DOWN = (0, 1)
LEFT = (-1, 0)
RIGHT = (1, 0)
DIRS = [UP, DOWN, LEFT, RIGHT]


def build_hamiltonian_cycle(width, height):
    """为偶数宽高网格生成Hamilton回路"""
    assert width % 2 == 0 and height % 2 == 0
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

    assert len(path) == width * height
    order = [[0] * width for _ in range(height)]
    for i, (x, y) in enumerate(path):
        order[y][x] = i
    return order, path


class HamiltonSnakeAI:
    def __init__(self, width=8, height=8):
        self.width = width
        self.height = height
        self.total = width * height
        self.order, self.path = build_hamiltonian_cycle(width, height)
        self.snake_start = None
        self.start_idx = 0
    
    def reset_game(self, snake):
        """设置蛇的起始位置，用于计算 Hamilton 路径的起点"""
        self.snake_start = snake[0] if snake else None
        if self.snake_start:
            try:
                self.start_idx = self.order[self.snake_start[1]][self.snake_start[0]]
            except:
                self.start_idx = 0

    def _is_safe(self, head, direction, snake_set):
        """检查移动是否安全"""
        nx, ny = head[0] + direction[0], head[1] + direction[1]
        if not (0 <= nx < self.width and 0 <= ny < self.height):
            return False
        if (nx, ny) in snake_set:
            return False
        return True

    def _is_safe_with_tail(self, head, direction, snake_body):
        """检查移动是否安全，考虑蛇尾会移动"""
        nx, ny = head[0] + direction[0], head[1] + direction[1]
        
        if not (0 <= nx < self.width and 0 <= ny < self.height):
            return False
        
        # 检查新头是否撞到蛇身（不包括尾巴）
        if (nx, ny) in set(snake_body[:-1]):
            return False
            
        return True

    def _safe_fallback(self, head, snake_set, food=None):
        """找一个安全且最靠近食物的方向"""
        if food is None:
            for d in DIRS:
                if self._is_safe(head, d, snake_set):
                    return d
            return None
        
        safe_dirs = [d for d in DIRS if self._is_safe(head, d, snake_set)]
        if not safe_dirs:
            return None
        
        best_dir = None
        best_dist = float('inf')
        for d in safe_dirs:
            nx, ny = head[0] + d[0], head[1] + d[1]
            dist = abs(nx - food[0]) + abs(ny - food[1])
            if dist < best_dist:
                best_dist = dist
                best_dir = d
        return best_dir

    def _next_in_cycle(self, pos):
        """计算 Hamilton 路径上下一个位置"""
        idx = self.order[pos[1]][pos[0]]
        # 正确：当前位置的下一个位置
        next_idx = (idx + 1) % self.total
        next_pos = self.path[next_idx]
        
        # 边界检查：确保返回的位置在网格内
        if 0 <= next_pos[0] < self.width and 0 <= next_pos[1] < self.width:
            return next_pos
        
        # 如果超出边界，尝试找到下一个有效位置
        for i in range(1, self.total):
            candidate_idx = (idx + i) % self.total
            candidate = self.path[candidate_idx]
            if 0 <= candidate[0] < self.width and 0 <= candidate[1] < self.width:
                return candidate
        
        # 兜底：返回原位置
        return pos

    #TS|
    def _dir(self, a, b):
        return (b[0] - a[0], b[1] - a[1])

    def _has_escape_route(self, pos, blocked, min_steps=None):
        """检查从 pos 是否有逃脱路线（不被困住）"""
        # 动态调整 min_steps：蛇越长要求越少（因为空闲空间越少）
        snake_len = len(blocked)
        if min_steps is None:
            min_steps = max(2, 6 - snake_len // 10)
        queue = deque([(pos, 0)])
    def _has_escape_route(self, pos, blocked, min_steps=None):
        """检查从 pos 是否有逃脱路线（不被困住）"""
        # 动态调整 min_steps：蛇越长要求越少（因为空闲空间越少）
        snake_len = len(blocked)
        if min_steps is None:
            min_steps = max(2, 6 - snake_len // 10)
        queue = deque([(pos, 0)])
        visited = {pos}
        visited = {pos}
        
        while queue:
            p, steps = queue.popleft()
            if steps >= min_steps:
                return True
            
            for d in DIRS:
                nx, ny = p[0] + d[0], p[1] + d[1]
                if (0 <= nx < self.width and 0 <= ny < self.height 
                    and (nx, ny) not in blocked 
                    and (nx, ny) not in visited):
                    visited.add((nx, ny))
                    queue.append(((nx, ny), steps + 1))
        
        return False

    def get_direction(self, snake, food, grid=None):
        head = snake[0]
        
        # 边界检查：如果蛇头在边界外，返回安全方向
        if head[0] < 0 or head[0] >= self.width or head[1] < 0 or head[1] >= self.height:
            # 尝试返回不撞墙的方向
            for d in [(0, -1), (0, 1), (-1, 0), (1, 0)]:
                nx, ny = head[0] + d[0], head[1] + d[1]
                if 0 <= nx < self.width and 0 <= ny < self.height and (nx, ny) not in snake:
                    return d
            return (1, 0)  # 默认向右
        snake_set = set(snake)
        snake_len = len(snake)
        fill = snake_len / self.total

        # Hamilton 路径下一步
        ham_next = self._next_in_cycle(head)
        default_dir = self._dir(head, ham_next)

        # ===== 核心策略 =====
        # 始终保持蛇能移动！这是最重要的
        
        # 1. 检查默认 Hamilton 方向是否安全（考虑蛇尾）
        if self._is_safe_with_tail(head, default_dir, snake):
            # 检查这一步之后是否还有逃脱路线
            future_set = set(snake[:-1])
            future_set.add((head[0] + default_dir[0], head[1] + default_dir[1]))
            if self._has_escape_route(ham_next, future_set):
                return default_dir

        # 2. 尝试吃食物（有限制的 BFS）
        # 只在有逃脱路线时才走捷径
        path = self._bfs_path(head, food, snake_set)
        if path and len(path) > 1:
            first_move = (path[0][0] - head[0], path[0][1] - head[1])
            if self._is_safe(head, first_move, snake_set):
                # 检查捷径之后是否有逃脱路线
                next_pos = path[0]
                future_set = set(snake[:-1])
                future_set.add(next_pos)
                if self._has_escape_route(next_pos, future_set):
                    return first_move

        # 3. 尝试 fallback 方向（靠近食物的安全方向）
        fallback = self._safe_fallback(head, snake_set, food)
        if fallback:
            next_pos = (head[0] + fallback[0], head[1] + fallback[1])
            future_set = set(snake[:-1])
            future_set.add(next_pos)
            if self._has_escape_route(next_pos, future_set):
                return fallback

        # 4. 找任意安全方向
        for d in DIRS:
            if self._is_safe(head, d, snake_set):
                return d

        return None

    def _bfs_path(self, start, goal, obstacles):
        """BFS 找最短路径"""
        queue = deque([(start, [start])])
        visited = {start}
        
        while queue:
            pos, path = queue.popleft()
            
            if pos == goal:
                return path
            
            for d in DIRS:
                nx, ny = pos[0] + d[0], pos[1] + d[1]
                if (0 <= nx < self.width and 0 <= ny < self.height 
                    and (nx, ny) not in obstacles 
                    and (nx, ny) not in visited):
                    visited.add((nx, ny))
                    queue.append(((nx, ny), path + [(nx, ny)]))
        
        return None


def simulate_game(width=8, height=8, max_steps=50000, verbose=False):
    import random
    ai = HamiltonSnakeAI(width, height)
    mid = width // 2
    snake = [(mid, mid), (mid - 1, mid), (mid - 2, mid)]

    def place_food():
        ss = set(snake)
        empty = [(x, y) for x in range(width) for y in range(height) if (x, y) not in ss]
        return random.choice(empty) if empty else None

    food = place_food()
    if not food:
        return len(snake)

    steps = 0
    no_food = 0
    limit = width * height * 8

    while steps < max_steps:
        d = ai.get_direction(snake, food)
        if d is None:
            if verbose:
                print(f"AI returned None (trapped) at step {steps}, len={len(snake)}")
            break
        nh = (snake[0][0] + d[0], snake[0][1] + d[1])

        if not (0 <= nh[0] < width and 0 <= nh[1] < height):
            if verbose: print(f"Wall at step {steps}, len={len(snake)}")
            break
        if nh in set(snake[:-1]):
            if verbose: print(f"Self-hit at step {steps}, len={len(snake)}")
            break

        snake.insert(0, nh)
        if nh == food:
            no_food = 0
            food = place_food()
            if not food:
                if verbose: print(f"PERFECT at step {steps}, len={len(snake)}")
                break
        else:
            snake.pop()
            no_food += 1

        if no_food > limit:
            if verbose: print(f"Timeout at step {steps}, len={len(snake)}")
            break
        steps += 1

    return len(snake)


def run_benchmark(n=30, w=8, h=8):
    import random
    results = []
    for i in range(n):
        random.seed(i * 42 + 7)
        s = simulate_game(w, h)
        results.append(s)
        tag = '满分' if s == w * h else f'{s * 100 // (w * h)}%'
        print(f"Game {i + 1:2d}: {s:2d}/{w * h}  ({tag})")

    avg = sum(results) / len(results)
    print(f"\n{'=' * 40}")
    print(f"平均: {avg:.1f} | 最好: {max(results)} | 最差: {min(results)}")
    print(f"满分: {sum(1 for r in results if r == w * h)}/{n}")
    print(f">=40: {sum(1 for r in results if r >= 40)}/{n}")
    print(f">=30: {sum(1 for r in results if r >= 30)}/{n}")
    return results


if __name__ == "__main__":
    print("Phase 6 Hamilton Snake AI - Benchmark")
    print("=" * 40)
    run_benchmark(30, 8, 8)
