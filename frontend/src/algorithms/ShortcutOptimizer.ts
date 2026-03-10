import { Coordinate, Direction } from '../types';
import { HamiltonianCycle } from './HamiltonianCycle';

/**
 * 捷径优化器
 * 使用BFS算法判断蛇能否走捷径而不破坏安全性
 */
export class ShortcutOptimizer {
  private readonly hc: HamiltonianCycle;
  private readonly width: number;
  private readonly height: number;

  // 方向向量映射
  private readonly directionVectors: Record<Direction, Coordinate> = {
    [Direction.UP]: { x: 0, y: -1 },
    [Direction.DOWN]: { x: 0, y: 1 },
    [Direction.LEFT]: { x: -1, y: 0 },
    [Direction.RIGHT]: { x: 1, y: 0 }
  };

  constructor(hc: HamiltonianCycle, width: number, height: number) {
    this.hc = hc;
    this.width = width;
    this.height = height;
  }

  /**
   * 检查是否能走捷径
   * @param head 蛇头位置
   * @param target 目标位置
   * @param snakeBody 蛇身数组
   * @param snakeLength 蛇的目标长度
   * @returns 是否可以走捷径
   */
  canTakeShortcut(
    head: Coordinate,
    target: Coordinate,
    snakeBody: Coordinate[],
    snakeLength: number
  ): boolean {
    // 验证目标位置是否在Hamiltonian Cycle路径上
    if (!this.hc.isOnCycle(target)) {
      return false;
    }

    // 计算沿HC的正常距离
    const cycleDistance = this.hc.distanceAlongCycle(head, target);
    if (cycleDistance <= 0) {
      return false;
    }

    // 确定蛇身作为障碍物的位置
    const obstacles = new Set(snakeBody.map(pos => `${pos.x},${pos.y}`));

    // 计算BFS最短路径距离
    const bfsDistance = this.bfsDistance(head, target, obstacles);
    if (bfsDistance < 0) {
      return false;
    }

    // 捷径必须比沿HC更短才有价值
    if (bfsDistance >= cycleDistance) {
      return false;
    }

    // 模拟走完捷径后的状态，验证能否返回HC路径
    const shortcutPath = this.findPath(head, target, obstacles);
    if (!shortcutPath) {
      return false;
    }

    return this.canReturnToCycle(shortcutPath, snakeBody, snakeLength);
  }

  /**
   * 获取捷径路径
   * @param head 蛇头位置
   * @param target 目标位置
   * @param snakeBody 蛇身数组
   * @returns 捷径路径，如果无法走捷径则返回null
   */
  getShortcutPath(
    head: Coordinate,
    target: Coordinate,
    snakeBody: Coordinate[]
  ): Coordinate[] | null {
    // 验证目标位置是否在Hamiltonian Cycle上
    if (!this.hc.isOnCycle(target)) {
      return null;
    }

    // 确定蛇身作为障碍物的位置
    const obstacles = new Set(snakeBody.map(pos => `${pos.x},${pos.y}`));

    // 使用BFS寻找最短路径
    return this.findPath(head, target, obstacles);
  }

  /**
   * BFS计算两点间最短距离
   * @param start 起始位置
   * @param goal 目标位置
   * @param obstacles 障碍物集合
   * @returns 最短距离，无法到达返回-1
   */
  private bfsDistance(
    start: Coordinate,
    goal: Coordinate,
    obstacles: Set<string>
  ): number {
    const path = this.findPath(start, goal, obstacles);
    return path ? path.length : -1;
  }

