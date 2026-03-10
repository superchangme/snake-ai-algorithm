import { Coordinate, Direction } from '../types';
import { AStar } from './AStar';
import { LookaheadEvaluator } from './Lookahead';
import { DivideHC } from './DivideHC';
import { SmartShortcuts } from './SmartShortcuts';
import { HamiltonianCycle } from './HamiltonianCycle';
import { ShortcutOptimizer } from './ShortcutOptimizer';
import { PerfectHamiltonSolver } from './PerfectHamiltonSolver';

export class AIController {
  private pathfinder: AStar;
  private lookahead: LookaheadEvaluator;
  private mapWidth: number;
  private mapHeight: number;
  private currentDirection: Direction;
  private divideHC: DivideHC | null = null;
  private smartShortcuts: SmartShortcuts | null = null;
  private currentHC: Coordinate[] = [];
  private dynamicHCEnabled: boolean = false;

  constructor(mapWidth: number, mapHeight: number, snakeDirection: Direction) {
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.currentDirection = snakeDirection;
    this.pathfinder = new AStar(mapWidth, mapHeight);

    // 条件性启用Hamiltonian Cycle策略
    // 仅在地图尺寸适合（<=100格子且长宽都是偶数）时启用
    this.initializeHCStrategy(mapWidth, mapHeight);

    // 优化的Lookahead配置：基于地图大小动态配置
    const totalCells = mapWidth * mapHeight;
    const isLargeMap = totalCells >= 200;
    const isExtraLargeMap = totalCells >= 300;

    const lookaheadConfig = {
      maxDepthEarly: 2,
      maxDepthMid: isLargeMap ? 4 : 3,  // 大地图中期增加前瞻深度
      maxDepthLate: isLargeMap ? 4 : 3,  // 大地图晚期增加前瞻深度
      maxTimeMs: isExtraLargeMap ? 8 : (isLargeMap ? 6 : 5),  // 动态时间预算
      trapSizeThreshold: 4,               // 增加陷阱检测灵敏度
      spaceWeight: 15,                    // 提高空间重要性
      trapPenalty: 800                    // 增加陷阱惩罚
    };

    this.lookahead = new LookaheadEvaluator(mapWidth, mapHeight, lookaheadConfig);
  }

  /**
    * 获取Hamiltonian Cycle策略的方向
    * 策略流程：
    * 1. 如果食物在cycle上，计算沿HC距离，检查能否shortcut，返回最优方向
    * 2. 如果食物不在cycle上或shortcut不可行，沿HC移动
    * 3. 关键修复：当HC下一位置被阻挡时，继续沿HC寻找下一个安全位置
    * 4. 绝对不降级到三阶段策略 - HC策略始终应该工作
    */
  private getHCDirection(
    head: Coordinate,
    body: Coordinate[],
    food: Coordinate
  ): { direction: Direction; strategy: string; confidence: number } | null {
    if (!this.hc || !this.shortcutOptimizer || !this.hcEnabled) {
      return null;
    }

    const snakeLength = body.length;
    const obstacles = body.slice(1);

    // 检查头部是否在HC上
    if (!this.hc.isOnCycle(head)) {
      return null;
    }

    // 策略1：食物在HC上 - 尝试shortcut
    if (this.hc.isOnCycle(food)) {
      const cycleDistance = this.hc.distanceAlongCycle(head, food);

      if (cycleDistance > 0) {
        // 尝试检查能否走捷径
        if (this.shortcutOptimizer.canTakeShortcut(head, food, body, snakeLength)) {
          const shortcutPath = this.shortcutOptimizer.getShortcutPath(head, food, body);
          if (shortcutPath && shortcutPath.length > 0) {
            const firstStep = shortcutPath[0];
            const dir = this.getDirectionFromMove(head, firstStep);
            if (dir !== null && this.isSafeDirection(head, obstacles, dir)) {
              this.currentDirection = dir;
              return { direction: dir, strategy: 'hc-shortcut', confidence: 0.95 };
            }
          }
        }

        // shortcut不可行或不安全，沿HC移动
        const hcDir = this.getSafeHCDirection(head, obstacles);
        if (hcDir !== null) {
          this.currentDirection = hcDir;
          return { direction: hcDir, strategy: 'hc-follow-shortcut-failed', confidence: 0.85 };
        }
      }
    }

    // 策略2：食物不在HC上或HC移动 - 沿HC移动
    const hcDir = this.getSafeHCDirection(head, obstacles);
    if (hcDir !== null) {
      this.currentDirection = hcDir;
      return { direction: hcDir, strategy: 'hc-follow', confidence: 0.9 };
    }

    // 极端情况：HC上所有位置都被阻挡（不应该发生）
    // 尝试找任何安全方向
    const anySafeDir = this.findAnySafeDirection(head, obstacles);
    if (anySafeDir !== null) {
      this.currentDirection = anySafeDir;
      return { direction: anySafeDir, strategy: 'hc-desperate', confidence: 0.3 };
    }

    // 最后手段：保持当前方向
    return { direction: this.currentDirection, strategy: 'hc-wait', confidence: 0.1 };
  }

