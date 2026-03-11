import { Game } from './models/Game';
import { AIController } from './algorithms/AIController';
import { Renderer } from './renderer';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
let renderer: Renderer;

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
let gameEnded = false;
let loopId = 0;

// 初始化渲染器和画布
function initCanvas(): void {
  const gridSize = parseInt(mapSizeInput.value);
  // 增大单元格尺寸
  const cellSize = Math.max(30, Math.min(40, 800 / gridSize));
  const canvasSize = cellSize * gridSize;
  
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  
  if (!renderer) {
    renderer = new Renderer(canvas);
  }
  renderer.setCellSize(cellSize);
}

// 初始渲染（游戏未开始时显示网格和蛇）
function renderInitialState(): void {
  const gridSize = parseInt(mapSizeInput.value);
  
  if (!game) {
    initCanvas();
    game = new Game(canvas, gridSize, gridSize);
  }
  
  renderer.render(game);
  gameStatusEl.textContent = '未开始';
  scoreEl.textContent = '0';
  stepsEl.textContent = '0';
}

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
  
  initCanvas();
  renderInitialState();
}

function updateUI(): void {
  if (!game) return;
  try {
    const stats = game.getStats();
    if (game.isWon) {
      gameStatusEl.textContent = '满分! 吃满全图!';
    } else if (game.isOver) {
      gameStatusEl.textContent = '结束! 得分: ' + stats.score;
    } else {
      gameStatusEl.textContent = game.isRunning ? (isPaused ? '已暂停' : '进行中') : '未开始';
    }
    scoreEl.textContent = stats.score.toString();
    stepsEl.textContent = stats.steps.toString();
  } catch (e) {
    console.error('updateUI error:', e);
  }
}

async function startGame(): Promise<void> {
  const gridSize = parseInt(mapSizeInput.value);
  
  initCanvas();
  
  game = new Game(canvas, gridSize, gridSize);
  gameEnded = false;
  loopId++;
  
  if (isAI) {
    aiController = new AIController(gridSize, gridSize);
    try {
      await aiController.init(game.getSnake());
    } catch (e) {
      console.error('AI init failed:', e);
    }
  }
  
  game.start();
  gameRunning = true;
  updateUI();
  renderer.render(game);
  
  if (isAI) {
    gameLoopAI(loopId);
  } else {
    gameLoopHuman();
  }
}

// AI模式
async function gameLoopAI(currentLoopId: number): Promise<void> {
  try {
    if (currentLoopId !== loopId || !gameRunning || !game || isPaused || gameEnded) {
      return;
    }
    
    if (!game.isRunning || game.isOver) {
      await handleGameOver();
      return;
    }
    
    let direction = { x: 0, y: -1 };
    if (aiController) {
      try {
        direction = await aiController.getNextDirection(
          game.getSnake(),
          game.getFood(),
          game.getObstacles()
        );
      } catch (e) {
        console.error('getNextDirection error:', e);
      }
    }
    
    game.setDirection(direction);
    aiStatusEl.textContent = direction.x + ',' + direction.y;
    
    game.update();
    updateUI();
    renderer.render(game);
    
    if (!game.isRunning || game.isOver) {
      await handleGameOver();
      return;
    }
    
    const speed = parseInt(speedInput.value);
    const delay = Math.max(50, 500 - speed * 45);
    
    await new Promise(r => setTimeout(r, delay));
    
    if (currentLoopId !== loopId) {
      return;
    }
    
    await gameLoopAI(currentLoopId);
  } catch (e) {
    console.error('gameLoopAI error:', e);
    gameRunning = false;
  }
}

async function handleGameOver(): Promise<void> {
  if (gameEnded) return;
  gameEnded = true;
  gameRunning = false;
  loopId++;
  
  try {
    if (game.isWon) {
      gameStatusEl.textContent = '满分! 吃满全图!';
    } else {
      gameStatusEl.textContent = '结束! 得分: ' + game.getStats().score;
    }
    
    if (aiController) {
      const head = game.getSnake().getHead();
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 3000)
        );
        await Promise.race([
          aiController.gameOver(game.getStats().score, game.getStats().steps, 
            game.isWon ? 'won' : 'died', head.x, head.y),
          timeoutPromise
        ]);
      } catch (e) {
        console.error('GameOver API failed:', e);
      }
    }
  } catch (e) {
    console.error('handleGameOver error:', e);
  }
  
  renderer.render(game);
  startBtn.disabled = false;
  pauseBtn.disabled = true;
}

// 人类模式
let humanInterval: number | null = null;
function gameLoopHuman(): void {
  if (!gameRunning || isPaused || !game || gameEnded) return;
  
  if (!game.isRunning || game.isOver) {
    handleGameOverHuman();
    return;
  }
  
  game.update();
  updateUI();
  renderer.render(game);
  
  if (!game.isRunning || game.isOver) {
    handleGameOverHuman();
    return;
  }
  
  const speed = parseInt(speedInput.value);
  const delay = Math.max(50, 500 - speed * 45);
  humanInterval = window.setTimeout(gameLoopHuman, delay);
}

function handleGameOverHuman(): void {
  if (gameEnded) return;
  gameEnded = true;
  gameRunning = false;
  
  if (game.isWon) {
    gameStatusEl.textContent = '满分! 吃满全图!';
  } else {
    gameStatusEl.textContent = '结束! 得分: ' + game.getStats().score;
  }
  startBtn.disabled = false;
  pauseBtn.disabled = true;
}

function togglePause(): void {
  if (gameEnded || !gameRunning) return;
  isPaused = !isPaused;
  pauseBtn.textContent = isPaused ? '继续' : '暂停';
  
  if (!isPaused && gameRunning) {
    loopId++;
    if (isAI) {
      gameLoopAI(loopId);
    } else {
      gameLoopHuman();
    }
  }
}

function resetGame(): void {
  gameRunning = false;
  gameEnded = true;
  isPaused = false;
  loopId++;
  
  if (humanInterval) {
    clearTimeout(humanInterval);
    humanInterval = null;
  }
  
  // 重新初始化画布和游戏
  const gridSize = parseInt(mapSizeInput.value);
  initCanvas();
  game = new Game(canvas, gridSize, gridSize);
  renderer.render(game);
  
  gameStatusEl.textContent = '未开始';
  scoreEl.textContent = '0';
  stepsEl.textContent = '0';
  aiStatusEl.textContent = '-';
  
  pauseBtn.textContent = '暂停';
  pauseBtn.disabled = true;
  startBtn.disabled = false;
}

// 事件监听
mapSizeInput.addEventListener('input', () => {
  const size = parseInt(mapSizeInput.value);
  mapSizeDisplay.textContent = size + ' x ' + size;
  // 调整大小时重新渲染
  initCanvas();
  game = new Game(canvas, size, size);
  renderer.render(game);
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
  if (!game || isAI || gameEnded) return;
  
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
