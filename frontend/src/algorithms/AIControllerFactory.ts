import { Coordinate, Direction, AIDecision } from '../types';
import { AIController } from './AIController';
import { AIControllerClaude } from './AIControllerClaude';
import { HamiltonSolver } from './HamiltonSolver';

/**
 * AI控制器基类接口
 */
export interface AIControllerBase {
  getDecision(snakeHead: Coordinate, snakeBody: Coordinate[], foodPosition: Coordinate): AIDecision;
  reset(): void;
  updateDirection(direction: Direction): void;
  checkDeadLoop(score: number, steps: number, snakeBody: Coordinate[]): boolean;
}

/**
 * AI控制器工厂 - 根据版本创建不同的AI控制器
 */
export class AIControllerFactory {
  public static create(
    mapWidth: number,
    mapHeight: number,
    direction: Direction,
    version?: string
  ): AIControllerBase {
    // 从URL参数获取版本，默认classic
    const algorithmVersion = version || AIControllerFactory.getVersionFromUrl();

    switch (algorithmVersion) {
      case 'claude':
        console.log('[AI Factory] Using Claude controller');
        return new AIControllerClaude(mapWidth, mapHeight, direction);
      case 'hamilton':
        console.log('[AI Factory] Using Hamilton controller');
        return new HamiltonSolver(mapWidth, mapHeight, direction);
      case 'classic':
      default:
        console.log('[AI Factory] Using Classic controller');
        return new AIController(mapWidth, mapHeight, direction);
    }
  }

  private static getVersionFromUrl(): string {
    if (typeof window === 'undefined') return 'classic';
    const params = new URLSearchParams(window.location.search);
    return params.get('algorithm') || 'classic';
  }
}

// 导出工厂函数（简便写法）
export function createAIController(
  mapWidth: number,
  mapHeight: number,
  direction: Direction,
  version?: string
): AIControllerBase {
  return AIControllerFactory.create(mapWidth, mapHeight, direction, version);
}
