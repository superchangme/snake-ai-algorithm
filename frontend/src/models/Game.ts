import { Coordinate, Direction, GameStatus, GameMode, GameConfig, GameStats, CellType } from '../types';
import { Snake } from './Snake';
import { Food } from './Food';

/**
 * 游戏主类 - 协调所有游戏组件和管理游戏状态
 *
 * 核心职责:
 * - 管理游戏循环和帧更新
 * - 处理用户输入和AI决策
 * - 碰撞检测和游戏规则执行
 * - 提供游戏状态查询和统计
 */
export class Game {
  private snake: Snake;
  private food: Food;
  private config: GameConfig;
  private status: GameStatus;
  private stats: GameStats;

  // 游戏循环控制
  private gameLoopId: number | null = null;
  private lastFrameTime: number = 0;
  private frameInterval: number = 150;  // 默认150ms一帧

  // 回调函数
  private onStatusChange?: (status: GameStatus) => void;
  private onStatsUpdate?: (stats: GameStats) => void;
  private onRender?: () => void;
  private onAIDecision?: (decision: string) => void;
  private onBeforeUpdate?: () => void;

  constructor(config: Partial<GameConfig> = {}) {
    // 默认配置
    this.config = {
      mapWidth: config.mapWidth || 10,
      mapHeight: config.mapHeight || 10,
      speed: config.speed || 5,
      mode: config.mode || GameMode.HUMAN
    };

    // 初始化组件
    this.snake = new Snake();
    this.food = new Food();

    // 初始化状态
    this.status = GameStatus.NOT_STARTED;
    this.stats = {
      score: 0,
      steps: 0,
      foodEaten: 0
    };

    // 根据速度设置帧间隔 (1-10 映射到 300ms-50ms)
    this.updateFrameInterval();
  }

  /**
   * 设置回调函数
   */
  public setCallbacks(callbacks: {
    onStatusChange?: (status: GameStatus) => void;
    onStatsUpdate?: (stats: GameStats) => void;
    onRender?: () => void;
    onAIDecision?: (decision: string) => void;
    onBeforeUpdate?: () => void;
  }): void {
    this.onStatusChange = callbacks.onStatusChange;
    this.onStatsUpdate = callbacks.onStatsUpdate;
    this.onRender = callbacks.onRender;
    this.onAIDecision = callbacks.onAIDecision;
    this.onBeforeUpdate = callbacks.onBeforeUpdate;
  }

  /**
   * 获取当前游戏配置
   */
  public getConfig(): GameConfig {
    return { ...this.config };
  }

  /**
   * 获取游戏状态
   */
  public getStatus(): GameStatus {
    return this.status;
  }

  /**
   * 获取游戏统计
   */
  public getStats(): GameStats {
    return { ...this.stats };
  }

  /**
   * 更新地图尺寸
   */
  public setMapSize(width: number, height: number): void {
    if (width < 10 || width > 20 || height < 10 || height > 20) {
      throw new Error('地图尺寸必须在10-20范围内');
    }

    this.config.mapWidth = width;
    this.config.mapHeight = height;

    // 如果游戏在进行中，重置游戏
    if (this.status !== GameStatus.NOT_STARTED) {
      this.reset();
    }
  }

  /**
   * 设置游戏速度
   */
  public setSpeed(speed: number): void {
    if (speed < 1 || speed > 10) {
      throw new Error('速度必须在1-10范围内');
    }

    this.config.speed = speed;
    this.updateFrameInterval();
  }

  /**
   * 设置游戏模式
   */
  public setMode(mode: GameMode): void {
    this.config.mode = mode;
    // 重置蛇的方向，避免从AI模式切换到人类模式时蛇自动转向
    if (mode === GameMode.HUMAN && this.snake) {
      this.snake.resetDirection();
    }
  }

  /**
   * 根据速度更新帧间隔
   * 速度1最慢(300ms)，速度10最快(50ms)
   */
  private updateFrameInterval(): void {
    // 线性映射: speed=1 -> 300ms, speed=10 -> 50ms
    this.frameInterval = 300 - (this.config.speed - 1) * (250 / 9);
  }

  /**
   * 开始游戏
   */
  public start(): void {
    if (this.status === GameStatus.PLAYING) {
      return;
    }

    // 如果是未开始或已结束状态，初始化游戏
    if (this.status === GameStatus.NOT_STARTED || this.status === GameStatus.GAME_OVER || this.status === GameStatus.VICTORY) {
      this.initializeGame();
    }

    // 开始游戏循环
    this.status = GameStatus.PLAYING;
    this.notifyStatusChange();
    this.lastFrameTime = performance.now();
    this.gameLoopId = requestAnimationFrame((time) => this.gameLoop(time));
  }

