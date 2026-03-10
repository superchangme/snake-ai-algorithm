import { Coordinate } from '../types';

/**
 * SmartShortcuts - 安全捷径计算器
 * 
 * 核心功能：
 * - 计算从 HC 位置到食物的 BFS 成本
 * - 识别有效的邻居移动（捷径候选）
 * - 使用假想蛇验证捷径安全性
 * - 确保走捷径后能安全返回 HC
 */
export class SmartShortcuts {
  private readonly width: number;
  private readonly height: number;
  
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  /**
   * 计算从每个 HC 位置到食物的 BFS 成本
   * @param hc Hamiltonian Cycle 路径
   * @param food 食物位置
   * @param obstacles 障碍物集合
   * @returns Map<位置键, 成本>
   */
  calculateCosts(
    hc: Coordinate[],
    food: Coordinate,
    obstacles: Set<string>
  ): Map<string, number> {
    const costs = new Map<string, number>();
    
    for (const pos of hc) {
      const posKey = `${pos.x},${pos.y}`;
      const dist = this.bfsDistance(pos, food, obstacles);
      costs.set(posKey, dist >= 0 ? dist : Infinity);
    }
    
    return costs;
  }

  /**
   * 获取有效的邻居移动（捷径候选）
   * @param head 蛇头位置
   * @param obstacles 障碍物集合
   * @returns 有效的邻居位置数组
   */
  getCandidateMoves(head: Coordinate, obstacles: Set<string>): Coordinate[] {
    const candidates: Coordinate[] = [];
    const directions = [
      { x: 0, y: -1 }, // 上
      { x: 1, y: 0 },  // 右
      { x: 0, y: 1 },  // 下
      { x: -1, y: 0 }  // 左
    ];
    
    for (const d of directions) {
      const nx = head.x + d.x;
      const ny = head.y + d.y;
      const key = `${nx},${ny}`;
      
      // 检查边界和障碍物
      if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
        if (!obstacles.has(key)) {
          candidates.push({ x: nx, y: ny });
        }
      }
    }
    
