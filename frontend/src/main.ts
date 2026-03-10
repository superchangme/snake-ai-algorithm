import { Game } from './models/Game';
import { AIController } from './algorithms/AIController';
import { Renderer } from './renderer';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const renderer = new Renderer(canvas);

const mapSizeInput = document.getElementById('map-size') as HTMLInputElement;
const mapSizeDisplay = document.getElementById('map-size-display')!;
const speedInput = document.getElementById('speed') as HTMLInputElement;
const speedDisplay = document.getElementById('speed-display')!;
const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
const pauseBtn = document.getElementById('pause-btn') as HTMLButtonElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
const humanModeBtn = document.getElementById('human-mode') as HTMLButtonElement;
const aiModeBtn = document.getElementById('ai-mode') as HTMLButtonElement;
const gameStatusEl = document.getElementById('game-status')!;
const scoreEl = document.getElementById('score')!;
const stepsEl = document.getElementById('steps')!;
const aiStatusEl = document.getElementById('ai-status')!;

let game: Game;
let aiController: AIController | null = null;
let isAI = true;
let isPaused = false;
let gameRunning = false;

// URL 参数初始化
function initFromURL(): void {
  const params = new URLSearchParams(window.location.search);
  const size = params.get('size');
  const algorithm = params.get('algorithm');
  
  if (size) {
    const gridSize = parseInt(size);
    if (gridSize >= 5 && gridSize <= 30) {
      mapSizeInput.value = size;
      mapSizeDisplay.textContent = `${gridSize} x ${gridSize}`;
    }
  }
  
  if (algorithm === 'api') {
    isAI = true;
    humanModeBtn.classList.remove('active');
    aiModeBtn.classList.add('active');
  }
}

function updateUI(): void {
  if (!game) return;
  const stats = game.getStats();
  gameStatusEl.textContent = game.isRunning ? (isPaused ? '已暂停' : '进行中') : (game.isOver ? '已结束' : '未开始');
  scoreEl.textContent = stats.score.toString();
  stepsEl.textContent = stats.steps.toString();
}

async function startGame(): Promise<void> {
  const gridSize = parseInt(mapSizeInput.value);
  const speed = parseInt(speedInput.value);
  
  // Set canvas size based on grid
  const maxCanvasSize = Math.min(window.innerWidth - 40, 600);
  canvas.width = maxCanvasSize;
  canvas.height = maxCanvasSize;
  renderer.setCellSize(maxCanvasSize / gridSize);
  
  game = new Game(canvas, gridSize, gridSize);
  
  if (isAI) {
    aiController = new AIController(gridSize, gridSize);
  }
  
  game.start();
  gameRunning = true;
  updateUI();
  renderer.render(game);
  
  if (isAI) {
    await gameLoopAI();
  } else {
    gameLoopHuman();
  }
}

// AI模式：严格等待API返回后再下一步
async function gameLoopAI(): Promise<void> {
  if (!gameRunning || !game || isPaused) return;
  
  if (!game.isRunning || game.isOver) {
    gameRunning = false;
    gameStatusEl.textContent = `结束! 得分: ${game.getStats().score}`;
    renderer.render(game);
    return;
  }
  
  if (aiController) {
    const direction = await aiController.getNextDirection(
      game.getSnake(),
      game.getFood(),
      game.getObstacles()
    );
    game.setDirection(direction);
    aiStatusEl.textContent = `${direction.x},${direction.y}`;
  }
  
  game.update();
  updateUI();
  renderer.render(game);
  
  if (gameRunning && !game.isOver) {
    const speed = parseInt(speedInput.value);
    const delay = Math.max(50, 500 - speed * 45);
    await new Promise(r => setTimeout(r, delay));
    await gameLoopAI();
  }
}

// 人类模式
let humanInterval: number | null = null;
function gameLoopHuman(): void {
  if (!gameRunning || isPaused || !game || game.isOver) return;
  
  game.update();
  updateUI();
  renderer.render(game);
  
  if (!game.isOver && gameRunning) {
    const speed = parseInt(speedInput.value);
    const delay = Math.max(50, 500 - speed * 45);
    humanInterval = window.setTimeout(gameLoopHuman, delay);
  } else {
    gameRunning = false;
    gameStatusEl.textContent = `结束! 得分: ${game.getStats().score}`;
  }
}

function togglePause(): void {
  isPaused = !isPaused;
  pauseBtn.textContent = isPaused ? '继续' : '暂停';
  if (!isPaused && gameRunning) {
    if (isAI) {
      gameLoopAI();
    } else {
      gameLoopHuman();
    }
  }
}

function resetGame(): void {
  gameRunning = false;
  if (humanInterval) {
    clearTimeout(humanInterval);
    humanInterval = null;
  }
  gameStatusEl.textContent = '未开始';
  scoreEl.textContent = '0';
  stepsEl.textContent = '0';
  aiStatusEl.textContent = '-';
  isPaused = false;
  pauseBtn.textContent = '暂停';
  pauseBtn.disabled = true;
  startBtn.disabled = false;
}

// 事件监听
mapSizeInput.addEventListener('input', () => {
  const size = parseInt(mapSizeInput.value);
  mapSizeDisplay.textContent = `${size} x ${size}`;
});

speedInput.addEventListener('input', () => {
  speedDisplay.textContent = speedInput.value;
});

startBtn.addEventListener('click', async () => {
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  await startGame();
});

pauseBtn.addEventListener('click', togglePause);
resetBtn.addEventListener('click', resetGame);

humanModeBtn.addEventListener('click', () => {
  isAI = false;
  humanModeBtn.classList.add('active');
  aiModeBtn.classList.remove('active');
  resetGame();
});

aiModeBtn.addEventListener('click', () => {
  isAI = true;
  aiModeBtn.classList.add('active');
  humanModeBtn.classList.remove('active');
  resetGame();
});

document.addEventListener('keydown', (e) => {
  if (!game || isAI) return;
  
  const keyMap: Record<string, [number, number]> = {
    'ArrowUp': [0, -1], 'ArrowDown': [0, 1],
    'ArrowLeft': [-1, 0], 'ArrowRight': [1, 0]
  };
  
  if (keyMap[e.key]) {
    const [dx, dy] = keyMap[e.key];
    game.setDirection({ x: dx, y: dy });
  }
  if (e.code === 'Space') {
    e.preventDefault();
    togglePause();
  }
});

initFromURL();
