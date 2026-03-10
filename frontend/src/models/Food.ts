import { Coordinate } from '../types';

/**
 * 食物类 - 管理食物的生成和位置
 *
 * 核心逻辑:
 * - 随机选择空白位置生成食物
 * - 避免与蛇身重叠
 */
export class Food {
  private position: Coordinate;
  private isGenerated: boolean = false;

  constructor() {
    this.position = { x: 0, y: 0 };
  }

  /**
   * 获取食物位置
   */
  public getPosition(): Coordinate {
    return { ...this.position };
  }

  /**
   * 检查食物是否已生成
   */
  public isReady(): boolean {
    return this.isGenerated;
  }

  /**
   * 在空白位置生成食物
   * @param mapWidth - 地图宽度
   * @param mapHeight - 地图高度
   * @param snakeBody - 蛇身坐标数组（用于避免重叠）
   */
  public generate(
    mapWidth: number,
    mapHeight: number,
    snakeBody: Coordinate[]
  ): void {
    let maxAttempts = 100;  // 防止无限循环
    let attempts = 0;

    while (attempts < maxAttempts) {
      // 随机选择位置
      const x = Math.floor(Math.random() * mapWidth);
      const y = Math.floor(Math.random() * mapHeight);
      const newPosition = { x, y };

      // 检查是否与蛇身重叠
      let isOverlapping = false;
      for (const segment of snakeBody) {
        if (segment.x === x && segment.y === y) {
          isOverlapping = true;
          break;
        }
      }

      // 如果不重叠，生成食物
      if (!isOverlapping) {
        this.position = newPosition;
        this.isGenerated = true;
        return;
      }

      attempts++;
    }

    // 如果尝试次数用尽，抛出错误
    throw new Error('无法找到合适的位置生成食物');
  }

  /**
   * 检查指定位置是否有食物
   */
  public isAtPosition(position: Coordinate): boolean {
    return this.position.x === position.x && this.position.y === position.y;
  }

  /**
   * 重置食物状态
   */
  public reset(): void {
    this.isGenerated = false;
    this.position = { x: 0, y: 0 };
  }
}