    return candidates;
  }

  /**
   * 验证捷径安全性
   * 关键：使用假想蛇模拟走捷径后的状态
   * @param head 蛇头位置
   * @param target 目标位置
   * @param body 蛇身数组
   * @param hc Hamiltonian Cycle 路径
   * @param obstacles 额外障碍物
   * @returns 是否安全
   */
  isSafeShortcut(
    head: Coordinate,
    target: Coordinate,
    body: Coordinate[],
    hc: Coordinate[],
    obstacles: Set<string> = new Set()
  ): boolean {
    // 找到从头部到目标的 BFS 路径
    const path = this.findPath(head, target, obstacles);
    if (!path || path.length === 0) {
      return false;
    }
    
    // 模拟走捷径后的蛇身状态
    const simulatedBody = this.simulateMovement(body, path);
    
    // 检查是否能返回 HC
    const returnResult = this.canReturnToHC(simulatedBody, hc, obstacles);
    
    return returnResult.canReturn;
  }

  /**
   * 找到从起点到终点的 BFS 路径
   */
  public findPath(
    start: Coordinate,
    goal: Coordinate,
    obstacles: Set<string>
  ): Coordinate[] | null {
    // 边界检查
    if (start.x < 0 || start.x >= this.width || start.y < 0 || start.y >= this.height) {
      return null;
    }
    if (goal.x < 0 || goal.x >= this.width || goal.y < 0 || goal.y >= this.height) {
      return null;
    }
    
    // 起点就是终点
    if (start.x === goal.x && start.y === goal.y) {
      return [];
    }
    
    const queue: Array<{ pos: Coordinate; path: Coordinate[] }> = [];
    queue.push({ pos: start, path: [] });
    
    const visited = new Set<string>();
    visited.add(`${start.x},${start.y}`);
    
    while (queue.length > 0) {
      const { pos, path } = queue.shift()!;
      
      const neighbors = [
        { x: pos.x, y: pos.y - 1 },
        { x: pos.x + 1, y: pos.y },
        { x: pos.x, y: pos.y + 1 },
        { x: pos.x - 1, y: pos.y }
      ];
      
      for (const next of neighbors) {
        const key = `${next.x},${next.y}`;
        
        // 边界和障碍物检查
        if (next.x < 0 || next.x >= this.width || next.y < 0 || next.y >= this.height) {
          continue;
        }
        if (visited.has(key) || obstacles.has(key)) {
          continue;
        }
        
        // 到达目标
        if (next.x === goal.x && next.y === goal.y) {
          return [...path, next];
        }
        
        visited.add(key);
        queue.push({ pos: next, path: [...path, next] });
      }
    }
    
    return null;
  }

  /**
   * BFS 计算两点间最短距离
   */
  private bfsDistance(
    start: Coordinate,
    goal: Coordinate,
    obstacles: Set<string>
  ): number {
    if (start.x === goal.x && start.y === goal.y) {
      return 0;
    }
    
    const path = this.findPath(start, goal, obstacles);
    return path ? path.length : -1;
  }

  /**
   * 模拟蛇身沿路径移动
   */
  private simulateMovement(body: Coordinate[], path: Coordinate[]): Coordinate[] {
    const newBody: Coordinate[] = [...body];
    
    for (const pos of path) {
      newBody.unshift(pos);
    }
    
    return newBody;
  }

  /**
   * 检查是否能返回 HC
   */
  private canReturnToHC(
    body: Coordinate[],
    hc: Coordinate[],
    extraObstacles: Set<string>
  ): { canReturn: boolean; distance: number } {
    const head = body[0];
    const occupied = new Set<string>();
    
    // 标记所有蛇身位置为障碍物
    for (const seg of body) {
      occupied.add(`${seg.x},${seg.y}`);
    }
    // 标记额外障碍物
    for (const obs of extraObstacles) {
      occupied.add(obs);
    }
    
    // BFS 搜索能否到达 HC 上的任意位置
    const visited = new Set<string>();
    const queue: Array<{ pos: Coordinate; distance: number }> = [];
    queue.push({ pos: head, distance: 0 });
    visited.add(`${head.x},${head.y}`);
    
    while (queue.length > 0) {
      const { pos, distance } = queue.shift()!;
      
      // 检查是否到达 HC
      const posIndex = this.getHCIndex(pos, hc);
      if (posIndex !== -1) {
        return { canReturn: true, distance };
      }
      
      // 继续搜索
      const neighbors = [
        { x: pos.x, y: pos.y - 1 },
        { x: pos.x + 1, y: pos.y },
        { x: pos.x, y: pos.y + 1 },
        { x: pos.x - 1, y: pos.y }
      ];
      
      for (const next of neighbors) {
        const key = `${next.x},${next.y}`;
        
        if (next.x < 0 || next.x >= this.width || next.y < 0 || next.y >= this.height) {
          continue;
        }
        if (visited.has(key) || occupied.has(key)) {
          continue;
        }
        
        visited.add(key);
        queue.push({ pos: next, distance: distance + 1 });
      }
    }
    
    return { canReturn: false, distance: -1 };
  }

  /**
   * 获取位置在 HC 中的索引
   */
  private getHCIndex(pos: Coordinate, hc: Coordinate[]): number {
    for (let i = 0; i < hc.length; i++) {
      if (hc[i].x === pos.x && hc[i].y === pos.y) {
        return i;
      }
    }
    return -1;
  }

  /**
   * 检查能否到达 HC 上的某个位置
   */
  canReachHC(
    pos: Coordinate,
    hc: Coordinate[],
    obstacles: Set<string>
  ): boolean {
    const result = this.canReturnToHC([pos], hc, obstacles);
    return result.canReturn;
  }

  /**
   * 获取从位置到 HC 的最短距离
   */
  getDistanceToHC(
    pos: Coordinate,
    hc: Coordinate[],
    obstacles: Set<string>
  ): number {
    const result = this.canReturnToHC([pos], hc, obstacles);
    return result.distance;
  }
}
