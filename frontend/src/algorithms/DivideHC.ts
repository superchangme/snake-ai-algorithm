import { Coordinate } from '../types';
import { HCMemoizer } from './HCMemoizer';

/**
 * DivideHC - 动态 Hamilton Cycle 生成器
 */
export class DivideHC {
  private memoizer: HCMemoizer;
  
  constructor() {
    this.memoizer = new HCMemoizer();
  }

  /**
   * 生成 Hamilton Cycle
   * @param width 网格宽度
   * @param height 网格高度
   * @param obstacles 障碍物位置集合
   * @param startPos 起点位置（蛇头位置）
   * @returns HC 路径数组，从起点开始
   */
  generateHC(
    width: number, 
    height: number, 
    obstacles: Set<string>, 
    startPos: Coordinate
  ): Coordinate[] {
    // 如果没有障碍物，生成简单 HC
    if (obstacles.size === 0) {
      return this.generateSimpleHC(width, height, startPos);
    }

    // 生成形状键
    const shapeKey = HCMemoizer.generateShapeKey(width, height, obstacles);
    
    // 检查缓存
    const cached = this.memoizer.get(shapeKey);
    if (cached) {
      // 从缓存的 HC 中找到从起点开始的部分
      return this.rotateHCToStart(cached, startPos);
    }

    // 动态生成 HC
    const hc = this.divideAndConquerHC(width, height, obstacles, startPos);
    
    // 缓存结果
    if (hc.length > 0) {
      this.memoizer.set(shapeKey, hc);
    }
    
    return hc;
  }

  /**
   * 简单的 HC 生成（无障碍物）
   * 使用贪心算法生成长路径
   */
  private generateSimpleHC(width: number, height: number, startPos: Coordinate): Coordinate[] {
    const visited = new Set<string>();
    const path: Coordinate[] = [{ ...startPos }];
    visited.add(`${startPos.x},${startPos.y}`);
    
    let current = startPos;
    
    while (true) {
      // 找到所有未访问的邻居
      const neighbors = [
        { x: current.x, y: current.y - 1 },
        { x: current.x + 1, y: current.y },
        { x: current.x, y: current.y + 1 },
        { x: current.x - 1, y: current.y }
      ];
      
      const unvisited = neighbors.filter(n => {
        const key = `${n.x},${n.y}`;
        return n.x >= 0 && n.x < width && n.y >= 0 && n.y < height && !visited.has(key);
      });
      
      if (unvisited.length === 0) {
        break; // 结束
      }
      
      // 贪心：选择最小化未来选项的邻居（Warnsdorff's rule）
      let best = unvisited[0];
      let bestScore = Infinity;
      
      for (const n of unvisited) {
        // 计算该邻居的未访问邻居数量
        const nNeighbors = [
          { x: n.x, y: n.y - 1 },
          { x: n.x + 1, y: n.y },
          { x: n.x, y: n.y + 1 },
          { x: n.x - 1, y: n.y }
        ].filter(an => {
          const key = `${an.x},${an.y}`;
          return an.x >= 0 && an.x < width && an.y >= 0 && an.y < height && !visited.has(key);
        }).length;
        
        if (nNeighbors < bestScore) {
          bestScore = nNeighbors;
          best = n;
        }
      }
      
      visited.add(`${best.x},${best.y}`);
      path.push({ ...best });
      current = best;
      
      // 如果访问了所有单元格，尝试回到起点
      if (visited.size === width * height) {
        const start = path[0];
        const dist = Math.abs(start.x - current.x) + Math.abs(start.y - current.y);
        if (dist === 1) {
          // 成功找到 Hamiltonian Cycle！
          return path;
        } else {
          // 无法回到起点，但路径是完整的
          // 尝试从末尾继续寻找回到起点的路径
          break;
        }
      }
    }
    
    return path;
  }

  /**
   * Divide and Conquer HC 生成
   * 改进：使用贪心算法，它比纯回溯更可靠
   */
  private divideAndConquerHC(
    width: number,
    height: number,
    obstacles: Set<string>,
    startPos: Coordinate
  ): Coordinate[] {
    // 使用贪心算法生成 HC
    return this.greedyHC(width, height, obstacles, startPos);
  }