  /**
   * BFS寻找路径（使用标准队列实现）
   * @param start 起始位置
   * @param goal 目标位置
   * @param obstacles 障碍物集合
   * @returns 路径坐标数组，无法到达返回null
   */
  private findPath(
    start: Coordinate,
    goal: Coordinate,
    obstacles: Set<string>
  ): Coordinate[] | null {
    // 边界检查
    if (
      start.x < 0 || start.x >= this.width ||
      start.y < 0 || start.y >= this.height ||
      goal.x < 0 || goal.x >= this.width ||
      goal.y < 0 || goal.y >= this.height
    ) {
      return null;
    }

    // 起点就是终点
    if (start.x === goal.x && start.y === goal.y) {
      return [];
    }

    // 队列 + visited集合实现BFS
    const queue: Array<{ pos: Coordinate; path: Coordinate[] }> = [];
    queue.push({ pos: start, path: [] });

    const visited = new Set<string>();
    visited.add(`${start.x},${start.y}`);

    while (queue.length > 0) {
      const { pos, path } = queue.shift()!;

      // 遍历四个方向
      for (const vector of Object.values(this.directionVectors)) {
        const nextPos: Coordinate = {
          x: pos.x + vector.x,
          y: pos.y + vector.y
        };
        const key = `${nextPos.x},${nextPos.y}`;

        // 边界检查
        if (nextPos.x < 0 || nextPos.x >= this.width ||
            nextPos.y < 0 || nextPos.y >= this.height) {
          continue;
        }

        // 检查是否已访问或为障碍物
        if (visited.has(key) || obstacles.has(key)) {
          continue;
        }

        // 到达目标
        if (nextPos.x === goal.x && nextPos.y === goal.y) {
          return [...path, nextPos];
        }

        visited.add(key);
        queue.push({ pos: nextPos, path: [...path, nextPos] });
      }
    }

    return null;
  }

  /**
   * 模拟蛇身沿路径移动
   * @param body 初始蛇身数组
   * @param path 移动路径
   * @returns 移动后的蛇身数组
   */
  private simulateMovement(body: Coordinate[], path: Coordinate[]): Coordinate[] {
    const newBody: Coordinate[] = [...body];

    for (const pos of path) {
      // 头进：添加新头部
      newBody.unshift(pos);
    }

    return newBody;
  }

  /**
   * 检查走捷径后能否返回HC路径
   * @param shortcutPath 捷径路径
   * @param snakeBody 原始蛇身
   * @param snakeLength 蛇的目标长度
   * @returns 能否安全返回HC
   */
  private canReturnToCycle(
    shortcutPath: Coordinate[],
    snakeBody: Coordinate[],
    snakeLength: number
  ): boolean {
    // 模拟走捷径后的蛇身状态
    const movedBody = this.simulateMovement(snakeBody, shortcutPath);

    // 根据目标长度截断蛇身
    const trimmedBody = movedBody.length > snakeLength
      ? movedBody.slice(0, snakeLength)
      : movedBody;

    // 更新障碍物集合
    const newObstacles = new Set(trimmedBody.map(pos => `${pos.x},${pos.y}`));

    // 获取捷径终点
    const shortcutEnd = shortcutPath[shortcutPath.length - 1];

    // 检查从捷径终点能否返回到HC上的某个位置
    return this.canReachCycleFrom(shortcutEnd, newObstacles);
  }

  /**
   * 检查从某位置能否到达HC上的某个位置
   * @param pos 起始位置
   * @param obstacles 障碍物集合
   * @returns 能否到达HC
   */
  private canReachCycleFrom(pos: Coordinate, obstacles: Set<string>): boolean {
    const cycle = this.hc.getFullCycle();

    // 在HC上检查周围几个位置，看能否到达
    const posIndex = this.hc.getPositionIndex(pos);
    if (posIndex === null) {
      // 起点不在HC上，搜索整个cycle
      for (const cyclePos of cycle) {
        const key = `${cyclePos.x},${cyclePos.y}`;
        if (!obstacles.has(key)) {
          const path = this.findPath(pos, cyclePos, obstacles);
          if (path !== null) {
            return true;
          }
        }
      }
      return false;
    }

    // 检查HC上相邻的几个位置
    const cycleLength = cycle.length;
    for (let offset = 1; offset <= cycleLength; offset++) {
      const checkIndex = (posIndex + offset) % cycleLength;
      const targetPos = cycle[checkIndex];
      const key = `${targetPos.x},${targetPos.y}`;

      if (!obstacles.has(key)) {
        const path = this.findPath(pos, targetPos, obstacles);
        if (path !== null) {
          return true;
        }
      }
    }

    return false;
  }
}
