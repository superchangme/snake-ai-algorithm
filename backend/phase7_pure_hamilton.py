"""
Phase 7 - 纯 Hamilton 路径算法
核心：蛇始终沿着 Hamilton 路径走，不管食物位置
"""

UP = (0, -1)
DOWN = (0, 1)
LEFT = (-1, 0)
RIGHT = (1, 0)
DIRS = [UP, DOWN, LEFT, RIGHT]


def build_hamiltonian_cycle(width, height):
    """为偶数宽高网格生成Hamilton回路"""
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
    for i, (x, y) in enumerate(path):
        order[y][x] = i
    return order, path


class PureHamiltonAI:
    def __init__(self, width=8, height=8):
        self.width = width
        self.height = height
        self.total = width * height
        self.order, self.path = build_hamiltonian_cycle(width, height)

    def get_direction(self, snake, food, grid=None):
        head = snake[0]
        
        # 始终沿着 Hamilton 路径的下一个位置
        current_idx = self.order[head[1]][head[0]]
        next_pos = self.path[(current_idx + 1) % self.total]
        
        # 计算方向
        dx = next_pos[0] - head[0]
        dy = next_pos[1] - head[1]
        
        return (dx, dy)


def simulate_game(width=8, height=8, max_steps=50000, verbose=False):
    import random
    ai = PureHamiltonAI(width, height)
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

    while steps < max_steps:
        d = ai.get_direction(snake, food)
        nh = (snake[0][0] + d[0], snake[0][1] + d[1])

        if not (0 <= nh[0] < width and 0 <= nh[1] < height):
            if verbose: print(f"Wall at step {steps}, len={len(snake)}")
            break
        if nh in set(snake[:-1]):
            if verbose: print(f"Self-hit at step {steps}, len={len(snake)}")
            break

        snake.insert(0, nh)
        if nh == food:
            food = place_food()
            if not food:
                if verbose: print(f"PERFECT at step {steps}, len={len(snake)}")
                break
        else:
            snake.pop()

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
    return results


if __name__ == "__main__":
    print("Phase 7 - Pure Hamilton Benchmark")
    print("=" * 40)
    run_benchmark(30, 8, 8)
