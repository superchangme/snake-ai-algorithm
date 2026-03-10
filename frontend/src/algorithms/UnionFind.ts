import { Coordinate } from '../types';

/**
 * Union-Find (Disjoint Set Union) 数据结构
 * 用于合并和追踪 Hamiltonian Cycle 的子路径
 * 
 * 核心应用场景：
 * - 在 DivideHC 中合并多个子块的 Hamiltonian Cycle
 * - 追踪哪些位置已经连接成路径
 * - 快速判断两个位置是否在同一连通分量中
 */
export class UnionFind {
  private parent: Map<string, string>;
  private rank: Map<string, number>;

  constructor() {
    this.parent = new Map();
    this.rank = new Map();
  }

  /**
   * 创建新集合
   * @param x 元素标识符
   */
  makeSet(x: string): void {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
      this.rank.set(x, 0);
    }
  }

  /**
   * 查找元素所在集合的根（路径压缩）
   * @param x 元素标识符
   * @returns 根元素标识符
   */
  find(x: string): string {
    if (!this.parent.has(x)) {
      throw new Error(`Element ${x} not found in UnionFind`);
    }

    // 路径压缩：直接将父节点指向根节点
    if (this.parent.get(x) !== x) {
      const root = this.find(this.parent.get(x)!);
      this.parent.set(x, root);
    }
    return this.parent.get(x)!;
  }

  /**
   * 合并两个元素所在集合（按秩合并）
   * @param x 元素标识符
   * @param y 元素标识符
   */
  union(x: string, y: string): void {
    const rootX = this.find(x);
    const rootY = this.find(y);

    if (rootX === rootY) {
      return; // 已经在同一集合中
    }

    // 按秩合并：总是将较短的树连接到较长的树上
    const rankX = this.rank.get(rootX) || 0;
    const rankY = this.rank.get(rootY) || 0;

    if (rankX < rankY) {
      this.parent.set(rootX, rootY);
    } else if (rankX > rankY) {
      this.parent.set(rootY, rootX);
    } else {
      // 秩相同时，将 Y 根挂到 X 根，并增加 X 的秩
      this.parent.set(rootY, rootX);
      this.rank.set(rootX, rankX + 1);
    }
  }

  /**
   * 检查两个元素是否在同一集合中
   * @param x 元素标识符
   * @param y 元素标识符
   * @returns 是否连通
   */
  connected(x: string, y: string): boolean {
    return this.find(x) === this.find(y);
  }

  /**
   * 获取集合数量
   * @returns 当前连通分量的数量
   */
  count(): number {
    const roots = new Set<string>();
    for (const [key] of this.parent) {
      roots.add(this.find(key));
    }
    return roots.size;
  }

  /**
   * 清空数据结构
   */
  clear(): void {
    this.parent.clear();
    this.rank.clear();
  }

  /**
   * 获取所有元素
   * @returns 元素数组
   */
  getElements(): string[] {
    return Array.from(this.parent.keys());
  }

  /**
   * 检查元素是否存在
   * @param x 元素标识符
   * @returns 是否存在
   */
  has(x: string): boolean {
    return this.parent.has(x);
  }

  /**
   * 获取两个位置的连通键
   * @param a 位置A
   * @param b 位置B
   * @returns 连通键
   */
  static getConnectivityKey(a: Coordinate, b: Coordinate): string {
    return `${a.x},${a.y}-${b.x},${b.y}`;
  }

  /**
   * 获取位置的唯一键
   * @param pos 坐标
   * @returns 唯一键
   */
  static getKey(pos: Coordinate): string {
    return `${pos.x},${pos.y}`;
  }
}
