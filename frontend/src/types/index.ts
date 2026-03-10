/**
 * 游戏坐标类型定义
 */
export interface Coordinate {
  x: number;
  y: number;
}

/**
 * 方向枚举
 */
export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT'
}

/**
 * 游戏状态枚举
 */
export enum GameStatus {
  NOT_STARTED = 'NOT_STARTED',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

/**
 * 游戏模式枚举
 */
export enum GameMode {
  HUMAN = 'HUMAN',
  AI = 'AI'
}

/**
 * 格子类型
 */
export enum CellType {
  EMPTY = 'EMPTY',
  SNAKE_HEAD = 'SNAKE_HEAD',
  SNAKE_BODY = 'SNAKE_BODY',
  FOOD = 'FOOD'
}

/**
 * 蛇的数据结构
 */
export interface SnakeData {
  body: Coordinate[];
  direction: Direction;
  nextDirection: Direction;
}

/**
 * 食物数据结构
 */
export interface FoodData {
  position: Coordinate;
}

/**
 * 游戏配置
 */
export interface GameConfig {
  mapWidth: number;
  mapHeight: number;
  speed: number;
  mode: GameMode;
}

/**
 * 游戏统计信息
 */
export interface GameStats {
  score: number;
  steps: number;
  foodEaten: number;
}

/**
 * AI决策结果
 */
export interface AIDecision {
  direction: Direction;
  confidence: number;
  strategy: string;
}
