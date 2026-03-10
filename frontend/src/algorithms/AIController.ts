import { Coordinate, Direction } from '../types';
import { Snake } from '../models/Snake';
import { Food } from '../models/Food';

export class AIController {
  private mapWidth: number;
  private mapHeight: number;
  private apiUrl: string = 'http://localhost:8087/api/move';
  private lastRequestTime: number = 0;
  private cachedDirection: Direction = { x: 0, y: -1 };
  private requestCount: number = 0;
  private lastMoveTime: number = 0;

  constructor(width: number, height: number) {
    this.mapWidth = width;
    this.mapHeight = height;
    this.lastMoveTime = Date.now();
  }

  async getNextDirection(
    snake: Snake,
    food: Food,
    obstacles: Set<string>
  ): Promise<Direction> {
    const now = Date.now();
    
    // Rate limiting - only call API every 100ms max
    if (now - this.lastRequestTime < 100) {
      return this.cachedDirection;
    }
    
    try {
      const snakeBody = snake.body.map(p => ({ x: p.x, y: p.y }));
      const foodPos = food.getPosition();
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snake: snakeBody,
          food: { x: foodPos.x, y: foodPos.y },
          width: this.mapWidth,
          height: this.mapHeight,
          step: this.requestCount++
        })
      });
      
      if (!response.ok) {
        console.error('API error:', response.status);
        return this.getFallbackDirection(snake, food);
      }
      
      const data = await response.json();
      this.lastRequestTime = now;
      
      if (data.direction) {
        this.cachedDirection = {
          x: data.direction.x,
          y: data.direction.y
        };
      }
      
      return this.cachedDirection;
    } catch (error) {
      console.error('API request failed:', error);
      return this.getFallbackDirection(snake, food);
    }
  }

  private getFallbackDirection(snake: Snake, food: Food): Direction {
    const head = snake.getHead();
    const foodPos = food.getPosition();
    
    // Simple greedy approach as fallback
    const dx = foodPos.x - head.x;
    const dy = foodPos.y - head.y;
    
    const currentDir = snake.direction;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0 && currentDir.x !== -1) return { x: 1, y: 0 };
      if (dx < 0 && currentDir.x !== 1) return { x: -1, y: 0 };
    }
    
    if (dy > 0 && currentDir.y !== -1) return { x: 0, y: 1 };
    if (dy < 0 && currentDir.y !== 1) return { x: 0, y: -1 };
    
    return currentDir;
  }
}

export function logGameEnd(score: number, steps: number, reason: string): void {
  console.log(`Game Over! Score: ${score}, Steps: ${steps}, Reason: ${reason}`);
}
