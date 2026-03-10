import { Coordinate } from '../types';

export interface LookaheadResult {
  hasPath: boolean;
  pathLength: number;
  spaceSize: number;
  trapRisk: number;
  canReachTarget: boolean;
  bestScore: number;
}

export interface LookaheadConfig {
  maxDepthEarly: number;
  maxDepthMid: number;
  maxDepthLate: number;
  maxTimeMs: number;
  trapSizeThreshold: number;
  spaceWeight: number;
  trapPenalty: number;
}

const DEFAULT_CONFIG: LookaheadConfig = {
  maxDepthEarly: 2,
  maxDepthMid: 3,
  maxDepthLate: 3,
  maxTimeMs: 5,      // 从2ms增加到5ms，提高前瞻计算准确性
  trapSizeThreshold: 3,
  spaceWeight: 15,   // 从10增加到15，提高空间重要性
  trapPenalty: 800   // 从500增加到800，提高陷阱惩罚
};

export class LookaheadEvaluator {
  private mapWidth: number;
  private mapHeight: number;
  private config: LookaheadConfig;

  constructor(mapWidth: number, mapHeight: number, config?: Partial<LookaheadConfig>) {
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  public determineDepth(gamePhase: 'early' | 'mid' | 'late'): number {
    switch (gamePhase) {
      case 'early':
        return this.config.maxDepthEarly;
      case 'mid':
        return this.config.maxDepthMid;
      case 'late':
        return this.config.maxDepthLate;
      default:
        return 2;
    }
  }

  public evaluate(
    position: Coordinate,
    obstacles: Coordinate[],
    target: Coordinate,
    maxDepth: number,
    startTime: number = Date.now()
  ): LookaheadResult {
    const occupied = new Set(obstacles.map(o => `${o.x},${o.y}`));

    if (occupied.has(`${position.x},${position.y}`)) {
      return {
        hasPath: false,
        pathLength: 0,
        spaceSize: 0,
        trapRisk: 1.0,
        canReachTarget: false,
        bestScore: -Infinity
      };
    }

    const result = this.recursiveLookahead(position, obstacles, target, 0, maxDepth, startTime);
    return result;
  }

  private recursiveLookahead(
    pos: Coordinate,
    obstacles: Coordinate[],
    target: Coordinate,
    depth: number,
    maxDepth: number,
    startTime: number
  ): LookaheadResult {
    const elapsed = Date.now() - startTime;
    if (elapsed > this.config.maxTimeMs) {
      return {
        hasPath: false,
        pathLength: depth,
        spaceSize: 0,
        trapRisk: 0.5,
        canReachTarget: false,
        bestScore: -1000
      };
    }

    if (depth >= maxDepth) {
      const spaceSize = this.countAccessibleSpace(pos, obstacles);
      const atTarget = pos.x === target.x && pos.y === target.y;

      return {
        hasPath: true,
        pathLength: depth,
        spaceSize,
        trapRisk: this.detectTrapRisk(pos, obstacles),
        canReachTarget: atTarget,
        bestScore: atTarget ? 1000 + spaceSize * this.config.spaceWeight : spaceSize * this.config.spaceWeight
      };
    }

    const neighbors = this.getValidNeighbors(pos, obstacles);

    if (neighbors.length === 0) {
      return {
        hasPath: false,
        pathLength: depth,
        spaceSize: 0,
        trapRisk: 1.0,
        canReachTarget: false,
        bestScore: -Infinity
      };
    }

    if (pos.x === target.x && pos.y === target.y) {
      return {
        hasPath: true,
        pathLength: depth,
        spaceSize: this.countAccessibleSpace(pos, obstacles),
        trapRisk: this.detectTrapRisk(pos, obstacles),
        canReachTarget: true,
        bestScore: 2000 + depth * 10
      };
    }

    let bestResult: LookaheadResult | null = null;
    let bestScore = -Infinity;

    for (const neighbor of neighbors) {
      const nextObstacles = [...obstacles, pos];
      const result = this.recursiveLookahead(neighbor, nextObstacles, target, depth + 1, maxDepth, startTime);

      if (result.bestScore > bestScore) {
        bestScore = result.bestScore;
        bestResult = result;
      }
    }

    return bestResult || {
      hasPath: false,
      pathLength: depth,
      spaceSize: 0,
      trapRisk: 1.0,
      canReachTarget: false,
      bestScore: -Infinity
    };
  }

  private detectTrapRisk(pos: Coordinate, obstacles: Coordinate[]): number {
    const occupied = new Set(obstacles.map(o => `${o.x},${o.y}`));
    
    // 1. 2x2模式检测 (基础检测，权重0.6)
    const patterns2x2 = [
      [{ x: pos.x, y: pos.y }, { x: pos.x + 1, y: pos.y }, { x: pos.x, y: pos.y + 1 }, { x: pos.x + 1, y: pos.y + 1 }],
      [{ x: pos.x - 1, y: pos.y }, { x: pos.x, y: pos.y }, { x: pos.x - 1, y: pos.y + 1 }, { x: pos.x, y: pos.y + 1 }],
      [{ x: pos.x, y: pos.y - 1 }, { x: pos.x + 1, y: pos.y - 1 }, { x: pos.x, y: pos.y }, { x: pos.x + 1, y: pos.y }],
      [{ x: pos.x - 1, y: pos.y - 1 }, { x: pos.x, y: pos.y - 1 }, { x: pos.x - 1, y: pos.y }, { x: pos.x, y: pos.y }]
    ];

    let trapRisk2x2 = 0.0;
    let patternsChecked2x2 = 0;

    for (const pattern of patterns2x2) {
      const inBounds = pattern.every(p =>
        p.x >= 0 && p.x < this.mapWidth && p.y >= 0 && p.y < this.mapHeight
      );

      if (!inBounds) continue;

      patternsChecked2x2++;
      const occupiedCount = pattern.filter(p => occupied.has(`${p.x},${p.y}`)).length;

      if (occupiedCount >= 3) {
        trapRisk2x2 = Math.max(trapRisk2x2, 0.8);
      } else if (occupiedCount === 2) {
        trapRisk2x2 = Math.max(trapRisk2x2, 0.4);
      }
    }

    // 2. 3x3模式检测 (增强检测，权重0.4)
    let trapRisk3x3 = 0.0;
    
    // 生成3x3区域偏移
    const offsets = [
      { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
      { dx: -1, dy: 0 },  { dx: 0, dy: 0 },  { dx: 1, dy: 0 },
      { dx: -1, dy: 1 },  { dx: 0, dy: 1 },  { dx: 1, dy: 1 }
    ];
    
    // 检查3x3区域内不同配置
    const patterns3x3ToCheck = 3; // 检查多个3x3配置
    for (let p = 0; p < patterns3x3ToCheck; p++) {
      let occupiedCount = 0;
      let totalInBounds = 0;
      
      // 随机偏移中心点来检查不同配置
      const centerX = pos.x + (p % 3) - 1;
      const centerY = pos.y + Math.floor(p / 3) - 1;
      
      for (const offset of offsets) {
        const checkX = centerX + offset.dx;
        const checkY = centerY + offset.dy;
        
        if (checkX >= 0 && checkX < this.mapWidth && checkY >= 0 && checkY < this.mapHeight) {
          totalInBounds++;
          if (occupied.has(`${checkX},${checkY}`)) {
            occupiedCount++;
          }
        }
      }
      
      // 评估3x3区域危险度
      if (totalInBounds >= 6) { // 至少检查6格才有意义
        const occupancyRate = occupiedCount / totalInBounds;
        if (occupancyRate >= 0.7) { // 70%以上占用
          trapRisk3x3 = Math.max(trapRisk3x3, 0.9);
        } else if (occupancyRate >= 0.5) { // 50-70%占用
          trapRisk3x3 = Math.max(trapRisk3x3, 0.6);
        } else if (occupancyRate >= 0.3) { // 30-50%占用
          trapRisk3x3 = Math.max(trapRisk3x3, 0.3);
        }
      }
    }

    // 3. 邻居数量风险评估
    const neighbors = this.getValidNeighbors(pos, obstacles);
    let neighborRisk = 0.0;
    if (neighbors.length <= 1) {
      neighborRisk = 0.9;
    } else if (neighbors.length === 2) {
      neighborRisk = 0.5;
    } else if (neighbors.length === 3) {
      neighborRisk = 0.2;
    }

    // 4. 走廊风险评估 (新增)
    const corridorRisk = this.detectCorridorRisk(pos, occupied);
    
    // 5. 综合风险评估 (混合权重)
    let combinedRisk = 0.0;
    
    // 2x2模式权重：40%
    combinedRisk += trapRisk2x2 * 0.4;
    
    // 3x3模式权重：30%
    combinedRisk += trapRisk3x3 * 0.3;
    
    // 邻居风险权重：20%
    combinedRisk += neighborRisk * 0.2;
    
    // 走廊风险权重：10%
    combinedRisk += corridorRisk * 0.1;
    
    // 确保在0-1范围内
    return Math.min(Math.max(combinedRisk, 0.0), 1.0);
  }

  // 新增：走廊风险评估方法
  private detectCorridorRisk(pos: Coordinate, occupied: Set<string>): number {
    const visited = new Set();
    const queue = [{ ...pos, depth: 0 }];
    visited.add(`${pos.x},${pos.y}`);
    
    let minWidth = Infinity;
    let totalCells = 0;
    let maxDepth = 0;
    
    while (queue.length > 0 && totalCells < 20) {
      const current = queue.shift()!;
      totalCells++;
      maxDepth = Math.max(maxDepth, current.depth);
      
      const neighbors = this.getValidNeighbors(current, Array.from(occupied).map(s => {
        const [x, y] = s.split(',').map(Number);
        return { x, y };
      }));
      
      const width = neighbors.length;
      if (width < minWidth) {
        minWidth = width;
      }
      
      // 深度限制探索
      if (current.depth < 3) {
        for (const neighbor of neighbors) {
          const key = `${neighbor.x},${neighbor.y}`;
          if (!visited.has(key)) {
            visited.add(key);
            queue.push({ ...neighbor, depth: current.depth + 1 });
          }
        }
      }
    }
    
    // 基于最小宽度评估走廊风险
    if (minWidth === 1) {
      return 0.9; // 单宽度走廊：高风险
    } else if (minWidth === 2) {
      return 0.5; // 双宽度走廊：中等风险
    } else if (minWidth <= 0) {
      return 1.0; // 死路：最高风险
    }
    
    // 考虑深度因素：浅层窄空间更危险
    const depthFactor = maxDepth < 2 ? 0.8 : 0.5;
    
    return Math.min(1.0, (1.0 - (minWidth / 4.0)) * depthFactor);
  }

  private countAccessibleSpace(startPos: Coordinate, obstacles: Coordinate[]): number {
    const occupied = new Set(obstacles.map(o => `${o.x},${o.y}`));
    const visited = new Set();
    const queue: Coordinate[] = [startPos];
    visited.add(`${startPos.x},${startPos.y}`);

    let count = 0;
    
    // 动态计算限制：基于地图大小和障碍物数量
    const totalCells = this.mapWidth * this.mapHeight;
    const obstacleCount = obstacles.length;
    
    // 动态限制计算
    const dynamicLimit = Math.min(
      totalCells,                           // 不超过总格子数
      totalCells * 0.3 + 100,               // 基础限制：总格子的30% + 100
      Math.max(obstacleCount * 6, 150)      // 基于障碍物数量的扩展
    );

    while (queue.length > 0 && count < dynamicLimit) {
      const current = queue.shift()!;
      count++;

      const neighbors = this.getValidNeighbors(current, Array.from(occupied).map(s => {
        const [x, y] = s.split(',').map(Number);
        return { x, y };
      }));
      
      for (const neighbor of neighbors) {
        const key = `${neighbor.x},${neighbor.y}`;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push(neighbor);
        }
      }
    }

    // 如果达到限制但仍有待探索区域，返回估计值
    if (count >= dynamicLimit && queue.length > 0) {
      // 估计未探索区域：考虑队列长度和可能的扩展
      const estimatedUnvisited = queue.length * 1.2; // 保守估计
      return count + Math.min(estimatedUnvisited, totalCells - count);
    }

    return count;
  }

  private getValidNeighbors(pos: Coordinate, obstacles: Coordinate[]): Coordinate[] {
    const occupied = new Set(obstacles.map(o => `${o.x},${o.y}`));
    const neighbors: Coordinate[] = [];
    const dirs = [
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 }
    ];

    for (const d of dirs) {
      const nx = pos.x + d.x;
      const ny = pos.y + d.y;

      if (nx >= 0 && nx < this.mapWidth && ny >= 0 && ny < this.mapHeight) {
        if (!occupied.has(`${nx},${ny}`)) {
          neighbors.push({ x: nx, y: ny });
        }
      }
    }

    return neighbors;
  }

  public setConfig(config: Partial<LookaheadConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
