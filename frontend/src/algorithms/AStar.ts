import { Coordinate, Direction } from '../types';

/**
 * A*寻路算法实现
 */
export class AStar {
  private mapWidth: number;
  private mapHeight: number;
  private obstacles: Coordinate[];

  constructor(mapWidth: number, mapHeight: number, obstacles: Coordinate[] = []) {
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.obstacles = obstacles;
  }

  /**
   * 更新障碍物（蛇身）
   */
  public updateObstacles(obstacles: Coordinate[]): void {
    this.obstacles = obstacles;
  }

  /**
   * A*寻路节点
   */
  private createNode(
    position: Coordinate,
    gCost: number,
    hCost: number,
    parent: AStarNode | null = null
  ): AStarNode {
    return {
      position,
      gCost,
      hCost,
      parent,
      fCost: gCost + hCost
    };
  }

  /**
   * 查找从起点到终点的最短路径
   */
  public findPath(start: Coordinate, end: Coordinate): Direction[] | null {
    if (this.isObstacle(start) || this.isObstacle(end)) {
      return null;
    }

    if (start.x === end.x && start.y === end.y) {
      return [];
    }

    const openList: AStarNode[] = [];
    const closedSet = new Set<string>();

    const startNode = this.createNode(start, 0, this.heuristic(start, end));
    openList.push(startNode);

    while (openList.length > 0) {
      const currentIndex = this.findLowestFCostIndex(openList);
      const currentNode = openList[currentIndex];

      openList.splice(currentIndex, 1);
      closedSet.add(this.nodeKey(currentNode.position));

      if (currentNode.position.x === end.x && currentNode.position.y === end.y) {
        return this.reconstructPath(currentNode);
      }

      const neighbors = this.getNeighbors(currentNode.position);

      for (const neighborPos of neighbors) {
        const key = this.nodeKey(neighborPos);

        if (closedSet.has(key)) {
          continue;
        }

        if (this.isObstacle(neighborPos)) {
          continue;
        }

        const tentativeGCost = currentNode.gCost + 1;

        const existingNode = openList.find(n => n.position.x === neighborPos.x && n.position.y === neighborPos.y);

        if (!existingNode) {
          const newNode = this.createNode(neighborPos, tentativeGCost, this.heuristic(neighborPos, end), currentNode);
          openList.push(newNode);
        } else if (tentativeGCost < existingNode.gCost) {
          existingNode.gCost = tentativeGCost;
          existingNode.fCost = tentativeGCost + existingNode.hCost;
          existingNode.parent = currentNode;
        }
      }
    }

    return null;
  }

  /**
   * 曼哈顿距离启发函数
   */
  private heuristic(a: Coordinate, b: Coordinate): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  /**
   * 获取节点key
   */
  private nodeKey(position: Coordinate): string {
    return `${position.x},${position.y}`;
  }

  /**
   * 找到fCost最低的节点索引
   */
  private findLowestFCostIndex(nodes: AStarNode[]): number {
    let lowestIndex = 0;
    let lowestFCost = nodes[0].fCost;

    for (let i = 1; i < nodes.length; i++) {
      if (nodes[i].fCost < lowestFCost) {
        lowestFCost = nodes[i].fCost;
        lowestIndex = i;
      }
    }

    return lowestIndex;
  }

  /**
   * 获取相邻节点
   */
  private getNeighbors(position: Coordinate): Coordinate[] {
    const neighbors: Coordinate[] = [];
    const directions = [
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 }
    ];

    for (const dir of directions) {
      const newX = position.x + dir.x;
      const newY = position.y + dir.y;

      if (newX >= 0 && newX < this.mapWidth &&
          newY >= 0 && newY < this.mapHeight) {
        neighbors.push({ x: newX, y: newY });
      }
    }

    return neighbors;
  }

  /**
   * 检查坐标是否是障碍物
   */
  private isObstacle(position: Coordinate): boolean {
    for (const obstacle of this.obstacles) {
      if (obstacle.x === position.x && obstacle.y === position.y) {
        return true;
      }
    }
    return false;
  }

  /**
   * 从终点回溯路径
   */
  private reconstructPath(endNode: AStarNode): Direction[] {
    const path: Direction[] = [];
    let currentNode: AStarNode | null = endNode;

    while (currentNode && currentNode.parent) {
      const direction = this.getDirectionFromParentToChild(
        currentNode.parent.position,
        currentNode.position
      );
      path.unshift(direction);
      currentNode = currentNode.parent;
    }

    return path;
  }

  /**
   * 获取从父节点到子节点的方向
   */
  private getDirectionFromParentToChild(parent: Coordinate, child: Coordinate): Direction {
    if (child.y < parent.y) {
      return Direction.UP;
    } else if (child.y > parent.y) {
      return Direction.DOWN;
    } else if (child.x < parent.x) {
      return Direction.LEFT;
    } else {
      return Direction.RIGHT;
    }
  }

  /**
   * 检查移动后是否仍然可以到达目标
   */
  public canReachAfterMove(
    start: Coordinate,
    direction: Direction,
    end: Coordinate
  ): boolean {
    let nextX = start.x;
    let nextY = start.y;

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

    const nextPos = { x: nextX, y: nextY };
    return this.findPath(nextPos, end) !== null;
  }
}

/**
 * A*寻路节点类型
 */
interface AStarNode {
  position: Coordinate;
  gCost: number;
  hCost: number;
  parent: AStarNode | null;
  fCost: number;
}
