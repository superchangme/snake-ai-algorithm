import { Coordinate, Direction } from '../types';
import { Snake } from '../models/Snake';
import { Food } from '../models/Food';

export type ConnectionMode = 'http' | 'ws';

export class AIController {
  private mapWidth: number;
  private mapHeight: number;
  private apiUrl: string = '';
  private wsUrl: string = '';
  private mode: ConnectionMode = 'http';
  private ws: WebSocket | null = null;
  private wsConnected: boolean = false;
  private wsQueue: Array<() => Promise<void>> = [];
  private lastRequestTime: number = 0;
  private cachedDirection: Direction = { x: 0, y: 1 };
  private requestCount: number = 0;
  private gameId: string = '';

  constructor(width: number, height: number) {
    this.mapWidth = width;
    this.mapHeight = height;
    
    // 从 URL 参数读取模式
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get('mode');
    if (modeParam === 'ws') {
      this.mode = 'ws';
    }
    
    // 确定 URL
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      this.apiUrl = 'http://localhost:8080';
      this.wsUrl = 'ws://localhost:8081';
    } else {
      // 生产环境 - 使用当前域名
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const port = window.location.port ? ':8081' : '';
      this.wsUrl = `${protocol}//${window.location.hostname}${port}`;
    }
  }

  setMode(mode: ConnectionMode): void {
    this.mode = mode;
    console.log('[AI] Connection mode:', mode);
  }

  getMode(): ConnectionMode {
    return this.mode;
  }

  private async initWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsUrl);
        
        this.ws.onopen = () => {
          console.log('[AI] WebSocket connected');
          this.wsConnected = true;
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          console.log('[AI] WS message:', event.data);
        };
        
        this.ws.onerror = (error) => {
          console.error('[AI] WebSocket error:', error);
          reject(error);
        };
        
        this.ws.onclose = () => {
          console.log('[AI] WebSocket closed');
          this.wsConnected = false;
          this.ws = null;
        };
        
        // 超时
        setTimeout(() => reject(new Error('WS connection timeout')), 5000);
      } catch (e) {
        reject(e);
      }
    });
  }

  private async wsSend(data: any): Promise<any> {
    if (!this.ws || !this.wsConnected) {
      await this.initWebSocket();
    }
    
    return new Promise((resolve, reject) => {
      if (!this.ws) {
        reject(new Error('WebSocket not connected'));
        return;
      }
      
      const messageHandler = (event: MessageEvent) => {
        this.ws?.removeEventListener('message', messageHandler);
        try {
          resolve(JSON.parse(event.data));
        } catch (e) {
          reject(e);
        }
      };
      
      this.ws.addEventListener('message', messageHandler);
      this.ws.send(JSON.stringify(data));
      
      // 超时
      setTimeout(() => {
        this.ws?.removeEventListener('message', messageHandler);
        reject(new Error('WS request timeout'));
      }, 5000);
    });
  }

  async init(snake: Snake): Promise<void> {
    const snakeBody = snake.body.map(p => ({ x: p.x, y: p.y }));
    const head = snakeBody[0];
    const body = snakeBody.slice(1);
    
    try {
      if (this.mode === 'ws') {
        // WebSocket 模式
        const data = await this.wsSend({
          action: 'init',
          size: this.mapWidth,
          headX: head.x,
          headY: head.y,
          body: body
        });
        this.gameId = data.game_id || '';
        console.log('[AI] Initialized (WS) with game_id:', this.gameId);
      } else {
        // HTTP 模式
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
          console.log('[AI] Initialized (HTTP) with game_id:', this.gameId);
        }
      }
    } catch (e) {
      console.error('[AI] Init error:', e);
    }
  }

  async getNextDirection(
    snake: Snake,
    food: Food
  ): Promise<Direction> {
    const head = snake.getHead();
    const snakeBody = snake.body.map(p => ({ x: p.x, y: p.y }));
    const body = snakeBody.slice(1);
    const foodPos = food.getPosition();
    
    try {
      if (this.mode === 'ws') {
        // WebSocket 模式
        const data = await this.wsSend({
          action: 'move',
          size: this.mapWidth,
          headX: head.x,
          headY: head.y,
          body: body,
          foodX: foodPos.x,
          foodY: foodPos.y
        });
        
        const dirMap: Record<string, Direction> = {
          'UP': { x: 0, y: -1 },
          'DOWN': { x: 0, y: 1 },
          'LEFT': { x: -1, y: 0 },
          'RIGHT': { x: 1, y: 0 }
        };
        
        return dirMap[data.direction] || this.cachedDirection;
      } else {
        // HTTP 模式
        const response = await fetch(this.apiUrl + '/move', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            size: this.mapWidth,
            headX: head.x,
            headY: head.y,
            body: body,
            foodX: foodPos.x,
            foodY: foodPos.y
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          const dirMap: Record<string, Direction> = {
            'UP': { x: 0, y: -1 },
            'DOWN': { x: 0, y: 1 },
            'LEFT': { x: -1, y: 0 },
            'RIGHT': { x: 1, y: 0 }
          };
          
          return dirMap[data.direction] || this.cachedDirection;
        }
      }
    } catch (e) {
      console.error('[AI] getNextDirection error:', e);
    }
    
    return this.cachedDirection;
  }

  getStats(): { requestCount: number; mode: ConnectionMode } {
    return {
      requestCount: this.requestCount,
      mode: this.mode
    };
  }
}
