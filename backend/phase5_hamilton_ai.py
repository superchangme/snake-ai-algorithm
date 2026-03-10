"""
Phase 5 Snake AI - 修复版 Hamilton 算法
核心修复：解决蛇沿 Hamilton 路径走时撞自己的问题
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

    def _is_safe(self, head, direction, snake_set):
        """检查移动是否安全"""
        nx, ny = head[0] + direction[0], head[1] + direction[1]
        if not (0 <= nx < self.width and 0 <= ny < self.height):
            return False
        if (nx, ny) in snake_set:
            return False
        return True

    def _is_safe_with_tail(self, head, direction, snake_body):
        """
        检查移动是否安全，考虑蛇尾会移动
        关键修复：如果不吃食物，蛇尾会移动
        """
        nx, ny = head[0] + direction[0], head[1] + direction[1]
        
        # 检查边界
        if not (0 <= nx < self.width and 0 <= ny < self.height):
            return False
        
        # 检查新头是否撞到蛇身（不包括尾巴，因为尾巴会移动）
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
        idx = self.order[pos[1]][pos[0]]
        return self.path[(idx + 1) % self.total]

    def _dir(self, a, b):
        return (b[0] - a[0], b[1] - a[1])

    def get_direction(self, snake, food, grid=None):
        head = snake[0]
        snake_set = set(snake)
        snake_len = len(snake)
        fill = snake_len / self.total

        # 默认 Hamilton 方向
        ham_next = self._next_in_cycle(head)
        default_dir = self._dir(head, ham_next)

        # ===== 策略 =====
        # 1. 蛇短时（fill < 0.5）：优先吃食物，使用 BFS
        # 2. 蛇长时（fill >= 0.5）：严格沿 Hamilton 路径走

        if fill < 0.5:
            # 短蛇：优先吃食物，用 BFS
            path = self._bfs_path(head, food, snake_set)
            if path:
                first_move = (path[0][0] - head[0], path[0][1] - head[1])
                if self._is_safe(head, first_move, snake_set):
                    return first_move
            
            # BFS 失败，用 fallback
            fallback = self._safe_fallback(head, snake_set, food)
            if fallback:
                return fallback
            
            # 最后尝试 Hamilton
            if self._is_safe(head, default_dir, snake_set):
                return default_dir
            
            return None
        
        else:
            # 长蛇：严格沿 Hamilton 路径
            # 关键修复：检查这个方向是否会被尾巴撞到
            if self._is_safe_with_tail(head, default_dir, snake):
                return default_dir
            
            # 默认方向不安全，尝试 fallback
            fallback = self._safe_fallback(head, snake_set, food)
            if fallback:
                return fallback
            
            # 尝试找到任意安全方向
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
    print("Phase 5 Hamilton Snake AI - Benchmark")
    print("=" * 40)
    run_benchmark(30, 8, 8)
