#!/usr/bin/env python3
"""
Phase 6 Snake AI - BFS + Hamilton 混合算法
核心思路：
1. 优先使用 BFS 找最短路径吃食物
2. 如果 BFS 失败（会困住自己），使用 Hamilton 回路保底
3. 确保不会撞墙或撞自己
"""

import random
from collections import deque

UP = (0, -1)
DOWN = (0, 1)
LEFT = (-1, 0)
RIGHT = (1, 0)
DIRS = [UP, DOWN, LEFT, RIGHT]


def build_hamilton_path(width, height):
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


class Phase6SnakeAI:
    def __init__(self, width=8, height=8):
        self.width = width
        self.height = height
        self.total = width * height
        self.path = build_hamilton_path(width, height)
        self.pos_to_idx = {pos: i for i, pos in enumerate(self.path)}
    
    def get_direction(self, snake, food):
        head = snake[0]
        snake_set = set(snake)
        
        # 首先尝试 BFS 找食物
        path_to_food = self._bfs(head, food, snake_set, len(snake))
        
        if path_to_food:
            # BFS 成功，找到最短路径
            next_pos = path_to_food[0]
            return self._dir(head, next_pos)
        
        # BFS 失败，使用 Hamilton 回路保底
        return self._hamilton_fallback(head, snake_set)
    
    def _bfs(self, start, goal, snake_set, snake_len):
        """BFS 找从 start 到 goal 的最短路径"""
        queue = deque([(start, [start])])
        visited = {start}
        
        # 限制搜索步数
        max_steps = self.total
        
        while queue and max_steps > 0:
            pos, path = queue.popleft()
            
            if pos == goal:
                return path[1:]  # 返回除了起点的路径
            
            for d in DIRS:
                nx, ny = pos[0] + d[0], pos[1] + d[1]
                new_pos = (nx, ny)
                
                if not (0 <= nx < self.width and 0 <= ny < self.height):
                    continue
                if new_pos in snake_set or new_pos in visited:
                    continue
                
                # 关键：检查是否会困住自己
                # 简化：如果不是最后一步，可以走
                if len(path) < snake_len:
                    visited.add(new_pos)
                    queue.append((new_pos, path + [new_pos]))
            
            max_steps -= 1
        
        return None
    
    def _hamilton_fallback(self, head, snake_set):
        """Hamilton 回路保底"""
        if head not in self.pos_to_idx:
            return self._safe_fallback(head, snake_set, None)
        
        head_idx = self.pos_to_idx[head]
        
        # 沿 Hamilton 路径走一步
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
        
        return self._safe_fallback(head, snake_set, None)
    
    def _is_safe(self, pos, snake_set):
        x, y = pos
        if not (0 <= x < self.width and 0 <= y < self.height):
            return False
        if pos in snake_set:
            return False
        return True
    
    def _dir(self, a, b):
        return (b[0] - a[0], b[1] - a[1])
    
    def _safe_fallback(self, head, snake_set, food):
        best_dir = None
        best_dist = float('inf')
        
        for d in DIRS:
            nx, ny = head[0] + d[0], head[1] + d[1]
            pos = (nx, ny)
            
            if not self._is_safe(pos, snake_set):
                continue
            
            if food:
                dist = abs(nx - food[0]) + abs(ny - food[1])
            else:
                dist = 0
            
            if dist < best_dist:
                best_dist = dist
                best_dir = d
        
        return best_dir


def simulate_game(width=8, height=8, max_steps=50000, verbose=False):
    ai = Phase6SnakeAI(width, height)
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
    print("Phase 6 Snake AI - BFS + Hamilton")
    print("=" * 40)
    run_benchmark(30, 8, 8)
