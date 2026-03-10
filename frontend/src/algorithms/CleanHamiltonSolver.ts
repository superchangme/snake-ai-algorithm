import { Coordinate, Direction } from '../types';

/**
 * 干净的 Hamilton Cycle Solver - 基于 chuyangliu/snake
 * 目标: 填满整个 10x10 网格
 */
export class CleanHamiltonSolver {
  private mapWidth: number;
  private mapHeight: number;
  private cycle: Coordinate[] = [];
  private cycleIndex: Map<string, number> = new Map();

  constructor(mapWidth: number, mapHeight: number, _direction: Direction) {
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    // 偶数尺寸才能用 Hamiltonian Cycle
    if (mapWidth % 2 === 0 && mapHeight % 2 === 0) {
      this.buildZigzagCycle();
    }
  }

  private buildZigzagCycle(): void {
    // 构建 Zigzag Hamiltonian Cycle
    this.cycle = [];
    this.cycleIndex = new Map();
    
    // 从 (0,0) 开始
    let x = 0, y = 0;
    let goingRight = true;
    
    while (this.cycle.length < this.mapWidth * this.mapHeight) {
      const key = `${x},${y}`;
      this.cycle.push({ x, y });
      this.cycleIndex.set(key, this.cycle.length - 1);
      
      if (goingRight) {
        x++;
        if (x >= this.mapWidth) {
          x = this.mapWidth - 1;
          y++;
          goingRight = false;
        }
      } else {
        x--;
        if (x < 0) {
          x = 0;
          y++;
          goingRight = true;
        }
      }
      
      if (y >= this.mapHeight) break;
    }
  }

  public getDecision(
    snakeHead: Coordinate,
    snakeBody: Coordinate[],
    foodPosition: Coordinate
  ): { direction: Direction; strategy: string; confidence: number } {
    const occupied = new Set(snakeBody.map(p => `${p.x},${p.y}`));
    const snakeLength = snakeBody.length;
    
    // 始终尝试 BFS 找食物（更可靠）
    const path = this.bfsPath(snakeHead, foodPosition, occupied);
    if (path && path.length > 0) {
      const dir = path[0];
      const next = this.getNextPos(snakeHead, dir);
      if (this.isValidMove(next, occupied)) {
        return { direction: dir, strategy: 'bfs', confidence: 1.0 };
      }
    }
    
    // Fallback: 任何安全方向
    return this.getAnySafeDirection(snakeHead, occupied);
  }

  private tryShortcut(
    head: Coordinate,
    occupied: Set<string>,
    food: Coordinate,
    body: Coordinate[]
  ): Direction | null {
    // BFS 找食物
    const path = this.bfsPath(head, food, occupied);
    if (!path || path.length === 0) return null;
    
    // 检查 shortcut 是否安全
    // 使用相对距离判断
    const headIdx = this.cycleIndex.get(`${head.x},${head.y}`) ?? 0;
    const tail = body[body.length - 1];
    const tailIdx = this.cycleIndex.get(`${tail.x},${tail.y}`) ?? 0;
    const foodIdx = this.cycleIndex.get(`${food.x},${food.y}`) ?? 0;
    
    // 简化：只要能吃到食物就尝试
    return path[0];
  }

  private bfsPath(start: Coordinate, goal: Coordinate, occupied: Set<string>): Direction[] | null {
    const queue: Coordinate[] = [start];
    const visited = new Set<string>([`${start.x},${start.y}`]);
    const parent = new Map<string, { pos: Coordinate; dir: Direction }>();
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      
      if (current.x === goal.x && current.y === goal.y) {
        // 重建路径
        const path: Direction[] = [];
        let node: Coordinate = current;
        while (parent.has(`${node.x},${node.y}`)) {
          const p = parent.get(`${node.x},${node.y}`)!;
          path.unshift(p.dir);
          node = p.pos;
        }
        return path;
      }
      
      const neighbors = [
        { x: current.x, y: current.y - 1, dir: Direction.UP },
        { x: current.x, y: current.y + 1, dir: Direction.DOWN },
        { x: current.x - 1, y: current.y, dir: Direction.LEFT },
        { x: current.x + 1, y: current.y, dir: Direction.RIGHT },
      ];
      
      for (const n of neighbors) {
        const key = `${n.x},${n.y}`;
        if (n.x >= 0 && n.x < this.mapWidth && 
            n.y >= 0 && n.y < this.mapHeight &&
            !occupied.has(key) && !visited.has(key)) {
          visited.add(key);
          parent.set(key, { pos: current, dir: n.dir });
          queue.push({ x: n.x, y: n.y });
        }
      }
    }
    
    return null;
  }

  private getHCDirection(head: Coordinate, occupied: Set<string>): Direction | null {
    const headIdx = this.cycleIndex.get(`${head.x},${head.y}`) ?? 0;
    
    // 找下一个在 cycle 上且未被占据的位置
    for (let offset = 1; offset < this.cycle.length; offset++) {
      const nextIdx = (headIdx + offset) % this.cycle.length;
      const nextPos = this.cycle[nextIdx];
      
      if (!occupied.has(`${nextPos.x},${nextPos.y}`)) {
        const dx = nextPos.x - head.x;
        const dy = nextPos.y - head.y;
        
        if (dy < 0) return Direction.UP;
        if (dy > 0) return Direction.DOWN;
        if (dx < 0) return Direction.LEFT;
        if (dx > 0) return Direction.RIGHT;
      }
    }
    
    return null;
  }

  private isValidMove(pos: Coordinate, occupied: Set<string>): boolean {
    return pos.x >= 0 && pos.x < this.mapWidth &&
           pos.y >= 0 && pos.y < this.mapHeight &&
           !occupied.has(`${pos.x},${pos.y}`);
  }

  private getNextPos(pos: Coordinate, dir: Direction): Coordinate {
    switch (dir) {
      case Direction.UP: return { x: pos.x, y: pos.y - 1 };
      case Direction.DOWN: return { x: pos.x, y: pos.y + 1 };
      case Direction.LEFT: return { x: pos.x - 1, y: pos.y };
      case Direction.RIGHT: return { x: pos.x + 1, y: pos.y };
    }
  }

  private getAnySafeDirection(head: Coordinate, occupied: Set<string>): { direction: Direction; strategy: string; confidence: number } {
    const dirs = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
    
    for (const dir of dirs) {
      const next = this.getNextPos(head, dir);
      if (this.isValidMove(next, occupied)) {
        return { direction: dir, strategy: 'safe', confidence: 0.5 };
      }
    }
    
    return { direction: Direction.RIGHT, strategy: 'dead', confidence: 0 };
  }

  public reset(): void {}
  public updateDirection(_d: Direction): void {}
  public checkDeadLoop(_s: number, _st: number, _b: Coordinate[]): boolean { return false; }
  public logGameEnd(_score: number, _steps: number, _reason: string): void {}
}

export function logGameEnd(_score: number, _steps: number, _reason: string): void {}
