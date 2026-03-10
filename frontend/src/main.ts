import { Game } from './models/Game';
import { Renderer } from './renderer';
import { createAIController, AIControllerBase } from './algorithms/AIControllerFactory';
import { logGameEnd } from './algorithms/AIController';
import { GameMode, GameStatus, Direction } from './types';

// DOM elements
const mapSizeInput = document.getElementById('map-size') as HTMLInputElement;
const mapSizeDisplay = document.getElementById('map-size-display') as HTMLSpanElement;
const speedInput = document.getElementById('speed') as HTMLInputElement;
const speedDisplay = document.getElementById('speed-display') as HTMLSpanElement;
const humanModeBtn = document.getElementById('human-mode') as HTMLButtonElement;
const aiModeBtn = document.getElementById('ai-mode') as HTMLButtonElement;
const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
const pauseBtn = document.getElementById('pause-btn') as HTMLButtonElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
const gameStatusEl = document.getElementById('game-status') as HTMLSpanElement;
const scoreEl = document.getElementById('score') as HTMLSpanElement;
const stepsEl = document.getElementById('steps') as HTMLSpanElement;
const aiStatusEl = document.getElementById('ai-status') as HTMLSpanElement;

let game: Game;
let renderer: Renderer;
let aiController: AIControllerBase;

function initGame(): void {
  const mapSize = parseInt(mapSizeInput.value) || 10;
  const speed = parseInt(speedInput.value) || 10;

  game = new Game({
    mapWidth: mapSize,
    mapHeight: mapSize,
    speed: speed,
    mode: aiModeBtn.classList.contains('active') ? GameMode.AI : GameMode.HUMAN
  });
  renderer = new Renderer('game-canvas');
  renderer.updateMapSize(mapSize, mapSize);
  aiController = createAIController(mapSize, mapSize, Direction.RIGHT);

  game.setCallbacks({
    onStatusChange: (status: GameStatus) => {
      gameStatusEl.textContent = getStatusText(status);
      // Log game end
      if (status === GameStatus.GAME_OVER || status === GameStatus.VICTORY) {
        const stats = game.getStats();
        const reason = status === GameStatus.VICTORY ? '满分胜利!' : '死亡';
        logGameEnd(stats.score, stats.steps, reason);
      }
      updateUI();
    },
    onStatsUpdate: (stats) => { scoreEl.textContent = stats.score.toString(); stepsEl.textContent = stats.steps.toString(); },
    onRender: () => renderGame(),
    onAIDecision: (decision) => { aiStatusEl.textContent = decision; },
    onBeforeUpdate: () => {
      // AI决策现在在每次游戏更新之前同步调用
      // 不再需要独立的AI循环
      if (game.getConfig().mode === GameMode.AI && game.getStatus() === GameStatus.PLAYING) {
        const stats = game.getStats();
        const snakeBody = game.getSnakeBody();
        const head = game.getSnakeHead();
        const food = game.getFoodPosition();
        
        // 打印坐标到控制台
        console.log(`[Step ${stats.steps}] Head=(${head.x},${head.y}) Food=(${food.x},${food.y}) BodyLen=${snakeBody.length}`);
        
        // 死循环检测: 如果500步没吃到食物,强制结束游戏
        if (aiController.checkDeadLoop(stats.score, stats.steps, snakeBody)) {
          game.gameOver('AI死循环');
          return;
        }
        
        const decision = aiController.getDecision(
          head,
          snakeBody,
          food
        );
        game.setAIDirection(decision.direction);
        aiController.updateDirection(decision.direction);
        aiStatusEl.textContent = `${decision.strategy} (${Math.round(decision.confidence * 100)}%)`;
      }
    }
  });

  renderGame();
  updateUI();
}

function renderGame(): void {
  const { score, steps } = game.getStats();
  renderer.render((x, y) => game.getCellType(x, y), score, steps, getStatusText(game.getStatus()));

  const status = game.getStatus();
  if (status === GameStatus.GAME_OVER || status === GameStatus.VICTORY) {
    renderer.renderGameOver(game.getStats().score, status === GameStatus.VICTORY);
  }
}

function getStatusText(status: GameStatus): string {
  switch (status) {
    case GameStatus.NOT_STARTED: return '未开始';
    case GameStatus.PLAYING: return '进行中';
    case GameStatus.PAUSED: return '已暂停';
    case GameStatus.GAME_OVER: return '游戏结束';
    case GameStatus.VICTORY: return '满分!';
    default: return '未知';
  }
}

function updateUI(): void {
  const status = game.getStatus();
  const isPlaying = status === GameStatus.PLAYING;
  const isPaused = status === GameStatus.PAUSED;
  startBtn.disabled = isPlaying;
  pauseBtn.disabled = !isPlaying && !isPaused;
  pauseBtn.textContent = isPaused ? '继续' : '暂停';
  mapSizeInput.disabled = isPlaying;
  humanModeBtn.disabled = isPlaying;
  aiModeBtn.disabled = isPlaying;
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.code === 'Space') { event.preventDefault(); game.togglePause(); return; }
  if (game.getConfig().mode === GameMode.HUMAN && game.getStatus() === GameStatus.PLAYING) {
    let direction: Direction | null = null;
    switch (event.code) {
      case 'ArrowUp': case 'KeyW': direction = Direction.UP; break;
      case 'ArrowDown': case 'KeyS': direction = Direction.DOWN; break;
      case 'ArrowLeft': case 'KeyA': direction = Direction.LEFT; break;
      case 'ArrowRight': case 'KeyD': direction = Direction.RIGHT; break;
    }
    if (direction !== null) { event.preventDefault(); game.setSnakeDirection(direction); }
  }
}

mapSizeInput.addEventListener('input', () => {
  const size = Math.max(10, Math.min(20, parseInt(mapSizeInput.value) || 10));
  mapSizeInput.value = size.toString();
  mapSizeDisplay.textContent = `${size} x ${size}`;
  initGame();
});

speedInput.addEventListener('input', () => {
  const speed = Math.max(1, Math.min(10, parseInt(speedInput.value) || 5));
  speedInput.value = speed.toString();
  speedDisplay.textContent = speed.toString();
  game.setSpeed(speed);
});

humanModeBtn.addEventListener('click', () => {
  if (game.getStatus() !== GameStatus.PLAYING) {
    humanModeBtn.classList.add('active');
    aiModeBtn.classList.remove('active');
    game.setMode(GameMode.HUMAN);
    aiStatusEl.textContent = '-';
    // 重置AI控制器方向
    aiController = createAIController(game.getMapSize().width, game.getMapSize().height, Direction.RIGHT);
  }
});

aiModeBtn.addEventListener('click', () => {
  if (game.getStatus() !== GameStatus.PLAYING) {
    aiModeBtn.classList.add('active');
    humanModeBtn.classList.remove('active');
    game.setMode(GameMode.AI);
    aiStatusEl.textContent = '就绪';
    // 重置AI控制器方向
    aiController = createAIController(game.getMapSize().width, game.getMapSize().height, Direction.RIGHT);
  }
});

startBtn.addEventListener('click', () => game.start());
pauseBtn.addEventListener('click', () => game.togglePause());
resetBtn.addEventListener('click', () => { aiController.reset(); game.reset(); aiStatusEl.textContent = '-'; });
document.addEventListener('keydown', handleKeydown);

document.addEventListener('DOMContentLoaded', initGame);
if (document.readyState === 'complete' || document.readyState === 'interactive') initGame();

console.log('贪吃蛇游戏已启动!');
