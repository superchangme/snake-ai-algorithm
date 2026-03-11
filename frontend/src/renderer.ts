import { Game } from './models/Game';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private cellSize: number;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.cellSize = 20;
  }

  setCellSize(size: number): void {
    this.cellSize = size;
    this.canvas.width = this.ctx.canvas.width;
    this.canvas.height = this.ctx.canvas.height;
  }

  render(game: Game): void {
    const { width, height } = game.getGridSize();
    this.cellSize = this.canvas.width / width;
    
    // Clear
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw grid
    this.ctx.strokeStyle = '#2a2a4e';
    this.ctx.lineWidth = 0.5;
    for (let x = 0; x <= width; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * this.cellSize, 0);
      this.ctx.lineTo(x * this.cellSize, this.canvas.height);
      this.ctx.stroke();
    }
    for (let y = 0; y <= height; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y * this.cellSize);
      this.ctx.lineTo(this.canvas.width, y * this.cellSize);
      this.ctx.stroke();
    }
    
    // Draw food only if game is not won
    const food = game.getFood();
    if (!game.isWon) { this.drawFood(food.getPosition()); }
    
    // Draw snake
    this.drawSnake(game);
  }

  private drawFood(pos: { x: number; y: number }): void {
    const x = pos.x * this.cellSize + this.cellSize / 2;
    const y = pos.y * this.cellSize + this.cellSize / 2;
    const radius = this.cellSize * 0.35;
    
    this.ctx.fillStyle = '#ff6b6b';
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Food glow
    this.ctx.fillStyle = 'rgba(255, 107, 107, 0.3)';
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawSnake(game: Game): void {
    const snake = game.getSnake();
    const body = snake.body;
    
    // Draw body
    for (let i = 0; i < body.length; i++) {
      const seg = body[i];
      const x = seg.x * this.cellSize;
      const y = seg.y * this.cellSize;
      
      // Body color gradient
      const alpha = 1 - (i / body.length) * 0.4;
      this.ctx.fillStyle = `rgba(0, 255, 136, ${alpha})`;
      
      const padding = 1;
      this.ctx.fillRect(
        x + padding,
        y + padding,
        this.cellSize - padding * 2,
        this.cellSize - padding * 2
      );
    }
    
    // Draw head with arrow
    const head = body[0];
    this.drawHead(head, snake.direction);
    
    // Draw tail marker
    const tail = body[body.length - 1];
    this.drawTail(tail);
  }

  private drawHead(pos: { x: number; y: number }, direction: { x: number; y: number }): void {
    const x = pos.x * this.cellSize + this.cellSize / 2;
    const y = pos.y * this.cellSize + this.cellSize / 2;
    const size = this.cellSize * 0.35;
    
    this.ctx.fillStyle = '#00ff88';
    this.ctx.beginPath();
    this.ctx.arc(x, y, size, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Draw arrow showing direction
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    
    const arrowLen = size * 0.8;
    const ax = x + direction.x * arrowLen;
    const ay = y + direction.y * arrowLen;
    
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(ax, ay);
    this.ctx.stroke();
  }

  private drawTail(pos: { x: number; y: number }): void {
    const x = pos.x * this.cellSize + this.cellSize / 2;
    const y = pos.y * this.cellSize + this.cellSize / 2;
    const size = this.cellSize * 0.25;
    
    this.ctx.fillStyle = '#ffcc00';
    this.ctx.beginPath();
    this.ctx.arc(x, y, size, 0, Math.PI * 2);
    this.ctx.fill();
  }
}
