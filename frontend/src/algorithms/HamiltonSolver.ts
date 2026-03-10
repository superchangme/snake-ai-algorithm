import { Coordinate, Direction } from '../types';

/**
 * HamiltonSolver - 简化版Hamiltonian Cycle贪食蛇AI
 * 使用预定义的zigzag模式
 */

export class HamiltonSolver {
  private mapWidth: number;
  private mapHeight: number;
  private cycle: Coordinate[] = [];
  private cycleIndex: Map<string, number> = new Map();

  constructor(mapWidth: number, mapHeight: number, _direction: Direction) {
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.buildZigzagCycle();
  }

  private buildZigzagCycle(): void {
    const visited = new Set<string>();
    let x = 0, y = 0;
    let goingRight = true;
    
    while (visited.size < this.mapWidth * this.mapHeight) {
      const key = `${x},${y}`;
      if (visited.has(key)) break;
      
      visited.add(key);
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

  private getNextPos(pos: Coordinate, dir: Direction): Coordinate {
    switch (dir) {
      case Direction.UP: return { x: pos.x, y: pos.y - 1 };
      case Direction.DOWN: return { x: pos.x, y: pos.y + 1 };
      case Direction.LEFT: return { x: pos.x - 1, y: pos.y };
      case Direction.RIGHT: return { x: pos.x + 1, y: pos.y };
    }
  }

  public getDecision(
    snakeHead: Coordinate,
    snakeBody: Coordinate[],
    foodPosition: Coordinate
  ): { direction: Direction; strategy: string; confidence: number } {
    
    const occupied = new Set(snakeBody.map(p => `${p.x},${p.y}`));
    const headKey = `${snakeHead.x},${snakeHead.y}`;
    const currentIdx = this.cycleIndex.get(headKey) ?? -1;
    
    if (snakeBody.length < this.mapWidth * this.mapHeight * 0.4) {
      const shortcutDir = this.tryShortcut(snakeHead, occupied, foodPosition);
      if (shortcutDir) {
        return { direction: shortcutDir, strategy: 'shortcut', confidence: 1.0 };
      }
    }
    
    if (currentIdx >= 0) {
      const nextIdx = (currentIdx + 1) % this.cycle.length;
      const nextPos = this.cycle[nextIdx];
      
      if (nextPos && !occupied.has(`${nextPos.x},${nextPos.y}`)) {
        const dx = nextPos.x - snakeHead.x;
        const dy = nextPos.y - snakeHead.y;
        
        if (dy < 0) return { direction: Direction.UP, strategy: 'hc', confidence: 0.9 };
        if (dy > 0) return { direction: Direction.DOWN, strategy: 'hc', confidence: 0.9 };
        if (dx < 0) return { direction: Direction.LEFT, strategy: 'hc', confidence: 0.9 };
        if (dx > 0) return { direction: Direction.RIGHT, strategy: 'hc', confidence: 0.9 };
      }
    }
    
    return this.bfsDirection(snakeHead, occupied, foodPosition);
  }

  private tryShortcut(head: Coordinate, occupied: Set<string>, food: Coordinate): Direction | null {
    const queue: Coordinate[] = [head];
    const visited = new Set<string>([`${head.x},${head.y}`]);
    const parent = new Map<string, Coordinate>();
    
    while (queue.length > 0) {
      const cur = queue.shift()!;
      
      if (cur.x === food.x && cur.y === food.y) {
        let node: Coordinate | undefined = cur;
        while (parent.has(`${node.x},${node.y}`)) {
          const p = parent.get(`${node.x},${node.y}`)!;
          if (p.x === head.x && p.y === head.y) break;
          node = p;
        }
        if (!node) return null;
        
        const dx = node.x - head.x;
        const dy = node.y - head.y;
        if (dy < 0) return Direction.UP;
        if (dy > 0) return Direction.DOWN;
        if (dx < 0) return Direction.LEFT;
        if (dx > 0) return Direction.RIGHT;
      }
      
      const neighbors = [
        { x: cur.x, y: cur.y - 1 },
        { x: cur.x, y: cur.y + 1 },
        { x: cur.x - 1, y: cur.y },
        { x: cur.x + 1, y: cur.y }
      ];
      
      for (const n of neighbors) {
        const key = `${n.x},${n.y}`;
        if (n.x >= 0 && n.x < this.mapWidth && 
            n.y >= 0 && n.y < this.mapHeight &&
            !occupied.has(key) && !visited.has(key)) {
          visited.add(key);
          parent.set(key, cur);
          queue.push(n);
        }
      }
    }
    
    return null;
  }

  private bfsDirection(head: Coordinate, occupied: Set<string>, food: Coordinate): { direction: Direction; strategy: string; confidence: number } {
    const queue: Coordinate[] = [head];
    const visited = new Set<string>([`${head.x},${head.y}`]);
    const parent = new Map<string, Coordinate>();
    
    while (queue.length > 0) {
      const cur = queue.shift()!;
      
      if (cur.x === food.x && cur.y === food.y) {
        let node: Coordinate | undefined = cur;
        while (parent.has(`${node.x},${node.y}`)) {
          const p = parent.get(`${node.x},${node.y}`)!;
          if (p.x === head.x && p.y === head.y) break;
          node = p;
        }
        if (!node) return this.getAnySafeDirection(head, occupied);
        
        const dx = node.x - head.x;
        const dy = node.y - head.y;
        if (dy < 0) return { direction: Direction.UP, strategy: 'bfs', confidence: 0.8 };
        if (dy > 0) return { direction: Direction.DOWN, strategy: 'bfs', confidence: 0.8 };
        if (dx < 0) return { direction: Direction.LEFT, strategy: 'bfs', confidence: 0.8 };
        if (dx > 0) return { direction: Direction.RIGHT, strategy: 'bfs', confidence: 0.8 };
      }
      
      const neighbors = [
        { x: cur.x, y: cur.y - 1 },
        { x: cur.x, y: cur.y + 1 },
        { x: cur.x - 1, y: cur.y },
        { x: cur.x + 1, y: cur.y }
      ];
      
      for (const n of neighbors) {
        const key = `${n.x},${n.y}`;
        if (n.x >= 0 && n.x < this.mapWidth && 
            n.y >= 0 && n.y < this.mapHeight &&
            !occupied.has(key) && !visited.has(key)) {
          visited.add(key);
          parent.set(key, cur);
          queue.push(n);
        }
      }
    }
    
    return this.getAnySafeDirection(head, occupied);
  }

  private getAnySafeDirection(head: Coordinate, occupied: Set<string>): { direction: Direction; strategy: string; confidence: number } {
    const dirs = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
    
    for (const dir of dirs) {
      const next = this.getNextPos(head, dir);
      const key = `${next.x},${next.y}`;
      if (next.x >= 0 && next.x < this.mapWidth && 
          next.y >= 0 && next.y < this.mapHeight &&
          !occupied.has(key)) {
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