  /**
   * 获取沿HC的下一个安全方向
   * 关键：即使下一位置被阻挡，继续沿HC寻找直到找到安全位置
   */
  private getSafeHCDirection(
    head: Coordinate,
    obstacles: Coordinate[]
  ): Direction | null {
    if (!this.hc) return null;

    const currentIndex = this.hc.getPositionIndex(head);
    if (currentIndex === null) return null;

    const cycleLength = this.hc.getLength();

    // 遍历整个HC寻找下一个安全位置（最多一整圈）
    for (let offset = 1; offset < cycleLength; offset++) {
      const nextIndex = (currentIndex + offset) % cycleLength;
      const nextPos = this.hc.getFullCycle()[nextIndex];

      // 检查是否安全（不在障碍物中）
      const isSafe = !obstacles.some(o => o.x === nextPos.x && o.y === nextPos.y);

      if (isSafe) {
        const dir = this.getDirectionFromMove(head, nextPos);
        if (dir !== null && !this.isOpposite(this.currentDirection, dir)) {
          return dir;
        }
      }
    }

    return null;
  }

  /**
   * 寻找任何安全方向（极端情况下使用）
   */
  private findAnySafeDirection(
    head: Coordinate,
    obstacles: Coordinate[]
  ): Direction | null {
    const directions = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];

    for (const dir of directions) {
      if (this.isSafeDirection(head, obstacles, dir)) {
        if (!this.isOpposite(this.currentDirection, dir)) {
          return dir;
        }
      }
    }

