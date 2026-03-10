import { Coordinate, Direction } from '../types';

export class Snake {
  body: Coordinate[];
  direction: Direction;
  nextDirection: Direction;
  growPending: number = 0;

  constructor(startX: number, startY: number, length: number = 3) {
    this.body = [];
    for (let i = 0; i < length; i++) {
      this.body.push({ x: startX, y: startY + i });
    }
    this.direction = { x: 0, y: -1 };
    this.nextDirection = { x: 0, y: -1 };
  }

  getHead(): Coordinate {
    return this.body[0];
  }

  getTail(): Coordinate {
    return this.body[this.body.length - 1];
  }

  setDirection(dir: Direction): void {
    if (dir.x !== -this.direction.x || dir.y !== -this.direction.y) {
      this.nextDirection = dir;
    }
  }

  move(): Coordinate {
    this.direction = { ...this.nextDirection };
    const head = this.getHead();
    const newHead = {
      x: head.x + this.direction.x,
      y: head.y + this.direction.y
    };
    
    this.body.unshift(newHead);
    
    if (this.growPending > 0) {
      this.growPending--;
    } else {
      this.body.pop();
    }
    
    return newHead;
  }

  grow(amount: number = 1): void {
    this.growPending += amount;
  }

  contains(pos: Coordinate): boolean {
    return this.body.some(seg => seg.x === pos.x && seg.y === pos.y);
  }

  copy(): Snake {
    const newSnake = new Snake(0, 0, 0);
    newSnake.body = this.body.map(b => ({ ...b }));
    newSnake.direction = { ...this.direction };
    newSnake.nextDirection = { ...this.nextDirection };
    newSnake.growPending = this.growPending;
    return newSnake;
  }
}
