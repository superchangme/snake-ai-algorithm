import { Coordinate } from '../types';

/**
 * HCMemoizer - Hamiltonian Cycle 缓存管理器
 * 
 * 核心功能：
 * - 缓存相同形状子网格的 Hamiltonian Cycle 计算结果
 * - 避免重复计算，提高性能
 * - 键格式："{width}-{height}-{obstaclePattern}"
 * 
 * 应用场景：
 * - Divide and Conquer 中复用子块的 HC
 * - 多次游戏或移动中使用相同形状
 */
export class HCMemoizer {
  private cache: Map<string, Coordinate[]>;

  constructor() {
    this.cache = new Map();
  }

  /**
   * 生成形状键
   * @param width 网格宽度
   * @param height 网格高度
   * @param obstacles 障碍物位置数组
   * @returns 形状键字符串
   */
  static generateShapeKey(width: number, height: number, obstacles: Set<string>): string {
    // 对障碍物进行排序以确保一致性
    const sortedObstacles = Array.from(obstacles).sort();
    const obstacleKey = sortedObstacles.join('|') || 'none';
    return `${width}-${height}-${obstacleKey}`;
  }

  /**
   * 获取缓存的 Hamiltonian Cycle
   * @param shapeKey 形状键
   * @returns 缓存的 HC 或 null
   */
  get(shapeKey: string): Coordinate[] | null {
    return this.cache.get(shapeKey) || null;
  }

  /**
   * 缓存 Hamiltonian Cycle
   * @param shapeKey 形状键
   * @param hc Hamiltonian Cycle 路径
   */
  set(shapeKey: string, hc: Coordinate[]): void {
    this.cache.set(shapeKey, [...hc]); // 存储副本以防止外部修改
  }

  /**
   * 检查缓存是否存在
   * @param shapeKey 形状键
   * @returns 是否存在
   */
  has(shapeKey: string): boolean {
    return this.cache.has(shapeKey);
  }

  /**
   * 获取缓存大小
   * @returns 缓存条目数
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 删除指定缓存
   * @param shapeKey 形状键
   * @returns 是否删除成功
   */
  delete(shapeKey: string): boolean {
    return this.cache.delete(shapeKey);
  }

  /**
   * 获取所有缓存的键
   * @returns 键数组
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 获取缓存统计信息
   * @returns 统计信息对象
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: this.keys()
    };
  }
}

/**
 * 简单的内存缓存包装器
 * 用于更大规模的缓存需求
 */
export class CacheWithTTL<K, V> {
  private cache: Map<K, { value: V; timestamp: number }>;
  private ttl: number; // 存活时间（毫秒）

  constructor(ttlMs: number = 60000) {
    this.cache = new Map();
    this.ttl = ttlMs;
  }

  /**
   * 设置缓存值
   * @param key 键
   * @param value 值
   */
  set(key: K, value: V): void {
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  /**
   * 获取缓存值
   * @param key 键
   * @returns 值或 undefined
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }
    
    // 检查是否过期
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.value;
  }

  /**
   * 检查键是否存在且未过期
   * @param key 键
   * @returns 是否存在
   */
  has(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   * @returns 条目数
   */
  size(): number {
    return this.cache.size;
  }
}
