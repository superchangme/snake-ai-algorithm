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
  
  private placeFood(): void {
    let x: number, y: number;
    do {
      x = Math.floor(Math.random() * this.width);
      y = Math.floor(Math.random() * this.height);
    } while (
      this.snake.contains({ x, y }) ||
      Array.from(this.obstacles).some(o => o === `${x},${y}`)
    );
    this.food.setPosition(x, y);
  }
  
  start(): void {
    this.isRunning = true;
    this.isOver = false;
    this.score = 0;
    this.steps = 0;
  }
  
  update(): void {
    if (!this.isRunning || this.isOver) return;
    
    this.snake.move();
    this.steps++;
    
    const head = this.snake.getHead();
    
    // Check wall collision
    if (head.x < 0 || head.x >= this.width || head.y < 0 || head.y >= this.height) {
      this.isOver = true;
      this.isRunning = false;
      return;
    }
    
    // Check self collision
    const bodyWithoutHead = this.snake.body.slice(1);
    if (bodyWithoutHead.some(seg => seg.x === head.x && seg.y === head.y)) {
      this.isOver = true;
      this.isRunning = false;
      return;
    }
    
    // Check food
    if (head.x === this.food.position.x && head.y === this.food.position.y) {
      this.snake.grow();
      this.score++;
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
    const maxScore = this.width * this.height - this.snake.body.length;
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
