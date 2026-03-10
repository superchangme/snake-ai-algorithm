import { Coordinate, Direction } from '../types';

/**
 * Claude版本AI控制器 - 最终优化版
 * 带有严格空间检查的贪心算法
 */
export class AIControllerClaude {
  private mapWidth: number;
  private mapHeight: number;
  private stepCount: number = 0;

  constructor(mapWidth: number, mapHeight: number, _direction: Direction) {
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
  }

  public getDecision(
    snakeHead: Coordinate,
    snakeBody: Coordinate[],
    foodPosition: Coordinate
  ): { direction: Direction; strategy: string; confidence: number } {
    this.stepCount++;
    const bodySet = new Set(snakeBody.map(p => `${p.x},${p.y}`));
    const snakeLength = snakeBody.length;
    const mapSize = this.mapWidth * this.mapHeight;
    const utilization = snakeLength / mapSize;

    const validMoves = this.getValidMoves(snakeHead, bodySet);
    if (validMoves.length === 0) {
      return { direction: Direction.RIGHT, strategy: 'dead', confidence: 0 };
    }

    const evaluatedMoves = validMoves.map(move => {
      const newBody = [move.pos, ...snakeBody.slice(0, -1)];
      const newBodySet = new Set(newBody.map(p => `${p.x},${p.y}`));
      const willEat = move.pos.x === foodPosition.x && move.pos.y === foodPosition.y;

      let score = 0;

      // 1. 吃食物加分
      if (willEat) {
        score += 150;
      }

      // 2. 到食物距离
      if (!willEat) {
        const dist = Math.abs(move.pos.x - foodPosition.x) + Math.abs(move.pos.y - foodPosition.y);
        score += (25 - dist) * 3;
      }

      // 3. 蛇长时更注重尾巴
      if (utilization > 0.3) {
        const tail = snakeBody[snakeBody.length - 1];
        const distTail = Math.abs(move.pos.x - tail.x) + Math.abs(move.pos.y - tail.y);
        score += (35 - distTail) * 4;
      }

      // 4. 自由空间
      const freeSpace = this.countFreeSpace(move.pos, newBodySet);
      score += freeSpace * 2;

      // 5. 避开死角
      const nextMoves = this.getValidMoves(move.pos, newBodySet);
      if (nextMoves.length === 1 && snakeLength > 8) {
        score -= 100;
      }
      if (nextMoves.length === 0) {
        score -= 500;
      }

      // 6. 连通性
      if (!this.isBodyConnected(newBody)) {
        score -= 300;
      }

      // 7. 避免包围食物
      if (!willEat && this.isFoodSurrounded(foodPosition, bodySet)) {
        score -= 50;
      }

      return { move, score, willEat };
    });

    evaluatedMoves.sort((a, b) => b.score - a.score);

    for (const evaluated of evaluatedMoves) {
      if (evaluated.score > -150) {
        return { direction: evaluated.move.dir, strategy: evaluated.willEat ? 'eat' : 'move', confidence: 0.9 };
      }
    }

    const bestSpaceMove = this.findMaxSpaceMove(snakeHead, bodySet, snakeBody);
    if (bestSpaceMove) return bestSpaceMove;

    return { direction: validMoves[0].dir, strategy: 'any', confidence: 0.2 };
  }

  private getValidMoves(head: Coordinate, bodySet: Set<string>): { dir: Direction; pos: Coordinate }[] {
    const dirs = [
      { dir: Direction.UP, dx: 0, dy: -1 },
      { dir: Direction.DOWN, dx: 0, dy: 1 },
      { dir: Direction.LEFT, dx: -1, dy: 0 },
      { dir: Direction.RIGHT, dx: 1, dy: 0 },
    ];

    const moves = [];
    for (const d of dirs) {
      const nx = head.x + d.dx;
      const ny = head.y + d.dy;
      if (nx >= 0 && nx < this.mapWidth && ny >= 0 && ny < this.mapHeight &&
          !bodySet.has(`${nx},${ny}`)) {
        moves.push({ dir: d.dir, pos: { x: nx, y: ny } });
      }
    }
    return moves;
  }

  private isBodyConnected(body: Coordinate[]): boolean {
    if (body.length <= 1) return true;
    const head = body[0];
    const bodySet = new Set(body.map(p => `${p.x},${p.y}`));
    const queue = [head];
    const visited = new Set<string>();
    visited.add(`${head.x},${head.y}`);
    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const [dx, dy] of dirs) {
        const nx = current.x + dx;
        const ny = current.y + dy;
        const key = `${nx},${ny}`;
        if (bodySet.has(key) && !visited.has(key)) {
          visited.add(key);
          queue.push({ x: nx, y: ny });
        }
      }
    }
    return visited.size === body.length;
  }

  private countFreeSpace(start: Coordinate, bodySet: Set<string>): number {
    const queue = [start];
    const visited = new Set<string>();
    visited.add(`${start.x},${start.y}`);
    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    let count = 0;

    while (queue.length > 0) {
      const current = queue.shift()!;
      count++;
      for (const [dx, dy] of dirs) {
        const nx = current.x + dx;
        const ny = current.y + dy;
        const key = `${nx},${ny}`;
        if (nx >= 0 && nx < this.mapWidth && ny >= 0 && ny < this.mapHeight &&
            !bodySet.has(key) && !visited.has(key)) {
          visited.add(key);
          queue.push({ x: nx, y: ny });
        }
      }
    }
    return count;
  }

  private isFoodSurrounded(food: Coordinate, bodySet: Set<string>): boolean {
    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    let surrounded = 0;
    for (const [dx, dy] of dirs) {
      const nx = food.x + dx;
      const ny = food.y + dy;
      if (nx < 0 || nx >= this.mapWidth || ny < 0 || ny >= this.mapHeight ||
          bodySet.has(`${nx},${ny}`)) {
        surrounded++;
      }
    }
    return surrounded >= 3;
  }

  private findMaxSpaceMove(
    head: Coordinate,
    bodySet: Set<string>,
    body: Coordinate[]
  ): { direction: Direction; strategy: string; confidence: number } | null {
    const validMoves = this.getValidMoves(head, bodySet);
    if (validMoves.length === 0) return null;

    let bestMove = null;
    let maxSpace = -1;

    for (const move of validMoves) {
      const newBody = [move.pos, ...body.slice(0, -1)];
      const newBodySet = new Set(newBody.map(p => `${p.x},${p.y}`));
      const space = this.countFreeSpace(move.pos, newBodySet);
      const nextMoves = this.getValidMoves(move.pos, newBodySet);

      let adjustedSpace = space;
      if (nextMoves.length <= 1) adjustedSpace -= 50;

      if (adjustedSpace > maxSpace) {
        maxSpace = adjustedSpace;
        bestMove = { move, space };
      }
    }

    if (bestMove) {
      return { direction: bestMove.move.dir, strategy: 'space', confidence: 0.5 };
    }
    return null;
  }

  public reset(): void { this.stepCount = 0; }
  public updateDirection(_d: Direction): void {}
  public checkDeadLoop(_s: number, _st: number, _b: Coordinate[]): boolean { return false; }
  public logGameEnd(_score: number, _steps: number, _reason: string): void {}
}

export function logGameEnd(_score: number, _steps: number, _reason: string): void {}