    // 如果所有方向都相反，至少返回当前方向
    return this.currentDirection;
  }

  /**
   * 从移动计算方向
   */
  private getDirectionFromMove(from: Coordinate, to: Coordinate): Direction | null {
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    if (dx === 1 && dy === 0) return Direction.RIGHT;
    if (dx === -1 && dy === 0) return Direction.LEFT;
    if (dx === 0 && dy === 1) return Direction.DOWN;
    if (dx === 0 && dy === -1) return Direction.UP;

    return null;
  }

  /**
   * 初始化Hamiltonian Cycle策略
   * 仅在地图尺寸适合时启用（<=100格子且长宽都是偶数）
   */
  private initializeHCStrategy(width: number, height: number): void {
    const totalCells = width * height;
    // HC策略条件：地图<=100格子 且 长宽都是偶数
    if (totalCells <= 100 && width % 2 === 0 && height % 2 === 0) {
      try {
        this.hc = new HamiltonianCycle(width, height);
        this.shortcutOptimizer = new ShortcutOptimizer(this.hc, width, height);
        this.hcEnabled = true;
        console.log(`[AIController] HC策略已启用: ${width}x${height} 网格`);
      } catch (error) {
        console.warn(`[AIController] HC策略初始化失败: ${error}`);
        this.hcEnabled = false;
      }
    } else {
      this.hcEnabled = false;
      if (totalCells > 100) {
        console.log(`[AIController] HC策略禁用: 地图太大 (${totalCells} > 100)`);
      } else if (width % 2 !== 0 || height % 2 !== 0) {
        console.log(`[AIController] HC策略禁用: 地图维度不是偶数 (${width}x${height})`);
      }
    }
  }

  public updateMapSize(width: number, height: number): void {
    this.mapWidth = width;
    this.mapHeight = height;
    this.pathfinder = new AStar(width, height);

    // 重新评估HC策略
    this.initializeHCStrategy(width, height);

    // 使用相同的动态配置逻辑
    const totalCells = width * height;
    const isLargeMap = totalCells >= 200;
    const isExtraLargeMap = totalCells >= 300;

    const lookaheadConfig = {
      maxDepthEarly: 2,
      maxDepthMid: isLargeMap ? 4 : 3,
      maxDepthLate: isLargeMap ? 4 : 3,
      maxTimeMs: isExtraLargeMap ? 8 : (isLargeMap ? 6 : 5),
      trapSizeThreshold: 4,
      spaceWeight: 15,
      trapPenalty: 800
    };

    this.lookahead = new LookaheadEvaluator(width, height, lookaheadConfig);
  }

  public updateDirection(direction: Direction): void {
    this.currentDirection = direction;
  }

  public getDecision(
    snakeHead: Coordinate,
    snakeBody: Coordinate[],
    foodPosition: Coordinate
  ): { direction: Direction; strategy: string; confidence: number } {
    // 优先尝试HC策略（如果启用且适用）
    if (this.hcEnabled) {
      const hcResult = this.getHCDirection(snakeHead, snakeBody, foodPosition);
      if (hcResult !== null) {
        return hcResult;
      }
      // 如果HC策略返回null，说明当前情况不适合HC，降级到三阶段策略
    }

    const snakeLength = snakeBody.length;
    const fillRate = snakeLength / (this.mapWidth * this.mapHeight);
    const totalCells = this.mapWidth * this.mapHeight;

    // 优化的阶段阈值：考虑地图大小
    const earlyThreshold = 0.20;  // 早期游戏：<20%
    const lateThreshold = totalCells >= 200 ? 0.55 : 0.60;  // 大地图晚期阈值提前

    if (fillRate >= lateThreshold) {
      return this.getLateGameDecision(snakeHead, snakeBody, foodPosition);
    }

    if (fillRate >= earlyThreshold) {
      return this.getMidGameDecision(snakeHead, snakeBody, foodPosition);
    }

    return this.getEarlyGameDecision(snakeHead, snakeBody, foodPosition);
  }

  private getEarlyGameDecision(
    head: Coordinate,
    body: Coordinate[],
    food: Coordinate
  ): { direction: Direction; strategy: string; confidence: number } {
    const obstacles = body.slice(1);

    this.pathfinder.updateObstacles(obstacles);
    const path = this.pathfinder.findPath(head, food);

    if (path && path.length > 0) {
      const candidateDir = path[0];
      const nextPos = this.getNextPosition(head, candidateDir);

      // 使用前瞻验证路径安全性
      const lookaheadResult = this.lookahead.evaluate(nextPos, [...obstacles, head], food, 2);

      if (lookaheadResult.trapRisk > 0.6) {
        return this.findAlternativePath(head, obstacles, food);
      }

      if (this.isSafeDirection(head, obstacles, candidateDir)) {
        const confidence = lookaheadResult.trapRisk < 0.3 ? 0.9 : 0.7;
        this.currentDirection = candidateDir;
        return { direction: candidateDir, strategy: '早期A*+前瞻', confidence };
      }
    }

    const safeDirs = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT]
      .filter(d => this.isSafeDirection(head, obstacles, d));

    if (safeDirs.length > 0) {
      const nonReverse = safeDirs.filter(d => !this.isOpposite(this.currentDirection, d));
      const choice = nonReverse.length > 0 ? nonReverse[0] : safeDirs[0];
      this.currentDirection = choice;
      return { direction: choice, strategy: '早期安全', confidence: 0.6 };
    }

    return { direction: this.currentDirection, strategy: '早期等待', confidence: 0.2 };
  }

  private findAlternativePath(
    head: Coordinate,
    obstacles: Coordinate[],
    food: Coordinate
  ): { direction: Direction; strategy: string; confidence: number } {
    const safeDirs = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT]
      .filter(d => this.isSafeDirection(head, obstacles, d))
      .filter(d => !this.isOpposite(this.currentDirection, d));

    if (safeDirs.length > 0) {
      const sortedDirs = [...safeDirs].sort((a, b) => {
        const posA = this.getNextPosition(head, a);
        const posB = this.getNextPosition(head, b);
        return this.getDistance(posA, food) - this.getDistance(posB, food);
      });

      for (const altDir of sortedDirs) {
        const altPos = this.getNextPosition(head, altDir);
        const altLookahead = this.lookahead.evaluate(altPos, [...obstacles, head], food, 2);
        if (altLookahead.trapRisk < 0.4) {
          this.currentDirection = altDir;
          return { direction: altDir, strategy: '早期替代路径', confidence: 0.7 };
        }
      }

      this.currentDirection = sortedDirs[0];
      return { direction: sortedDirs[0], strategy: '早期最近方向', confidence: 0.5 };
    }

    return { direction: this.currentDirection, strategy: '早期等待', confidence: 0.2 };
  }

  private getMidGameDecision(
    head: Coordinate,
    body: Coordinate[],
    food: Coordinate
  ): { direction: Direction; strategy: string; confidence: number } {
    const obstacles = body.slice(1);
    const tail = body[body.length - 1];
    const snakeLength = body.length;
    const directions = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];

    const safeDirs = directions.filter(d => this.isSafeDirection(head, obstacles, d));

    if (safeDirs.length === 0) {
      for (const dir of directions) {
        const nextPos = this.getNextPosition(head, dir);
        if (this.isInBounds(nextPos)) {
          return { direction: dir, strategy: '紧急存活', confidence: 0.3 };
        }
      }
      return { direction: this.currentDirection, strategy: '等待', confidence: 0.1 };
    }

    const candidates = safeDirs.map(dir => {
      const nextPos = this.getNextPosition(head, dir);
      const nextObstacles = [...obstacles, head];

      const lookaheadResult = this.lookahead.evaluate(nextPos, nextObstacles, tail, 3);
      const escapePrediction = this.predictEscapePath(nextPos, nextObstacles, 2);
      const pathDecay = this.calculatePathDecayFactor(nextPos, nextObstacles, snakeLength);
      const corridorInfo = this.detectCorridor(nextPos, nextObstacles, snakeLength);
      const spaceSize = this.countAccessibleSpace(nextPos, nextObstacles);
      const distToFood = this.getDistance(nextPos, food);
      const canReachTail = this.canReachPosition(nextPos, tail, nextObstacles);
      const willTrap = !canReachTail || this.willCreateTrap(nextPos, nextObstacles);

      return {
        dir,
        spaceSize,
        escapePrediction,
        pathDecay,
        distToFood,
        willTrap,
        corridorInfo,
        trapRisk: lookaheadResult.trapRisk,
        lookaheadSpace: lookaheadResult.spaceSize
      };
    });

    candidates.sort((a, b) => {
      if (a.trapRisk > 0.5 && b.trapRisk <= 0.5) return 1;
      if (b.trapRisk > 0.5 && a.trapRisk <= 0.5) return -1;

      if (a.willTrap !== b.willTrap) return a.willTrap ? 1 : -1;

      if (a.corridorInfo.isDeadlyCorridor !== b.corridorInfo.isDeadlyCorridor) {
        return a.corridorInfo.isDeadlyCorridor ? 1 : -1;
      }
      if (a.corridorInfo.isCorridor !== b.corridorInfo.isCorridor) {
        return a.corridorInfo.isCorridor ? 1 : -1;
      }

      if (a.escapePrediction.hasEscape !== b.escapePrediction.hasEscape) {
        return b.escapePrediction.hasEscape ? 1 : -1;
      }
      if (Math.abs(a.spaceSize - b.spaceSize) > 5) return b.spaceSize - a.spaceSize;
      return a.distToFood - b.distToFood;
    });

    const safeMoves = candidates.filter(c =>
      !c.willTrap &&
      !c.corridorInfo.isDeadlyCorridor &&
      c.trapRisk <= 0.5
    );

    const finalCandidates = safeMoves.length > 0 ? safeMoves : candidates;
    const best = finalCandidates[0];

    if (this.isOpposite(this.currentDirection, best.dir) && candidates.length > 1) {
      const nonReverse = candidates.find(c =>
        !this.isOpposite(this.currentDirection, c.dir) &&
        c.trapRisk <= 0.5 &&
        !c.willTrap
      );
      if (nonReverse) {
        this.currentDirection = nonReverse.dir;
        return { direction: nonReverse.dir, strategy: '中期安全', confidence: 0.75 };
      }
    }

    this.currentDirection = best.dir;
    return { direction: best.dir, strategy: '中期生存', confidence: 0.7 };
  }

  private getLateGameDecision(
    head: Coordinate,
    body: Coordinate[],
    food: Coordinate
  ): { direction: Direction; strategy: string; confidence: number } {
    const obstacles = body.slice(1);
    const snakeLength = body.length;
    const tail = body[body.length - 1];
    const directions = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];

    const safeDirs = directions.filter(d => this.isSafeDirection(head, obstacles, d));

    if (safeDirs.length === 0) {
      return this.getMidGameDecision(head, body, food);
    }

    const candidates = safeDirs.map(dir => {
      const nextPos = this.getNextPosition(head, dir);
      const nextObstacles = [...obstacles, head];
      const spaceSize = this.countAccessibleSpace(nextPos, nextObstacles);
      const escapePrediction = this.predictEscapePath(nextPos, nextObstacles, 3);
      const pathDecay = this.calculatePathDecayFactor(nextPos, nextObstacles, snakeLength);
      const corridorInfo = this.detectCorridor(nextPos, nextObstacles, snakeLength);
      const distToFood = this.getDistance(nextPos, food);

      const occupied = new Set(nextObstacles.map(o => `${o.x},${o.y}`));
      const neighbors = this.getNeighbors(nextPos);
      const freeNeighbors = neighbors.filter(n => !occupied.has(`${n.x},${n.y}`));
      const branchFactor = freeNeighbors.length;

      const willEat = nextPos.x === food.x && nextPos.y === food.y;
      let canReachTailAfterEating = false;
      if (willEat) {
        const afterEatBody = body.slice(0, -1);
        canReachTailAfterEating = this.canReachPosition(food, tail, afterEatBody);
      }

      const canReachTail = this.canReachPosition(nextPos, tail, nextObstacles);
      const willTrap = this.willCreateTrap(nextPos, nextObstacles);

      let score = spaceSize * 20;
      if (escapePrediction.hasEscape) score += 500 * escapePrediction.confidence * pathDecay;
      if (willEat && canReachTailAfterEating) score += 1500;
      if (canReachTail) score += 300;
      if (willTrap) score -= 2000;
      if (branchFactor >= 2) score += 200;
      if (branchFactor === 1) score -= 800;
      if (corridorInfo.isDeadlyCorridor) score -= 8000;
      else if (corridorInfo.isCorridor) score -= 400;
      score -= distToFood * 5;

      return {
        dir,
        score,
        spaceSize,
        escapePrediction,
        pathDecay,
        branchFactor,
        corridorInfo,
        canReachTail,
        canReachTailAfterEating,
        willTrap,
        willEat
      };
    });

    candidates.sort((a, b) => b.score - a.score);

    // 优先：吃完能到达尾巴
    const canSurviveEat = candidates.filter(c => c.willEat && c.canReachTailAfterEating && !c.willTrap);
    if (canSurviveEat.length > 0) {
      const best = canSurviveEat.sort((a, b) => b.score - a.score)[0];
      this.currentDirection = best.dir;
      return { direction: best.dir, strategy: '晚期吃完存活', confidence: 0.85 };
    }

    // 其次：安全移动
    const safe = candidates.filter(c => !c.willTrap && !c.corridorInfo.isDeadlyCorridor);
    if (safe.length > 0) {
      const best = safe.sort((a, b) => b.score - a.score)[0];
      this.currentDirection = best.dir;
      return { direction: best.dir, strategy: '晚期安全', confidence: 0.75 };
    }

    const best = candidates[0];
    this.currentDirection = best.dir;
    return { direction: best.dir, strategy: '晚期保命', confidence: 0.5 };
  }

  private canReachPosition(start: Coordinate, target: Coordinate, obstacles: Coordinate[]): boolean {
    const occupied = new Set(obstacles.map(o => `${o.x},${o.y}`));
    const visited = new Set();
    const queue: Coordinate[] = [start];
    visited.add(`${start.x},${start.y}`);

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.x === target.x && current.y === target.y) {
        return true;
      }

      const neighbors = this.getNeighbors(current);
      for (const neighbor of neighbors) {
        const key = `${neighbor.x},${neighbor.y}`;
        if (!visited.has(key) && !occupied.has(key)) {
          visited.add(key);
          queue.push(neighbor);
        }
      }
    }

    return false;
  }

  // Predict if a move will create a trap (2x2 enclosed area)
  private willCreateTrap(pos: Coordinate, obstacles: Coordinate[]): boolean {
    const occupied = new Set(obstacles.map(o => `${o.x},${o.y}`));

    // Check all 2x2 patterns that include this position
    const patterns = [
      [{x: pos.x, y: pos.y}, {x: pos.x+1, y: pos.y}, {x: pos.x, y: pos.y+1}, {x: pos.x+1, y: pos.y+1}],
      [{x: pos.x-1, y: pos.y}, {x: pos.x, y: pos.y}, {x: pos.x-1, y: pos.y+1}, {x: pos.x, y: pos.y+1}],
      [{x: pos.x, y: pos.y-1}, {x: pos.x+1, y: pos.y-1}, {x: pos.x, y: pos.y}, {x: pos.x+1, y: pos.y}],
      [{x: pos.x-1, y: pos.y-1}, {x: pos.x, y: pos.y-1}, {x: pos.x-1, y: pos.y}, {x: pos.x, y: pos.y}]
    ];

    for (const pattern of patterns) {
      // Check if all 4 cells are in bounds
      const inBounds = pattern.every(p =>
        p.x >= 0 && p.x < this.mapWidth && p.y >= 0 && p.y < this.mapHeight
      );
      if (!inBounds) continue;

      // Check if 3 of 4 cells are occupied (creating potential trap)
      const occupiedCount = pattern.filter(p => occupied.has(`${p.x},${p.y}`)).length;
      if (occupiedCount >= 3) {
        // Verify the pattern forms a proper corner trap
        const freeCell = pattern.find(p => !occupied.has(`${p.x},${p.y}`));
        if (freeCell) {
          // Check if the free cell has only 1 neighbor (dead end)
          const neighbors = this.getNeighbors(freeCell);
          const freeNeighbors = neighbors.filter(n => !occupied.has(`${n.x},${n.y}`));
          if (freeNeighbors.length <= 1) {
            return true;
          }
        }
      }
    }

    return false;
  }

  private detectCorridor(startPos: Coordinate, obstacles: Coordinate[], snakeLength: number): { 
    isCorridor: boolean; 
    isDeadlyCorridor: boolean; 
    width: number;
    corridorType: 'NONE' | 'WIDE' | 'NARROW' | 'DEADLY';
    widthDistribution: { width1: number; width2: number; width3: number; width4: number };
    deadEndRatio: number;
    narrowRatio: number;
  } {
    const occupied = new Set(obstacles.map(o => `${o.x},${o.y}`));
    const visited = new Set();
    const queue: Coordinate[] = [startPos];
    visited.add(`${startPos.x},${startPos.y}`);

    let minWidth = Infinity;
    let totalCells = 0;
    let deadEndCount = 0;
    let widthDistribution = { width1: 0, width2: 0, width3: 0, width4: 0 };

    while (queue.length > 0) {
      const current = queue.shift()!;
      totalCells++;

      const neighbors = this.getNeighbors(current);
      const freeNeighbors = neighbors.filter(n => !occupied.has(`${n.x},${n.y}`));
      const width = freeNeighbors.length;
      
      // 记录宽度分布
      if (width === 1) widthDistribution.width1++;
      else if (width === 2) widthDistribution.width2++;
      else if (width === 3) widthDistribution.width3++;
      else if (width === 4) widthDistribution.width4++;
      
      if (width < minWidth) minWidth = width;
      if (width === 1) deadEndCount++;

      for (const neighbor of freeNeighbors) {
        const key = `${neighbor.x},${neighbor.y}`;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push(neighbor);
        }
      }
    }

    // 计算比例
    const deadEndRatio = totalCells > 0 ? deadEndCount / totalCells : 0;
    const narrowRatio = totalCells > 0 ? (widthDistribution.width1 + widthDistribution.width2) / totalCells : 0;
    
    // 精细的走廊类型判断
    let corridorType: 'NONE' | 'WIDE' | 'NARROW' | 'DEADLY' = 'NONE';
    let isCorridor = false;
    let isDeadlyCorridor = false;

    // 1. 死亡走廊：最小宽度≤1
    if (minWidth <= 1) {
      corridorType = 'DEADLY';
      isDeadlyCorridor = true;
      isCorridor = true;
    } 
    // 2. 狭窄走廊：最小宽度=2，高死端率或高狭窄率
    else if (minWidth <= 2) {
      if (deadEndRatio > 0.3 || narrowRatio > 0.5) {
        corridorType = 'NARROW';
        isCorridor = true;
      } else if (totalCells < snakeLength * 3) {
        corridorType = 'NARROW';
        isCorridor = true;
      } else if (deadEndRatio > 0.15) {
        corridorType = 'WIDE';
        isCorridor = true;
      }
    }
    // 3. 宽走廊：最小宽度=2，低死端率
    else if (minWidth === 2 && deadEndRatio > 0.1) {
      corridorType = 'WIDE';
      isCorridor = true;
    }

    return { 
      isCorridor, 
      isDeadlyCorridor, 
      width: minWidth,
      corridorType,
      widthDistribution,
      deadEndRatio,
      narrowRatio
    };
  }

  private isSafeDirection(head: Coordinate, obstacles: Coordinate[], dir: Direction): boolean {
    const next = this.getNextPosition(head, dir);
    if (!this.isInBounds(next)) return false;
    if (obstacles.some(o => o.x === next.x && o.y === next.y)) return false;
    return true;
  }

  private isInBounds(pos: Coordinate): boolean {
    return pos.x >= 0 && pos.x < this.mapWidth && pos.y >= 0 && pos.y < this.mapHeight;
  }

  private countAccessibleSpace(startPos: Coordinate, obstacles: Coordinate[]): number {
    const occupied = new Set(obstacles.map(o => `${o.x},${o.y}`));
    const visited = new Set();
    const queue: Coordinate[] = [startPos];
    visited.add(`${startPos.x},${startPos.y}`);

    let count = 0;

    while (queue.length > 0) {
      const current = queue.shift()!;
      count++;

      const neighbors = this.getNeighbors(current);
      for (const neighbor of neighbors) {
        const key = `${neighbor.x},${neighbor.y}`;
        if (!visited.has(key) && !occupied.has(key)) {
          visited.add(key);
          queue.push(neighbor);
        }
      }
    }

    return count;
  }

  private hasEscapeRoute(startPos: Coordinate, obstacles: Coordinate[]): boolean {
    const occupied = new Set(obstacles.map(o => `${o.x},${o.y}`));
    const visited = new Set();
    const queue: Coordinate[] = [startPos];
    visited.add(`${startPos.x},${startPos.y}`);

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.x === 0 || current.x === this.mapWidth - 1 || current.y === 0 || current.y === this.mapHeight - 1) {
        return true;
      }

      const neighbors = this.getNeighbors(current);
      for (const neighbor of neighbors) {
        const key = `${neighbor.x},${neighbor.y}`;
        if (!visited.has(key) && !occupied.has(key)) {
          visited.add(key);
          queue.push(neighbor);
        }
      }
    }

    return false;
  }

  private getNeighbors(pos: Coordinate): Coordinate[] {
    const neighbors: Coordinate[] = [];
    const dirs = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
    for (const d of dirs) {
      const nx = pos.x + d.x;
      const ny = pos.y + d.y;
      if (nx >= 0 && nx < this.mapWidth && ny >= 0 && ny < this.mapHeight) {
        neighbors.push({ x: nx, y: ny });
      }
    }
    return neighbors;
  }

  private getDistance(pos1: Coordinate, pos2: Coordinate): number {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
  }

  private getNextPosition(pos: Coordinate, dir: Direction): Coordinate {
    switch (dir) {
      case Direction.UP: return { x: pos.x, y: pos.y - 1 };
      case Direction.DOWN: return { x: pos.x, y: pos.y + 1 };
      case Direction.LEFT: return { x: pos.x - 1, y: pos.y };
      case Direction.RIGHT: return { x: pos.x + 1, y: pos.y };
    }
  }

  private isOpposite(dir1: Direction, dir2: Direction): boolean {
    return (dir1 === Direction.UP && dir2 === Direction.DOWN) ||
           (dir1 === Direction.DOWN && dir2 === Direction.UP) ||
           (dir1 === Direction.LEFT && dir2 === Direction.RIGHT) ||
           (dir1 === Direction.RIGHT && dir2 === Direction.LEFT);
  }

  public reset(): void {
    this.currentDirection = Direction.RIGHT;
  }

  private predictEscapePath(
    position: Coordinate,
    obstacles: Coordinate[],
    predictionSteps: number = 2
  ): { hasEscape: boolean; riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'; confidence: number } {
    const immediateEscape = this.hasEscapeRoute(position, obstacles);

    if (!immediateEscape) {
      return { hasEscape: false, riskLevel: 'HIGH', confidence: 0 };
    }

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';

    for (let i = 0; i < predictionSteps; i++) {
      const futureObstacles = obstacles.slice(1);
      futureObstacles.push(position);

      if (!this.hasEscapeRoute(position, futureObstacles)) {
        riskLevel = 'HIGH';
        break;
      }
    }

    let confidence = riskLevel === 'HIGH' ? 0.3 : 0.9;
    if (riskLevel === 'LOW') {
      confidence = 1.0 - (predictionSteps * 0.1);
    }

    return { hasEscape: true, riskLevel, confidence };
  }

  private calculatePathDecayFactor(
    position: Coordinate,
    obstacles: Coordinate[],
    snakeLength: number
  ): number {
    const pathLength = this.findDistanceToBoundary(position, obstacles);
    const tail = obstacles[obstacles.length - 1];
    const distanceToTail = this.getDistance(position, tail);

    if (pathLength < snakeLength * 0.3) return 0.5;
    if (distanceToTail < 5) return 0.7;

    return 1.0;
  }

  private findDistanceToBoundary(startPos: Coordinate, obstacles: Coordinate[]): number {
    const occupied = new Set(obstacles.map(o => `${o.x},${o.y}`));
    const visited = new Set();
    const queue: { pos: Coordinate; distance: number }[] = [{ pos: startPos, distance: 0 }];
    visited.add(`${startPos.x},${startPos.y}`);

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.pos.x === 0 || current.pos.x === this.mapWidth - 1 ||
          current.pos.y === 0 || current.pos.y === this.mapHeight - 1) {
        return current.distance;
      }

      const neighbors = this.getNeighbors(current.pos);
      for (const neighbor of neighbors) {
        const key = `${neighbor.x},${neighbor.y}`;
        if (!visited.has(key) && !occupied.has(key)) {
          visited.add(key);
          queue.push({ pos: neighbor, distance: current.distance + 1 });
        }
      }
    }

    return Infinity;
  }
}
