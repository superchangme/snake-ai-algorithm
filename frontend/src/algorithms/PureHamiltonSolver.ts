import { Coordinate, Direction } from '../types';

/**
 * 纯 Hamiltonian Cycle PureHamiltonSolver - 贪食蛇 AI
 * 从蛇当前位置开始构建路径
 */
export class PureHamiltonSolver {
  private mapWidth: number;
  private mapHeight: number;
  private cycle: Coordinate[] = [];
  private cycleIndex: Map<string, number> = new Map();

  constructor(mapWidth: number, mapHeight: number, _direction: Direction) {
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
  }

  private buildCycleFrom(startPos: Coordinate): void {
    // Build a simple zigzag Hamiltonian cycle starting from given position
    this.cycle = [];
    this.cycleIndex = new Map();
    
    const visited = new Set<string>();
    let x = startPos.x, y = startPos.y;
    let goingRight = true;
    
    // First add the start position
    visited.add(`${x},${y}`);
    this.cycle.push({ x, y });
    this.cycleIndex.set(`${x},${y}`, 0);
    
    // Zigzag through the grid
    while (visited.size < this.mapWidth * this.mapHeight) {
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
      
      const key = `${x},${y}`;
      if (!visited.has(key)) {
        visited.add(key);
        this.cycle.push({ x, y });
        this.cycleIndex.set(key, this.cycle.length - 1);
      }
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
    
    // Rebuild cycle from current head position if needed
    const headKey = `${snakeHead.x},${snakeHead.y}`;
    if (!this.cycleIndex.has(headKey)) {
      this.buildCycleFrom(snakeHead);
    }
    
    // Find current position in cycle
    const currentIdx = this.cycleIndex.get(headKey) ?? 0;
    
    // Look for next unoccupied position in cycle
    for (let offset = 1; offset < this.cycle.length; offset++) {
      const nextIdx = (currentIdx + offset) % this.cycle.length;
      const nextPos = this.cycle[nextIdx];
      
      if (!occupied.has(`${nextPos.x},${nextPos.y}`)) {
        const dx = nextPos.x - snakeHead.x;
        const dy = nextPos.y - snakeHead.y;
        
        if (dy < 0) return { direction: Direction.UP, strategy: 'hc', confidence: 1.0 };
        if (dy > 0) return { direction: Direction.DOWN, strategy: 'hc', confidence: 1.0 };
        if (dx < 0) return { direction: Direction.LEFT, strategy: 'hc', confidence: 1.0 };
        if (dx > 0) return { direction: Direction.RIGHT, strategy: 'hc', confidence: 1.0 };
      }
    }
    
    // Fallback: find any safe direction
    return this.getAnySafeDirection(snakeHead, occupied);
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

  public reset(): void {
    this.cycle = [];
    this.cycleIndex = new Map();
  }
  
  public updateDirection(_d: Direction): void {}
  public checkDeadLoop(_s: number, _st: number, _b: Coordinate[]): boolean { return false; }
  public logGameEnd(_score: number, _steps: number, _reason: string): void {}
}

export function logGameEnd(_score: number, _steps: number, _reason: string): void {}
