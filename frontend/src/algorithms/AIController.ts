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
  private wsInitialized: boolean = false;  // init 完成后才标记
  private wsQueue: Array<() => Promise<void>> = [];
  private lastRequestTime: number = 0;
  private cachedDirection: Direction = { x: 0, y: 1 };
  private pendingResolve: ((dir: Direction) => void) | null = null;
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
    // 开发环境：HTTP 走 Vite 代理（相对路径），WS 用 hostname:port 构建
    // 生产环境：用当前 origin
    const isDev = window.location.port === '3000';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    if (isDev) {
      // 开发环境：HTTP 走代理（相对路径），WS 用 hostname:port
      this.apiUrl = '';  // 空字符串 = 相对路径
      this.wsUrl = `ws://localhost:8080/ws`;
    } else {
      // 生产环境：同源
      this.apiUrl = window.location.origin;
      this.wsUrl = `${protocol}//${window.location.host}/ws`;
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
        // 关闭已有连接
        if (this.ws) {
          this.ws.close();
          this.ws = null;
        }
        console.log('[AI] Connecting to WS:', this.wsUrl);
        this.ws = new WebSocket(this.wsUrl);
        
        this.ws.onopen = () => {
          console.log('[AI] WebSocket connected');
          this.wsConnected = true;

          // 发送初始化消息
          this.sendWsMessage({
            type: 'init',
            width: this.mapWidth,
            height: this.mapHeight,
            game_id: this.gameId
          });
        };
        
        this.ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          console.log('[AI] WS message:', JSON.stringify(data));
          
          if (data.status === 'initialized') {
            this.wsInitialized = true;
            this.gameId = data.game_id;
            console.log('[AI] Initialized (WS) with game_id:', this.gameId);
            this.updateAiStatus('已连接');
            // 等到收到 initialized 后才 resolve
            this.processWsQueue();
            resolve();
          } else if (data.direction) {
            const direction = this.parseDirection(data.direction);
            this.cachedDirection = direction;
            // 如果有等待中的 Promise，调用它继续游戏循环
            if (this.pendingResolve) {
              this.pendingResolve(direction);
              this.pendingResolve = null;
            }
            this.updateAiStatus('运行中');
          }
        };
        
        this.ws.onerror = (error) => {
          console.error('[AI] WebSocket error:', error);
          this.updateAiStatus('连接错误');
          reject(error);
        };
        
        this.ws.onclose = () => {
          console.log('[AI] WebSocket closed');
          this.wsConnected = false;
      this.wsInitialized = false;
          this.updateAiStatus('已断开');
        };
        
        // 超时处理
        setTimeout(() => {
          if (!this.wsConnected) {
            reject(new Error('WebSocket connection timeout'));
          }
        }, 15000);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  private async initHttp(): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/api`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      console.log('[AI] HTTP API initialized:', data);
      this.updateAiStatus('HTTP 已连接');
    } catch (error) {
      console.error('[AI] HTTP init error:', error);
      this.updateAiStatus('HTTP 错误');
    }
  }

  async init(): Promise<void> {
    if (this.mode === 'ws') {
      await this.initWebSocket();
    } else {
      await this.initHttp();
    }
  }

  async getNextDirection(
    snake: Snake,
    food: Food,
    width: number,
    height: number
  ): Promise<Direction> {
    if (this.mode === 'ws') {
      return this.getNextDirectionWs(snake, food, width, height);
    } else {
      return this.getNextDirectionHttp(snake, food, width, height);
    }
  }

  private async getNextDirectionWs(
    snake: Snake,
    food: Food,
    width: number,
    height: number
  ): Promise<Direction> {
    // 确保 WS 已连接（等待连接完成）
    // 必须等 WS 初始化完成才能发 move
    if (!this.wsInitialized || !this.ws || !this.wsConnected) {
      console.log('[AI] WS not connected, waiting for connection...');
      try {
        await this.initWebSocket();
      } catch (e) {
        console.error('[AI] WS connection failed:', e);
        // 不再返回缓存方向，返回默认向上
        return { x: 0, y: -1 };
      }
    }

    return new Promise((resolve) => {
      const messageHandler = (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        if (data.direction) {
          const direction = this.parseDirection(data.direction);
          this.ws?.removeEventListener('message', messageHandler);
          resolve(direction);
        }
      };

      this.ws?.addEventListener('message', messageHandler);

      this.sendWsMessage({
        type: 'move',
        snake: snake.body.map(p => ({ x: p.x, y: p.y })),
        food: { x: food.position.x, y: food.position.y },
        width,
        height,
        game_id: this.gameId
      });

      // 超时返回缓存方向
      setTimeout(() => {
        this.ws?.removeEventListener('message', messageHandler);
        resolve(this.cachedDirection);
      }, 100);
    });
  }

  private async getNextDirectionHttp(
    snake: Snake,
    food: Food,
    width: number,
    height: number
  ): Promise<Direction> {

    try {
      const response = await fetch(`${this.apiUrl}/api`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snake: snake.body.map(p => ({ x: p.x, y: p.y })),
          food: { x: food.position.x, y: food.position.y },
          width,
          height,
          game_id: this.gameId || undefined
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.game_id) {
        this.gameId = data.game_id;
        this.updateAiStatus('运行中');
      }

      return this.parseDirection(data.direction);
    } catch (error) {
      console.error('[AI] HTTP request failed:', error);
      return this.cachedDirection;
    }
  }

  private parseDirection(dir: string | { x: number; y: number }): Direction {
    if (typeof dir === 'object') {
      return dir;
    }
    
    const directionMap: Record<string, Direction> = {
      'UP': { x: 0, y: -1 },
      'DOWN': { x: 0, y: 1 },
      'LEFT': { x: -1, y: 0 },
      'RIGHT': { x: 1, y: 0 }
    };
    
    return directionMap[dir] || { x: 0, y: 1 };
  }

  private sendWsMessage(data: any): void {
    if (this.ws && this.wsConnected) {
      this.ws.send(JSON.stringify(data));
    } else {
      // 队列消息
      this.wsQueue.push(async () => {
        if (this.ws && this.wsConnected) {
          this.ws.send(JSON.stringify(data));
        }
      });
    }
  }

  private async processWsQueue(): Promise<void> {
    while (this.wsQueue.length > 0) {
      const fn = this.wsQueue.shift();
      if (fn) await fn();
    }
  }

  private updateAiStatus(status: string): void {
    const aiStatusEl = document.getElementById('ai-status');
    if (aiStatusEl) {
      aiStatusEl.textContent = status;
    }
  }

  reset(): void {
    this.cachedDirection = { x: 0, y: 1 };
    this.requestCount = 0;
    this.gameId = '';
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.wsConnected = false;
      this.wsInitialized = false;
    }
  }
}
