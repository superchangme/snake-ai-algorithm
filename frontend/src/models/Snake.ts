import { Coordinate, Direction } from '../types';

/**
 * 蛇类 - 管理蛇的数据结构和移动逻辑
 *
 * 设计决策:
 * - 使用数组存储蛇身坐标，头部为数组第一个元素
 * - body数组的最后一个元素是蛇尾，移动时从尾部添加新头部
 */
export class Snake {
  private body: Coordinate[];
  private direction: Direction;
  private nextDirection: Direction;
  private initialLength: number = 3;

  constructor(startX: number = 0, startY: number = 0) {
    this.direction = Direction.RIGHT;
    this.nextDirection = Direction.RIGHT;
    this.body = this.createInitialSnake(startX, startY);
  }

  /**
   * 创建初始蛇身
   * 蛇初始长度为3，水平向右排列
   */
  private createInitialSnake(startX: number, startY: number): Coordinate[] {
    const body: Coordinate[] = [];
    for (let i = 0; i < this.initialLength; i++) {
      body.push({ x: startX - i, y: startY });
    }
    return body;
  }

  /**
   * 获取蛇身
   */
  public getBody(): Coordinate[] {
    return [...this.body];
  }

  /**
   * 获取蛇头位置
   */
  public getHead(): Coordinate {
    return { ...this.body[0] };
  }

  /**
   * 获取蛇头后面的位置（脖子）
   */
  public getNeck(): Coordinate {
    return { ...this.body[1] };
  }

  /**
   * 获取当前移动方向
   */
  public getDirection(): Direction {
    return this.direction;
  }

  /**
   * 获取下一个方向（待执行的转向）
   */
  public getNextDirection(): Direction {
    return this.nextDirection;
  }

  /**
   * 设置移动方向
   * 禁止直接反向移动（蛇不能直接掉头）
   */
  public setDirection(newDirection: Direction): void {
    // 检查是否反向移动
    if (this.isOppositeDirection(this.direction, newDirection)) {
      return;  // 忽略反向移动指令
    }
    this.nextDirection = newDirection;
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

  /**
   * 移动蛇
   * @param grow - 是否在移动后增长
   * @returns 新的头部位置
   */
  public move(grow: boolean = false): Coordinate {
    // 更新当前方向为下一个方向
    this.direction = this.nextDirection;

    // 计算新头部位置
    const head = this.getHead();
    const newHead = this.getNextPosition(head, this.direction);

    // 在头部位置添加新段
    this.body.unshift(newHead);

    // 如果不增长，移除尾部
    if (!grow) {
      this.body.pop();
    }

    return newHead;
  }

  /**
   * 计算下一个位置
   */
  private getNextPosition(current: Coordinate, direction: Direction): Coordinate {
    switch (direction) {
      case Direction.UP:
        return { x: current.x, y: current.y - 1 };
      case Direction.DOWN:
        return { x: current.x, y: current.y + 1 };
      case Direction.LEFT:
        return { x: current.x - 1, y: current.y };
      case Direction.RIGHT:
        return { x: current.x + 1, y: current.y };
    }
  }

  /**
   * 检查坐标是否在蛇身上
   */
  public isOnSnake(position: Coordinate, includeHead: boolean = true): boolean {
    const startIndex = includeHead ? 0 : 1;
    for (let i = startIndex; i < this.body.length; i++) {
      if (this.body[i].x === position.x && this.body[i].y === position.y) {
        return true;
      }
    }
    return false;
  }

  /**
   * 检查蛇身是否与指定坐标集合碰撞
   */
  public isCollisionWithObstacles(obstacles: Coordinate[]): boolean {
    for (const obstacle of obstacles) {
      if (this.isOnSnake(obstacle, false)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 重置蛇到初始状态
   */
  public reset(startX: number, startY: number): void {
    this.direction = Direction.RIGHT;
    this.nextDirection = Direction.RIGHT;
    this.body = this.createInitialSnake(startX, startY);
  }

  /**
   * 仅重置方向（不重置蛇身位置）
   * 用于切换游戏模式时确保方向一致
   */
  public resetDirection(): void {
    this.direction = Direction.RIGHT;
    this.nextDirection = Direction.RIGHT;
  }

  /**
   * 获取蛇的长度
   */
  public getLength(): number {
    return this.body.length;
  }

  /**
   * 获取蛇的所有段坐标
   */
  public getAllSegments(): Coordinate[] {
    return this.body;
  }
}
