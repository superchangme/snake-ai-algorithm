#!/usr/bin/env python3
"""
Phase 5 Snake AI - 简化版 Hamilton 算法
目标：8x8网格稳定达到40+分
"""

from collections import deque
import random

UP = (0, -1)
DOWN = (0, 1)
LEFT = (-1, 0)
RIGHT = (1, 0)
DIRS = [UP, DOWN, LEFT, RIGHT]


def build_hamiltonian_path(width, height):
    """生成蛇形 Hamilton 路径"""
    path = []
    for y in range(height):
        if y % 2 == 0:
            for x in range(width):
                path.append((x, y))
        else:
            for x in range(width - 1, -1, -1):
                path.append((x, y))
    return path


class Phase5SnakeAI:
    def __init__(self, width=8, height=8):
        self.width = width
        self.height = height
        self.total = width * height
        self.path = build_hamiltonian_path(width, height)
        self.pos_to_idx = {pos: i for i, pos in enumerate(self.path)}
    
    def get_direction(self, snake, food):
        head = snake[0]
        snake_set = set(snake)
        
        if head not in self.pos_to_idx:
            return self._safe_fallback(head, snake_set, food)
        
        head_idx = self.pos_to_idx[head]
        
        if food not in self.pos_to_idx:
            return self._safe_fallback(head, snake_set, food)
        
        food_idx = self.pos_to_idx[food]
        food_dist = (food_idx - head_idx) % self.total
        
        # 尝试捷径
        if food_dist > 5 and food_dist < self.total - 5:
            shortcut = self._find_shortcut(head, food, snake_set)
            if shortcut:
                return self._dir(head, shortcut)
        
        # 沿 Hamilton 路径走
        next_idx = (head_idx + 1) % self.total
        next_pos = self.path[next_idx]
        
        if self._is_safe(next_pos, snake_set):
            return self._dir(head, next_pos)
        
        # 找下一个安全位置
        for offset in range(1, self.total):
            check_idx = (head_idx + offset) % self.total
            check_pos = self.path[check_idx]
            if self._is_safe(check_pos, snake_set):
                return self._dir(head, check_pos)
        
        return self._safe_fallback(head, snake_set, food)
    
    def _is_safe(self, pos, snake_set):
        x, y = pos
        if not (0 <= x < self.width and 0 <= y < self.height):
            return False
        if pos in snake_set:
            return False
        return True
    
    def _dir(self, a, b):
        return (b[0] - a[0], b[1] - a[1])
    
    def _find_shortcut(self, head, food, snake_set):
        best_pos = None
        best_dist = float('inf')
        
        for d in DIRS:
            nx, ny = head[0] + d[0], head[1] + d[1]
            pos = (nx, ny)
            
            if not self._is_safe(pos, snake_set):
                continue
            
            dist = abs(nx - food[0]) + abs(ny - food[1])
            
            if pos in self.pos_to_idx:
                pos_idx = self.pos_to_idx[pos]
                # 简单：只要靠近食物就行
                if dist < best_dist:
                    best_dist = dist
                    best_pos = pos
        
        return best_pos
    
    def _safe_fallback(self, head, snake_set, food):
        best_dir = None
        best_dist = float('inf')
        
        for d in DIRS:
            nx, ny = head[0] + d[0], head[1] + d[1]
            pos = (nx, ny)
            
            if not self._is_safe(pos, snake_set):
                continue
            
            dist = abs(nx - food[0]) + abs(ny - food[1])
            if dist < best_dist:
                best_dist = dist
                best_dir = d
        
        return best_dir


def simulate_game(width=8, height=8, max_steps=50000, verbose=False):
    ai = Phase5SnakeAI(width, height)
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
            break
        
        nh = (snake[0][0] + d[0], snake[0][1] + d[1])

        if not (0 <= nh[0] < width and 0 <= nh[1] < height):
            break
        if nh in set(snake[:-1]):
            break

        snake.insert(0, nh)
        if nh == food:
            no_food = 0
            food = place_food()
            if not food:
                break
        else:
            snake.pop()
            no_food += 1

        if no_food > limit:
            break
        steps += 1

    return len(snake)


def run_benchmark(n=30, w=8, h=8):
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
    print("Phase 5 Snake AI - Benchmark")
    print("=" * 40)
    run_benchmark(30, 8, 8)
