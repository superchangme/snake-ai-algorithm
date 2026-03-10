import { CellType } from './types';

/**
 * 游戏渲染器 - 负责Canvas绑绘制游戏画面
 */
export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cellSize: number = 20;
  private mapWidth: number = 10;
  private mapHeight: number = 10;

  // 颜色配置 - 明亮主题
  private readonly COLORS = {
    background: '#f8fafc',      // 亮白色背景
    grid: '#e2e8f0',            // 浅灰网格
    snakeHead: '#22c55e',       // 明亮绿色蛇头
    snakeBody: '#4ade80',        // 亮绿蛇身
    snakeBodyDark: '#86efac',   // 浅绿蛇身（渐变）
    food: '#ef4444',            // 红色食物
    foodGlow: '#fca5a5',        // 粉色光晕
    text: '#1e293b',            // 深色文字
    border: '#94a3b8'           // 中灰边框
  };

  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas element with id '${canvasId}' not found`);
    }

    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;

    // 设置Canvas尺寸
    this.updateCanvasSize();
  }

  /**
   * 更新地图尺寸
   */
  public updateMapSize(width: number, height: number): void {
    this.mapWidth = width;
    this.mapHeight = height;
    this.updateCanvasSize();
  }

  /**
   * 更新Canvas尺寸
   */
  private updateCanvasSize(): void {
    const maxCanvasSize = 500;
    const minCellSize = 15;

    const cellSizeByWidth = Math.floor(maxCanvasSize / this.mapWidth);
    const cellSizeByHeight = Math.floor(maxCanvasSize / this.mapHeight);

    this.cellSize = Math.max(minCellSize, Math.min(cellSizeByWidth, cellSizeByHeight));

    this.canvas.width = this.mapWidth * this.cellSize;
    this.canvas.height = this.mapHeight * this.cellSize;

    this.canvas.style.width = `${this.canvas.width}px`;
    this.canvas.style.height = `${this.canvas.height}px`;
  }

  /**
   * 渲染游戏画面
   */
  public render(
    getCellType: (x: number, y: number) => CellType,
    _score: number,
    _steps: number,
    _status: string
  ): void {
    // 清空画布
    this.ctx.fillStyle = this.COLORS.background;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 绘制网格
    this.drawGrid();

    // 绘制游戏元素
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const cellType = getCellType(x, y);
        const posX = x * this.cellSize;
        const posY = y * this.cellSize;

        switch (cellType) {
          case CellType.SNAKE_HEAD:
            this.drawSnakeHead(posX, posY);
            break;
          case CellType.SNAKE_BODY:
            this.drawSnakeBody(posX, posY, x, y);
            break;
          case CellType.FOOD:
            this.drawFood(posX, posY);
            break;
          default:
            break;
        }
      }
    }

    // 绘制分数和步数（已移除悬浮分数栏，避免遮挡游戏画面）
    // this.drawStats(score, steps, status);
  }

  /**
   * 绘制网格
   */
  private drawGrid(): void {
    this.ctx.strokeStyle = this.COLORS.grid;
    this.ctx.lineWidth = 1;

    for (let x = 0; x <= this.mapWidth; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * this.cellSize, 0);
      this.ctx.lineTo(x * this.cellSize, this.canvas.height);
      this.ctx.stroke();
    }

    for (let y = 0; y <= this.mapHeight; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y * this.cellSize);
      this.ctx.lineTo(this.canvas.width, y * this.cellSize);
      this.ctx.stroke();
    }
  }

  /**
   * 绘制蛇头
   */
  private drawSnakeHead(x: number, y: number): void {
    const padding = 2;
    const size = this.cellSize - padding * 2;

    this.ctx.fillStyle = this.COLORS.snakeHead;
    this.ctx.beginPath();
    this.ctx.roundRect(x + padding, y + padding, size, size, 4);
    this.ctx.fill();

    this.ctx.fillStyle = '#86efac';
    this.ctx.beginPath();
    this.ctx.roundRect(x + padding + 2, y + padding + 2, size / 3, size / 3, 2);
    this.ctx.fill();
  }

  /**
   * 绘制蛇身
   */
  private drawSnakeBody(x: number, y: number, gridX: number, gridY: number): void {
    const padding = 2;
    const size = this.cellSize - padding * 2;

    this.ctx.fillStyle = (gridX + gridY) % 2 === 0
      ? this.COLORS.snakeBody
      : this.COLORS.snakeBodyDark;

    this.ctx.beginPath();
    this.ctx.roundRect(x + padding, y + padding, size, size, 3);
    this.ctx.fill();
  }

  /**
   * 绘制食物
   */
  private drawFood(x: number, y: number): void {
    const centerX = x + this.cellSize / 2;
    const centerY = y + this.cellSize / 2;
    const radius = this.cellSize / 2 - 3;

    const gradient = this.ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, radius + 4
    );
    gradient.addColorStop(0, 'rgba(248, 113, 113, 0.3)');
    gradient.addColorStop(1, 'rgba(248, 113, 113, 0)');

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius + 4, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = this.COLORS.food;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = this.COLORS.foodGlow;
    this.ctx.beginPath();
    this.ctx.arc(centerX - radius / 3, centerY - radius / 3, radius / 3, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /**
    * 绘制统计信息（当前未使用，预留用于未来可能的需求）
    */
  // @ts-expect-error - 预留方法，未来可能需要在canvas外部显示统计信息
  private _drawStats(score: number, steps: number, status: string): void {
    // 目前通过DOM元素显示分数，此方法暂时不使用
    void score; void steps; void status;
    
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.canvas.width, 30);

    this.ctx.fillStyle = this.COLORS.text;
    this.ctx.font = 'bold 12px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    this.ctx.fillText(
      `分数: ${score}  |  步数: ${steps}  |  状态: ${status}`,
      this.canvas.width / 2,
      15
    );
  }

  /**
   * 绘制游戏结束画面
   */
  public renderGameOver(score: number, isVictory: boolean): void {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.font = 'bold 24px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    if (isVictory) {
      this.ctx.fillStyle = '#4ade80';
      this.ctx.fillText('🎉 满分! 🎉', this.canvas.width / 2, this.canvas.height / 2 - 20);
    } else {
      this.ctx.fillStyle = '#f87171';
      this.ctx.fillText('游戏结束', this.canvas.width / 2, this.canvas.height / 2 - 20);
    }

    this.ctx.font = '16px monospace';
    this.ctx.fillStyle = this.COLORS.text;
    this.ctx.fillText(
      `最终分数: ${score}`,
      this.canvas.width / 2,
      this.canvas.height / 2 + 20
    );

    this.ctx.font = '12px monospace';
    this.ctx.fillStyle = '#94a3b8';
    this.ctx.fillText(
      '点击"重置"按钮重新开始',
      this.canvas.width / 2,
      this.canvas.height / 2 + 50
    );
  }
}
