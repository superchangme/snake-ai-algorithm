import { Snake } from './Snake';
import { Food } from './Food';
import { Coordinate, Direction, GameStats } from '../types';

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  cellSize: number = 30;
  
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
    
    this.snake = new Snake(3, 2);
    this.food = new Food(0, 0);
    this.obstacles = new Set();
    
    this.placeFood();
  }
  
  // 检查下一个位置是否是食物
  private willEatFood(nextX: number, nextY: number): boolean {
    return nextX === this.food.position.x && nextY === this.food.position.y;
  }
  
  private placeFood(): void {
    // 先检查是否已满分（蛇身占满所有格子，考虑 growPending）
    const effectiveLength = this.snake.body.length + this.snake.growPending;
    const totalCells = this.width * this.height;
    
    if (effectiveLength >= totalCells) {
      this.isWon = true;
      this.isOver = true;
      this.isRunning = false;
      return;
    }
    
    // 直接遍历找空位，而不是随机
    const emptyCells: Array<{x: number, y: number}> = [];
    
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        if (!this.snake.contains({ x, y }) && 
            !Array.from(this.obstacles).some(o => o === `${x},${y}`)) {
          emptyCells.push({ x, y });
        }
      }
    }
    
    // 如果没有空位，判定满分
    if (emptyCells.length === 0) {
      this.isWon = true;
      this.isOver = true;
      this.isRunning = false;
      return;
    }
    
    // 从空位中随机选择一个
    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    const { x, y } = emptyCells[randomIndex];
    this.food.setPosition(x, y);
  }
  
  private getMaxScore(): number {
    return this.width * this.height - 3;
  }
  
  start(): void {
    console.log("Game start - snake position:", JSON.stringify(this.snake.body));
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
    const dirInfo = 'dir=' + JSON.stringify(dir) + ' nextDir=' + JSON.stringify(this.snake.nextDirection);
    console.log('Check - head:', nextX, nextY, 'body:', JSON.stringify(this.snake.body), dirInfo);
    if (nextX < 0 || nextX >= this.width || nextY < 0 || nextY >= this.height) {
      console.log('Hit wall!');
      this.isOver = true;
      this.isRunning = false;
      return;
    }
    
    // 检查是否撞自己
    const bodyWithoutTail = this.snake.body.slice(0, -1);
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
    }
    
    // 先移动蛇（即使吃到食物也要移动）
    this.snake.move();
    this.steps++;
    
    // 移动后再检查是否满分
    const effectiveLength = this.snake.body.length + this.snake.growPending;
    if (effectiveLength >= this.width * this.height) {
      this.isWon = true;
      this.isOver = true;
      this.isRunning = false;
      return;
    }
    
    // 只有未满分时才放置新食物
    if (ateFood) {
      this.placeFood();
    }
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
