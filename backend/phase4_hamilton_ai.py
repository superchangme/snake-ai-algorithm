"""
Phase 4 Hamilton Snake AI - 高性能动态Hamilton路径算法
目标：8x8网格达到40+长度（满分64）

核心思路：
1. 预计算一条Hamilton回路覆盖整个网格
2. 蛇短时走捷径（跳过Hamilton路径中的段）加速吃食物
3. 蛇长时严格沿Hamilton回路走（保证安全）
4. 关键约束：捷径不能跳过食物的Hamilton位置
5. 改进：更保守的捷径选择，避免被困
"""

from collections import deque

UP = (0, -1)
DOWN = (0, 1)
LEFT = (-1, 0)
RIGHT = (1, 0)
DIRS = [UP, DOWN, LEFT, RIGHT]


def build_hamiltonian_cycle(width, height):
    """
    为偶数宽高网格生成Hamilton回路（蛇形扫描法）。
    返回 cycle_order[y][x] 和 cycle_path 列表。
    """
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
        """检查从head沿direction走一步是否安全（不出界、不撞自身）"""
        nx, ny = head[0] + direction[0], head[1] + direction[1]
        if not (0 <= nx < self.width and 0 <= ny < self.height):
            return False
        if (nx, ny) in snake_set:
            return False
        return True

    def _safe_fallback(self, head, snake_set, food=None):
        """找一个安全且最靠近食物的方向"""
        if food is None:
            for d in DIRS:
                if self._is_safe(head, d, snake_set):
                    return d
            return None
        
        # 找到所有安全方向，然后选择几何距离最近的
        safe_dirs = [d for d in DIRS if self._is_safe(head, d, snake_set)]
        if not safe_dirs:
            return None
        
        # 优先选择能减少x或y距离的方向（同距离时优先RIGHT和UP）
        best_dir = None
        best_dist = float('inf')
        best_reduces = False
        for d in safe_dirs:
            nx, ny = head[0] + d[0], head[1] + d[1]
            dist = abs(nx - food[0]) + abs(ny - food[1])
            reduces = (d[0] > 0 or d[1] < 0)  # RIGHT or UP brings closer
            if best_dir is None or dist < best_dist or (dist == best_dist and reduces and not best_reduces):
                best_dist = dist
                best_dir = d
                best_reduces = reduces
        return best_dir
    
    def _has_valid_path(self, start, blocked, max_steps=15):
        """BFS检查从start是否有有效的路径（不被困住）"""
        from collections import deque
        queue = deque([(start, 0)])
        visited = {start}
        
        while queue:
            pos, steps = queue.popleft()
            if steps >= max_steps:
                return True  # 有足够空间
            
            for d in DIRS:
                nx, ny = pos[0] + d[0], pos[1] + d[1]
                if (0 <= nx < self.width and 0 <= ny < self.height 
                    and (nx, ny) not in blocked 
                    and (nx, ny) not in visited):
                    visited.add((nx, ny))
                    queue.append(((nx, ny), steps + 1))
        
        return False  # 被困住了

    def get_direction(self, snake, food, grid=None):
        head = snake[0]
        snake_set = set(snake)
        snake_len = len(snake)
        fill = snake_len / self.total

        # 默认：Hamilton回路的下一步
        ham_next = self._next_in_cycle(head)
        default_dir = self._dir(head, ham_next)

        # 高填充率：严格Hamilton（但仍需验证安全性）
        if fill > 0.5:
            if self._is_safe(head, default_dir, snake_set):
                return default_dir
            fallback = self._safe_fallback(head, snake_set, food)
            if fallback is not None:
                return fallback
            # No safe move at high fill - try last resort
            for d in DIRS:
                nx, ny = head[0] + d[0], head[1] + d[1]
                if 0 <= nx < self.width and 0 <= ny < self.height and (nx, ny) not in snake_set:
                    return d
            return default_dir

        # 尝试走捷径
        best = self._best_shortcut(head, food, snake, snake_set, fill)
        if best:
            return self._dir(head, best)

        # 计算默认方向到食物的距离
        default_dist = abs(head[0] + default_dir[0] - food[0]) + abs(head[1] + default_dir[1] - food[1])
        
        # 尝试fallback
        fallback = self._safe_fallback(head, snake_set, food)
        
        # 如果fallback存在且比默认方向更靠近食物，使用fallback
        if fallback is not None:
            fb_dist = abs(head[0] + fallback[0] - food[0]) + abs(head[1] + fallback[1] - food[1])
            if fb_dist < default_dist:
                return fallback
        
        # 否则如果安全使用默认方向（）
        if self._is_safe(head, default_dir, snake_set):
            return default_dir
        
        # 默认方向不安全，使用fallback
        if fallback is not None:
            return fallback
        # Last resort: find any valid move (should be rare)
        for d in DIRS:
            nx, ny = head[0] + d[0], head[1] + d[1]
            if 0 <= nx < self.width and 0 <= ny < self.height and (nx, ny) not in snake_set:
                return d
        # TRULY STUCK - all 4 directions blocked!
        return None

    def _next_in_cycle(self, pos):
        idx = self.order[pos[1]][pos[0]]
        return self.path[(idx + 1) % self.total]

    def _dir(self, a, b):
        return (b[0] - a[0], b[1] - a[1])

    def _cycle_dist(self, a, b):
        """从a到b沿Hamilton正方向的距离"""
        ai = self.order[a[1]][a[0]]
        bi = self.order[b[1]][b[0]]
        return (bi - ai) % self.total

    def _best_shortcut(self, head, food, snake, snake_set, fill):
        """
        在所有可走的相邻格中，选择最优的捷径。
        
        规则：
        1. 必须沿Hamilton正方向前进
        2. 不能跳过食物的Hamilton位置
        3. 不能跳过蛇身的Hamilton位置
        4. 跳跃距离受填充率限制（更保守）
        5. 新增：使用BFS检查确保不会被困
        """
        head_idx = self.order[head[1]][head[0]]
        food_idx = self.order[food[1]][food[0]]
        food_dist = (food_idx - head_idx) % self.total

        neighbors = []
        for d in DIRS:
            nx, ny = head[0] + d[0], head[1] + d[1]
            if not (0 <= nx < self.width and 0 <= ny < self.height):
                continue
            if (nx, ny) in snake_set:
                continue
            neighbors.append((nx, ny))

        if not neighbors:
            return None

        # 最大允许跳跃 - 更保守以避免被困
        if fill < 0.25:
            max_skip = self.total // 2
        elif fill < 0.4:
            max_skip = self.total // 3
        elif fill < 0.5:
            max_skip = self.total // 4
        else:
            max_skip = self.total // 6

        best_pos = None
        best_food_dist = food_dist
        best_geo_dist = float('inf')
        best_geo_reduction = -float('inf')

        for nb in neighbors:
            nb_idx = self.order[nb[1]][nb[0]]
            skip = (nb_idx - head_idx) % self.total

            if skip == 0 or skip > max_skip:
                continue

            # 不能跳过食物
            if skip > food_dist and food_dist > 0:
                continue

            # 不能跳过蛇身
            safe = True
            for i, seg in enumerate(snake):
                if i == 0:
                    continue
                seg_idx = self.order[seg[1]][seg[0]]
                seg_skip = (seg_idx - head_idx) % self.total
                if 0 < seg_skip < skip:
                    safe = False
                    break
            if not safe:
                continue

            # 关键改进：使用BFS检查确保有有效路径
            future_set = set(snake[:-1])
            future_set.add(nb)
            if not self._has_valid_path(nb, future_set, min(15, self.total - len(snake))):
                continue

            # 计算评分
            new_food_dist = (food_idx - nb_idx) % self.total
            new_geo_dist = abs(nb[0] - food[0]) + abs(nb[1] - food[1])
            current_geo_dist = abs(head[0] - food[0]) + abs(head[1] - food[1])
            geo_reduction = current_geo_dist - new_geo_dist
            
            if geo_reduction > best_geo_reduction:
                best_geo_reduction = geo_reduction
                best_food_dist = new_food_dist
                best_geo_dist = new_geo_dist
                best_pos = nb
            elif geo_reduction == best_geo_reduction and new_food_dist < best_food_dist:
                best_food_dist = new_food_dist
                best_geo_dist = new_geo_dist
                best_pos = nb

        return best_pos


# ============================================================
# 模拟器
# ============================================================
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
    print("Phase 4 Hamilton Snake AI - Benchmark")
    print("=" * 40)
    run_benchmark(30, 8, 8)