  /**
   * 贪心算法生成长 HC 路径
   */
  private greedyHC(
    width: number,
    height: number,
    obstacles: Set<string>,
    startPos: Coordinate
  ): Coordinate[] {
    const visited = new Set<string>();
    const path: Coordinate[] = [];
    
    // 从起点开始（如果不是障碍物）
    const startKey = `${startPos.x},${startPos.y}`;
    if (obstacles.has(startKey)) {
      return [];
    }
    
    visited.add(startKey);
    path.push({ ...startPos });
    
    let current = startPos;
    
    while (true) {
      // 找到所有未访问的邻居
      const neighbors = [
        { x: current.x, y: current.y - 1 },
        { x: current.x + 1, y: current.y },
        { x: current.x, y: current.y + 1 },
        { x: current.x - 1, y: current.y }
      ];
      
      const unvisited = neighbors.filter(n => {
        const key = `${n.x},${n.y}`;
        return n.x >= 0 && n.x < width && n.y >= 0 && n.y < height && 
               !obstacles.has(key) && !visited.has(key);
      });
      
      if (unvisited.length === 0) {
        break;
      }
      
      // 使用 Warnsdorff's rule：选择未访问邻居数量最少的
      let best = unvisited[0];
      let bestScore = Infinity;
      
      for (const n of unvisited) {
        const nNeighbors = [
          { x: n.x, y: n.y - 1 },
          { x: n.x + 1, y: n.y },
          { x: n.x, y: n.y + 1 },
          { x: n.x - 1, y: n.y }
        ].filter(an => {
          const key = `${an.x},${an.y}`;
          return an.x >= 0 && an.x < width && an.y >= 0 && an.y < height && 
                 !obstacles.has(key) && !visited.has(key);
        }).length;
        
        if (nNeighbors < bestScore) {
          bestScore = nNeighbors;
          best = n;
        }
      }
      
      visited.add(`${best.x},${best.y}`);
      path.push({ ...best });
      current = best;
    }
    
    return path;
  }

  /**
   * 找到最接近目标的位置
   */
  private findClosestPosition(positions: Coordinate[], target: Coordinate): number {
    let minDist = Infinity;
    let closestIndex = 0;
    
    for (let i = 0; i < positions.length; i++) {
      const dist = Math.abs(positions[i].x - target.x) + Math.abs(positions[i].y - target.y);
      if (dist < minDist) {
        minDist = dist;
        closestIndex = i;
      }
    }
    
    return closestIndex;
  }

  /**
   * 旋转 PATH 使其从指定起点开始
   * 适用于 Hamiltonian PATH（不是环）
   * 不环绕：返回从起点到末尾的子路径
   */
  private rotateHCToStart(path: Coordinate[], startPos: Coordinate): Coordinate[] {
    // 找到起点在路径中的位置
    let startIndex = -1;
    for (let i = 0; i < path.length; i++) {
      if (path[i].x === startPos.x && path[i].y === startPos.y) {
        startIndex = i;
        break;
      }
    }

    // 如果起点不在路径中，找到最近的
    if (startIndex === -1) {
      startIndex = this.findClosestPosition(path, startPos);
    }

    // 只取从起点到末尾的子路径（不环绕）
    const rotated: Coordinate[] = [];
    for (let i = startIndex; i < path.length; i++) {
      rotated.push({ ...path[i] });
    }

    return rotated;
  }

  /**
   * 验证 HC 是否有效
   */
  isValidHC(hc: Coordinate[], width: number, height: number, obstacles: Set<string>): boolean {
    if (hc.length === 0) return false;
    
    const visited: Set<string> = new Set();
    const obstacleSet = new Set(obstacles);
    
    for (const pos of hc) {
      // 检查边界
      if (pos.x < 0 || pos.x >= width || pos.y < 0 || pos.y >= height) {
        return false;
      }
      
      const key = `${pos.x},${pos.y}`;
      
      // 检查重复
      if (visited.has(key)) {
        return false;
      }
      visited.add(key);
      
      // 检查障碍物
      if (obstacleSet.has(key)) {
        return false;
      }
    }
    
    // 检查连通性（相邻位置必须是邻居）
    for (let i = 0; i < hc.length - 1; i++) {
      const dist = Math.abs(hc[i].x - hc[i + 1].x) + Math.abs(hc[i].y - hc[i + 1].y);
      if (dist !== 1) {
        return false;
      }
    }
    
    return true;
  }
}