  /**
   * 结束游戏（用于死循环检测等场景）
   */
  public gameOver(reason: string = '游戏结束'): void {
    console.log(`[游戏结束] ${reason}`);
    this.status = GameStatus.GAME_OVER;
    this.notifyStatusChange();
    this.render();
  }

  /**
   * 初始化游戏
   */
  private initializeGame(): void {
    // 计算蛇的起始位置（地图中心偏左）
    const startX = Math.floor(this.config.mapWidth / 2);
    const startY = Math.floor(this.config.mapHeight / 2);

    // 重置蛇
    this.snake.reset(startX, startY);

    // 重置食物
    this.food.reset();
    this.food.generate(this.config.mapWidth, this.config.mapHeight, this.snake.getAllSegments());

    // 重置统计
    this.stats = {
      score: 0,
      steps: 0,
      foodEaten: 0
    };
    this.notifyStatsUpdate();
  }

  /**
   * 暂停/继续游戏
   */
  public togglePause(): void {
    if (this.status === GameStatus.PLAYING) {
      this.status = GameStatus.PAUSED;
      if (this.gameLoopId !== null) {
        cancelAnimationFrame(this.gameLoopId);
        this.gameLoopId = null;
      }
    } else if (this.status === GameStatus.PAUSED) {
      this.status = GameStatus.PLAYING;
      this.lastFrameTime = performance.now();
      this.gameLoopId = requestAnimationFrame((time) => this.gameLoop(time));
    }

    this.notifyStatusChange();
  }

  /**
   * 重置游戏
   */
  public reset(): void {
    // 停止游戏循环
    if (this.gameLoopId !== null) {
      cancelAnimationFrame(this.gameLoopId);
      this.gameLoopId = null;
    }

    // 重新初始化
    this.initializeGame();
    this.status = GameStatus.NOT_STARTED;
    this.notifyStatusChange();
  }

  /**
   * 设置蛇的方向（人类玩家模式）
   */
  public setSnakeDirection(direction: Direction): void {
    if (this.config.mode === GameMode.HUMAN && this.status === GameStatus.PLAYING) {
      this.snake.setDirection(direction);
    }
  }

  /**
   * 设置AI决策的方向
   */
  public setAIDirection(direction: Direction): void {
    if (this.config.mode === GameMode.AI && this.status === GameStatus.PLAYING) {
      this.snake.setDirection(direction);
    }
  }

  /**
   * 游戏主循环
   */
  private gameLoop(currentTime: number): void {
    // 计算经过时间
    const elapsed = currentTime - this.lastFrameTime;

    // 如果经过时间达到帧间隔，更新游戏状态
    if (elapsed >= this.frameInterval) {
      this.lastFrameTime = currentTime - (elapsed % this.frameInterval);
      this.update();
    }

    // 继续循环
    if (this.status === GameStatus.PLAYING) {
      this.gameLoopId = requestAnimationFrame((time) => this.gameLoop(time));
    }
  }

  /**
    * 更新游戏状态（每帧调用）
    */
  private update(): void {
    // 在更新之前调用AI决策（如果有）
    if (this.config.mode === GameMode.AI && this.onBeforeUpdate) {
      this.onBeforeUpdate();
    }

    // 增加步数
    this.stats.steps++;

    // 获取蛇头和下一个方向
    const currentHead = this.snake.getHead();
    const nextDirection = this.snake.getNextDirection();
    
    // 计算下一个位置
    let nextX = currentHead.x;
    let nextY = currentHead.y;
    switch (nextDirection) {
      case Direction.UP: nextY--; break;
      case Direction.DOWN: nextY++; break;
      case Direction.LEFT: nextX--; break;
      case Direction.RIGHT: nextX++; break;
    }
    const nextHead = { x: nextX, y: nextY };
    
    // 检查是否吃到食物
    let ateFood = false;
    if (this.food.isAtPosition(nextHead)) {
      ateFood = true;
      this.stats.foodEaten++;
      this.stats.score += 10;  // 吃一个食物得10分

      // 重新生成食物
      this.food.generate(this.config.mapWidth, this.config.mapHeight, this.snake.getAllSegments());

      // 检查是否吃完所有格子（满分）
      const maxFood = this.config.mapWidth * this.config.mapHeight - this.snake.getLength();
      if (this.stats.foodEaten >= maxFood) {
        // 满分 = 吃满所有格子
        this.stats.score = this.config.mapWidth * this.config.mapHeight * 10;  // 满分
        this.status = GameStatus.VICTORY;
        this.notifyStatusChange();
        this.notifyStatsUpdate();
        this.render();
        return;
      }
    }

    // 移动蛇（吃到食物时增长）
    const head = this.snake.move(ateFood);

    // 检查碰撞
    if (this.checkCollision(head)) {
      this.status = GameStatus.GAME_OVER;
      this.notifyStatusChange();
      this.render();
      return;
    }

    // 更新统计并渲染
    this.notifyStatsUpdate();
    this.render();
  }

