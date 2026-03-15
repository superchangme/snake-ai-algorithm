import { Game } from './models/Game';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private cellSize: number;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.cellSize = 20;
  }
  
  private foodPulse = 0;

  setCellSize(size: number): void {
    this.cellSize = size;
  }

  render(game: Game): void {
    const { width, height } = game.getGridSize();
    this.cellSize = this.canvas.width / width;
    
    // Background - exactly grid size
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
    
    // Pulse animation
    this.foodPulse += 0.1;
    const pulse = Math.sin(this.foodPulse) * 0.2 + 0.8;
    
    // Outer glow (pulsing)
    this.ctx.shadowColor = '#ff3366';
    this.ctx.shadowBlur = 20 * pulse;
    
    // Main food body
    this.ctx.fillStyle = '#ff3366';
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Inner highlight
    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = '#ff6688';
    this.ctx.beginPath();
    this.ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
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
    this.drawTail(tail, body.length > 1 ? body[body.length - 2] : undefined);
  }

  private drawHead(pos: { x: number; y: number }, direction: { x: number; y: number }): void {
    const cx = pos.x * this.cellSize + this.cellSize / 2;
    const cy = pos.y * this.cellSize + this.cellSize / 2;
    const size = this.cellSize * 0.4;
    
    // Glow effect
    this.ctx.shadowColor = '#00ff88';
    this.ctx.shadowBlur = 15;
    
    // Head body - rounded rect
    this.ctx.fillStyle = '#00ff88';
    const padding = this.cellSize * 0.1;
    this.roundRect(cx - size + padding, cy - size + padding, (size - padding) * 2, (size - padding) * 2, 4);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
    
    // Eyes based on direction
    this.ctx.fillStyle = '#0a0a0f';
    const eyeSize = this.cellSize * 0.12;
    const eyeOffset = this.cellSize * 0.15;
    
    if (direction.x !== 0) {
      // Moving horizontally - eyes on left/right
      const eyeY = cy - eyeOffset;
      const eyeY2 = cy + eyeOffset;
      const eyeX = direction.x > 0 ? cx + size * 0.3 : cx - size * 0.3;
      this.ctx.beginPath();
      this.ctx.arc(eyeX, eyeY, eyeSize, 0, Math.PI * 2);
      this.ctx.arc(eyeX, eyeY2, eyeSize, 0, Math.PI * 2);
      this.ctx.fill();
    } else {
      // Moving vertically - eyes on top/bottom
      const eyeX = cx - eyeOffset;
      const eyeX2 = cx + eyeOffset;
      const eyeY = direction.y > 0 ? cy + size * 0.3 : cy - size * 0.3;
      this.ctx.beginPath();
      this.ctx.arc(eyeX, eyeY, eyeSize, 0, Math.PI * 2);
      this.ctx.arc(eyeX2, eyeY, eyeSize, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }
  
  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
  }

  private drawTail(pos: { x: number; y: number }, prevPos?: { x: number; y: number }): void {
    const cx = pos.x * this.cellSize + this.cellSize / 2;
    const cy = pos.y * this.cellSize + this.cellSize / 2;
    
    // Tail gradient - smaller and fading
    const gradient = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, this.cellSize * 0.3);
    gradient.addColorStop(0, 'rgba(0, 255, 136, 0.8)');
    gradient.addColorStop(0.5, 'rgba(0, 200, 100, 0.5)');
    gradient.addColorStop(1, 'rgba(0, 150, 80, 0.2)');
    
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, this.cellSize * 0.3, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Tail tip - small bright dot
    this.ctx.fillStyle = '#00ff88';
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, this.cellSize * 0.12, 0, Math.PI * 2);
    this.ctx.fill();
  }
}
