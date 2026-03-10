import { Coordinate, Direction } from '../types';

/**
 * Hamiltonian Cycle生成器
 * 使用zigzag pattern覆盖任意偶x偶网格的所有格子
 */
export class HamiltonianCycle {
  private readonly width: number;
  private readonly height: number;
  private readonly cycle: Coordinate[] = [];
  private readonly positionIndex: Map<string, number> = new Map();

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.generateZigzagCycle();

    // 验证cycle长度
    if (this.cycle.length !== width * height) {
      throw new Error(
        `Hamiltonian cycle generation failed: expected ${width * height} positions, got ${this.cycle.length}`
      );
    }
  }

  /**
   * 生成zigzag pattern的Hamiltonian Cycle
   * 行0左→右，行1右→左，行2左→右...
   */
  private generateZigzagCycle(): void {
    for (let row = 0; row < this.height; row++) {
      if (row % 2 === 0) {
        // 偶数行：左→右
        for (let col = 0; col < this.width; col++) {
          const pos: Coordinate = { x: col, y: row };
          this.cycle.push(pos);
          this.positionIndex.set(`${pos.x},${pos.y}`, this.cycle.length - 1);
        }
      } else {
        // 奇数行：右→左
        for (let col = this.width - 1; col >= 0; col--) {
          const pos: Coordinate = { x: col, y: row };
          this.cycle.push(pos);
          this.positionIndex.set(`${pos.x},${pos.y}`, this.cycle.length - 1);
        }
      }
    }
  }

  /**
   * 获取cycle中某位置的下一个位置
   * @param headPos 当前头部位置
   * @returns 下一个位置，如果是最后一个位置则返回null（闭环）
   */
  getNextPositionOnCycle(headPos: Coordinate): Coordinate | null {
    const index = this.getPositionIndex(headPos);
    if (index === null || index >= this.cycle.length - 1) {
      return null; // 最后一个位置或不在cycle中
    }
    return this.cycle[index + 1];
  }

  /**
   * 获取cycle中某位置的下一个方向
   * @param headPos 当前头部位置
   * @returns 移动方向，如果是最后一个位置则返回null
   */
  getNextDirectionOnCycle(headPos: Coordinate): Direction | null {
    const nextPos = this.getNextPositionOnCycle(headPos);
    if (nextPos === null) {
      return null;
    }
    return this.getDirection(headPos, nextPos);
  }

  /**
   * 获取位置在cycle中的索引
   * @param pos 坐标
   * @returns 索引，不在cycle中则返回null
   */
  getPositionIndex(pos: Coordinate): number | null {
    const index = this.positionIndex.get(`${pos.x},${pos.y}`);
    return index !== undefined ? index : null;
  }

  /**
   * 计算沿cycle从from到to的距离（步数）
   * @param from 起始位置
   * @param to 目标位置
   * @returns 沿cycle的步数，如果任一位置不在cycle中则返回-1
   */
  distanceAlongCycle(from: Coordinate, to: Coordinate): number {
    const fromIndex = this.getPositionIndex(from);
    const toIndex = this.getPositionIndex(to);

    if (fromIndex === null || toIndex === null) {
      return -1;
    }

    // 沿cycle前进的步数（闭环，所以可以绕回起点）
    let distance = toIndex - fromIndex;
    if (distance < 0) {
      distance += this.cycle.length;
    }
    return distance;
  }

  /**
   * 检查位置是否在cycle上
   * @param pos 坐标
   * @returns 是否在cycle上
   */
  isOnCycle(pos: Coordinate): boolean {
    return this.positionIndex.has(`${pos.x},${pos.y}`);
  }

  /**
   * 获取完整的cycle路径
   * @returns 所有位置的数组
   */
  getFullCycle(): Coordinate[] {
    return [...this.cycle];
  }

  /**
   * 获取cycle长度
   * @returns cycle中的位置数量
   */
  getLength(): number {
    return this.cycle.length;
  }

  /**
   * 计算从from位置到to位置的移动方向
   * @param from 起始位置
   * @param to 目标位置
   * @returns 方向
   */
  private getDirection(from: Coordinate, to: Coordinate): Direction {
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    if (dx === 1 && dy === 0) return Direction.RIGHT;
    if (dx === -1 && dy === 0) return Direction.LEFT;
    if (dx === 0 && dy === 1) return Direction.DOWN;
    if (dx === 0 && dy === -1) return Direction.UP;

    throw new Error(`Invalid move from (${from.x},${from.y}) to (${to.x},${to.y})`);
  }
}