  /**
   * 检查碰撞
   */
  private checkCollision(head: Coordinate): boolean {
    // 检查墙壁碰撞
    if (head.x < 0 || head.x >= this.config.mapWidth ||
        head.y < 0 || head.y >= this.config.mapHeight) {
      return true;
    }

    // 检查自身碰撞（跳过头部）
    if (this.snake.isOnSnake(head, false)) {
      return true;
    }

    return false;
  }

  /**
   * 获取地图上的格子类型
   */
  public getCellType(x: number, y: number): CellType {
    // 检查是否是蛇头
    const head = this.snake.getHead();
    if (head.x === x && head.y === y) {
      return CellType.SNAKE_HEAD;
    }

    // 检查是否是蛇身
    if (this.snake.isOnSnake({ x, y }, true)) {
      return CellType.SNAKE_BODY;
    }

    // 检查是否是食物
    if (this.food.isAtPosition({ x, y })) {
      return CellType.FOOD;
    }

    return CellType.EMPTY;
  }

  /**
   * 获取蛇头
   */
  public getSnakeHead(): Coordinate {
    return this.snake.getHead();
  }

  /**
   * 获取蛇身
   */
  public getSnakeBody(): Coordinate[] {
    return this.snake.getAllSegments();
  }

  /**
   * 获取食物位置
   */
  public getFoodPosition(): Coordinate {
    return this.food.getPosition();
  }

  /**
   * 获取地图尺寸
   */
  public getMapSize(): { width: number; height: number } {
    return {
      width: this.config.mapWidth,
      height: this.config.mapHeight
    };
  }

  /**
   * 渲染游戏
   */
  private render(): void {
    if (this.onRender) {
      this.onRender();
    }
  }

  /**
   * 通知状态变化
   */
  private notifyStatusChange(): void {
    if (this.onStatusChange) {
      this.onStatusChange(this.status);
    }
  }

  /**
   * 通知统计更新
   */
  private notifyStatsUpdate(): void {
    if (this.onStatsUpdate) {
      this.onStatsUpdate({ ...this.stats });
    }
  }

  /**
   * 通知AI决策
   */
  public notifyAIDecision(decision: string): void {
    if (this.onAIDecision) {
      this.onAIDecision(decision);
    }
  }

  /**
   * 检查指定方向是否安全（不撞墙或不撞自己）
   */
  public isDirectionSafe(direction: Direction): boolean {
    const head = this.snake.getHead();
    let nextX = head.x;
    let nextY = head.y;

    switch (direction) {
      case Direction.UP:
        nextY--;
        break;
      case Direction.DOWN:
        nextY++;
        break;
      case Direction.LEFT:
        nextX--;
        break;
      case Direction.RIGHT:
        nextX++;
        break;
    }

    // 检查边界
    if (nextX < 0 || nextX >= this.config.mapWidth ||
        nextY < 0 || nextY >= this.config.mapHeight) {
      return false;
    }

    // 检查自身碰撞
    const nextPos = { x: nextX, y: nextY };
    if (this.snake.isOnSnake(nextPos, false)) {
      return false;
    }

    return true;
  }

  /**
   * 获取所有可用方向
   */
  public getAvailableDirections(): Direction[] {
    const available: Direction[] = [];
    const directions = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];

    for (const dir of directions) {
      // 排除当前方向的反方向
      const currentDir = this.snake.getDirection();
      if (this.isOppositeDirection(currentDir, dir)) {
        continue;
      }

      if (this.isDirectionSafe(dir)) {
        available.push(dir);
      }
    }

    return available;
  }

  /**
   * 判断两个方向是否相反
   */
  private isOppositeDirection(dir1: Direction, dir2: Direction): boolean {
    return (
      (dir1 === Direction.UP && dir2 === Direction.DOWN) ||
      (dir1 === Direction.DOWN && dir2 === Direction.UP) ||
      (dir1 === Direction.LEFT && dir2 === Direction.RIGHT) ||
      (dir1 === Direction.RIGHT && dir2 === Direction.LEFT)
    );
  }
}
