import { Coordinate, Direction } from '../types';
import { Snake } from '../models/Snake';
import { Food } from '../models/Food';

export class AIController {
  private mapWidth: number;
  private mapHeight: number;
  private apiUrl: string = 'http://localhost:8087';
  private lastRequestTime: number = 0;
  private cachedDirection: Direction = { x: 0, y: 1 }; // 默认向下
  private requestCount: number = 0;
  private gameId: string = '';

  constructor(width: number, height: number) {
    this.mapWidth = width;
    this.mapHeight = height;
  }

  // 初始化 - 调用后端 /init 获取 game_id
  async init(snake: Snake): Promise<void> {
    try {
      const snakeBody = snake.body.map(p => ({ x: p.x, y: p.y }));
      const head = snakeBody[0];
      const body = snakeBody.slice(1);
      
      const response = await fetch(this.apiUrl + '/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          size: this.mapWidth,
          headX: head.x,
          headY: head.y,
          body: body
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        this.gameId = data.game_id || '';
        console.log('[AI] Initialized with game_id:', this.gameId);
      }
    } catch (e) {
      console.error('AI init failed:', e);
    }
  }

  async getNextDirection(
    snake: Snake,
    food: Food,
    obstacles: Set<string>
  ): Promise<Direction> {
    // Always call API for fresh direction
    try {
      const snakeBody = snake.body.map(p => ({ x: p.x, y: p.y }));
      const foodPos = food.getPosition();
      
      // 转换参数格式以匹配后端期望
      const head = snakeBody[0];
      const body = snakeBody.slice(1);
      
      const response = await fetch(this.apiUrl + '/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headX: head.x,
          headY: head.y,
          body: body,
          foodX: foodPos.x,
          foodY: foodPos.y,
          size: this.mapWidth
        })
      });
      
      if (!response.ok) {
        console.error('API error:', response.status);
        return this.getFallbackDirection(snake, food);
      }
      
      const data = await response.json();
      // timestamp
      
      if (data.direction) {
        // 后端返回字符串 "UP", "DOWN", "LEFT", "RIGHT"
        const dirMap: Record<string, Direction> = {
          'UP': { x: 0, y: -1 },
          'DOWN': { x: 0, y: 1 },
          'LEFT': { x: -1, y: 0 },
          'RIGHT': { x: 1, y: 0 }
        };
        this.cachedDirection = dirMap[data.direction] || { x: 0, y: 1 };
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

  // 游戏结束通知后端
  async gameOver(score: number, steps: number, reason: string, x: number, y: number): Promise<void> {
    try {
      const response = await fetch(this.apiUrl + '/gameover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: this.gameId,  // 传入 game_id
          score: score,
          steps: steps,
          food_eaten: score,
          death_reason: reason,
          death_x: x,
          death_y: y
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[AI] GameOver recorded:', data);
      } else {
        console.error('GameOver failed:', response.status);
      }
    } catch (e) {
      console.error('gameOver API failed:', e);
    }
  }
}

export function logGameEnd(score: number, steps: number, reason: string): void {
  console.log(`Game Over! Score: ${score}, Steps: ${steps}, Reason: ${reason}`);
}
