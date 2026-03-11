import { Snake } from './Snake';
import { Food } from './Food';
import { Coordinate, Direction, GameStats } from '../types';

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  cellSize: number = 20;
  
  snake: Snake;
  food: Food;
  obstacles: Set<string>;
  
  isRunning: boolean = false;
  isOver: boolean = false;
  isWon: boolean = false;
  
  private score: number = 0;
  private steps: number = 0;
  
  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = width;
    this.height = height;
    
    canvas.width = width * this.cellSize;
    canvas.height = height * this.cellSize;
    
    this.snake = new Snake(Math.floor(width / 2), Math.floor(height / 2));
    this.food = new Food(0, 0);
    this.obstacles = new Set();
    
    this.placeFood();
  }
  
  // 检查下一个位置是否是食物
  private willEatFood(nextX: number, nextY: number): boolean {
    return nextX === this.food.position.x && nextY === this.food.position.y;
  }
  
  private placeFood(): void {
    // 先检查是否已满分（蛇身占满所有格子）
    if (this.snake.body.length >= this.width * this.height) {
      this.isWon = true;
      this.isOver = true;
      this.isRunning = false;
      return;
    }
    
    let x: number, y: number;
    let attempts = 0;
    const maxAttempts = this.width * this.height;
    
    while (attempts < maxAttempts) {
      x = Math.floor(Math.random() * this.width);
      y = Math.floor(Math.random() * this.height);
      
      if (!this.snake.contains({ x, y }) && 
          !Array.from(this.obstacles).some(o => o === `${x},${y}`)) {
        this.food.setPosition(x, y);
        return;
      }
      attempts++;
    }
    
    // 没找到空位，判定为满分
    this.isWon = true;
    this.isOver = true;
    this.isRunning = false;
  }
  
  private getMaxScore(): number {
    return this.width * this.height - 3;
  }
  
  start(): void {
    this.isRunning = true;
    this.isOver = false;
    this.isWon = false;
    this.score = 0;
    this.steps = 0;
  }
  
  update(): void {
    if (!this.isRunning || this.isOver) return;
    
    // 获取下一步位置
    const head = this.snake.getHead();
    const dir = this.snake.nextDirection;
    const nextX = head.x + dir.x;
    const nextY = head.y + dir.y;
    
    // 先检查是否撞墙
    if (nextX < 0 || nextX >= this.width || nextY < 0 || nextY >= this.height) {
      this.isOver = true;
      this.isRunning = false;
      return;
    }
    
    // 检查是否撞自己
    const bodyWithoutTail = this.snake.body.slice(0, -1); // 不包括尾巴
    if (bodyWithoutTail.some(seg => seg.x === nextX && seg.y === nextY)) {
      this.isOver = true;
      this.isRunning = false;
      return;
    }
    
    // 检查下一步是否是食物
    const ateFood = this.willEatFood(nextX, nextY);
    
    if (ateFood) {
      this.snake.grow();
      this.score++;
      
      // 检查是否满分 - 考虑 growPending，蛇移动后会变长
      const effectiveLength = this.snake.body.length + this.snake.growPending;
      if (effectiveLength >= this.width * this.height) {
        this.isWon = true;
        this.isOver = true;
        this.isRunning = false;
        return;
      }

      // 放置新食物
      this.placeFood();
    }
    
    // 最后才移动蛇
    this.snake.move();
    this.steps++;
  }
  
  setDirection(dir: Direction): void {
    this.snake.setDirection(dir);
  }
  
  getSnake(): Snake {
    return this.snake;
  }
  
  getFood(): Food {
    return this.food;
  }
  
  getObstacles(): Set<string> {
    return this.obstacles;
  }
  
  getStats(): GameStats {
    const maxScore = this.getMaxScore();
    return {
      score: this.score,
      steps: this.steps,
      maxScore
    };
  }
  
  getGridSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }
}
