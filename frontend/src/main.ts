import { Game } from './models/Game';
import { AIController } from './algorithms/AIController';
import { Renderer } from './renderer';

// Re-enable all setting buttons
function reenableSettingButtons(): void {
  sizeDecBtn.disabled = false;
  sizeIncBtn.disabled = false;
  speedDecBtn.disabled = false;
  speedIncBtn.disabled = false;
  humanModeBtn.disabled = false;
  aiModeBtn.disabled = false;
  httpModeBtn.disabled = false;
  wsModeBtn.disabled = false;
}



const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
let renderer: Renderer;

const mapSizeInput = document.getElementById('map-size') as HTMLInputElement;
const sizeDecBtn = document.getElementById('size-dec') as HTMLButtonElement;
const sizeIncBtn = document.getElementById('size-inc') as HTMLButtonElement;
const mapSizeDisplay = document.getElementById('map-size-display')!;
const summaryMap = document.getElementById('summary-map');

// 地图尺寸 +/- 按钮
let currentSize = 10;
sizeDecBtn.addEventListener('click', () => {
  if (currentSize > 5) {
    currentSize--;
    mapSizeDisplay.textContent = String(currentSize);
    mapSizeInput.value = String(currentSize);
    if (summaryMap) summaryMap.textContent = currentSize + '×' + currentSize;
    resetGame();
  }
});
sizeIncBtn.addEventListener('click', () => {
  if (currentSize < 30) {
    currentSize++;
    mapSizeDisplay.textContent = String(currentSize);
    mapSizeInput.value = String(currentSize);
    if (summaryMap) summaryMap.textContent = currentSize + '×' + currentSize;
    resetGame();
  }
});
const speedInput = document.getElementById('speed') as HTMLInputElement;
const speedDisplay = document.getElementById('speed-display')!;
const speedDecBtn = document.getElementById('speed-dec') as HTMLButtonElement;
const speedIncBtn = document.getElementById('speed-inc') as HTMLButtonElement;
let currentSpeed = 3;

// 速度 +/- 按钮事件
speedDecBtn.addEventListener('click', () => { this.disabled = true;
  if (currentSpeed > 1) {
    currentSpeed--;
    speedDisplay.textContent = String(currentSpeed);
    speedInput.value = String(currentSpeed);
    const summarySpeed = document.getElementById('summary-speed');
    if (summarySpeed) summarySpeed.textContent = '速度' + currentSpeed;
  }

});
speedIncBtn.addEventListener('click', () => { this.disabled = true;
  if (currentSpeed < 10) {
    currentSpeed++;
    speedDisplay.textContent = String(currentSpeed);
    speedInput.value = String(currentSpeed);
    const summarySpeed = document.getElementById('summary-speed');
    if (summarySpeed) summarySpeed.textContent = '速度' + currentSpeed;
  }

});

const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
const pauseBtn = document.getElementById('pause-btn') as HTMLButtonElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
const humanModeBtn = document.getElementById('human-mode') as HTMLButtonElement;
const httpModeBtn = document.getElementById('http-mode') as HTMLButtonElement;
const wsModeBtn = document.getElementById('ws-mode') as HTMLButtonElement;
const aiModeBtn = document.getElementById('ai-mode') as HTMLButtonElement;
const gameStatusEl = document.getElementById('game-status')!;
const scoreEl = document.getElementById('score')!;
const stepsEl = document.getElementById('steps')!;
const connectionModeGroup = document.getElementById('connection-mode-group');

// 根据 URL 参数初始化连接模式按钮状态
const urlParams = new URLSearchParams(window.location.search);
const modeParam = urlParams.get('mode');

if (modeParam === 'ws') {
  wsModeBtn.classList.add('active');
  httpModeBtn.classList.remove('active');
} else {
  httpModeBtn.classList.add('active');
  wsModeBtn.classList.remove('active');
}

// 更新顶部显示
const summaryMode = document.getElementById('summary-mode') as HTMLSpanElement;
const summarySpeed = document.getElementById('summary-speed') as HTMLSpanElement;
const summaryDir = document.getElementById('summary-dir') as HTMLSpanElement;
if (summaryMode) {
  summaryMode.textContent = '人类';
}
if (summarySpeed) {
  summarySpeed.textContent = '速度' + speedInput.value;
  summarySpeed.style.display = 'inline';
}

const aiStatusEl = document.getElementById('ai-status')!;

let game: Game;
let aiController: AIController | null = null;
let isAI = false;
let isPaused = false;
let waitingForFirstInput = false;
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
      currentSize = gridSize;
      mapSizeInput.value = size;
      mapSizeDisplay.textContent = `${gridSize}`;
      if (summaryMap) summaryMap.textContent = gridSize + '×' + gridSize;
    }
  }

  
  if (algorithm === 'api') {
    isAI = true;
  if (aiController) {
    wsModeBtn.classList.contains('active') ? aiController.setMode('ws') : aiController.setMode('http');
  }

    humanModeBtn.classList.remove('active');
    aiModeBtn.classList.add('active');
  }

  
  // 处理 ai 参数
  const aiParam = params.get('ai') === 'true';
  if (aiParam) {
    isAI = true;
    aiModeBtn.classList.add('active');
    humanModeBtn.classList.remove('active');
    const summaryMode = document.getElementById('summary-mode');
    if (summaryMode) summaryMode.textContent = 'AI';
    // 启用连接模式
    httpModeBtn.disabled = false;
    wsModeBtn.disabled = false;
    httpModeBtn.style.opacity = '1';
    wsModeBtn.style.opacity = '1';
    // 隐藏速度控制
    const speedGroup = document.querySelector('.speed-group');
    if (speedGroup) speedGroup.style.setProperty('display', 'none', 'important');
    const summarySpeed = document.getElementById('summary-speed');
    if (summarySpeed) summarySpeed.style.display = 'none';
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
  
  if (!aiController) {
    aiController = new AIController(gridSize, gridSize);
  }

  if (isAI && aiController) {
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
    // 设置初始向下移动
    const initDir = { x: 0, y: 1 };
    game.setDirection(initDir);
    updateDirectionDisplay(initDir);
    gameLoopHuman();
  }

}

// AI模式
// 更新方向显示
function updateDirectionDisplay(dir: { x: number; y: number }) {
  const dirNames: Record<string, string> = {
    '0,-1': '↑', '0,1': '↓', '-1,0': '←', '1,0': '→'
  };
  const dirKey = dir.x + ',' + dir.y;
  const dirName = dirNames[dirKey] || '?';
  if (summaryDir) summaryDir.textContent = dirName;
}


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
          game.getGridSize().width, game.getGridSize().height
        );
        
        // 高亮AI当前方向对应的按钮
        const dirBtnMap: Record<string, string> = {
          '0,-1': 'dpad-up', '0,1': 'dpad-down', '-1,0': 'dpad-left', '1,0': 'dpad-right'
        };
        const dirNameMap: Record<string, string> = {
          '0,-1': '↑ 上', '0,1': '↓ 下', '-1,0': '← 左', '1,0': '→ 右'
        };
        const dirKey = direction.x + ',' + direction.y;
        const dirName = dirNameMap[dirKey] || '?';
        document.querySelectorAll('.dpad-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.querySelector('.' + dirBtnMap[dirKey]);
        if (activeBtn) {
          activeBtn.classList.add('active');
          updateDirectionDisplay(direction);
        }
      } catch (e) {
        console.error('getNextDirection error:', e);
      }
    }
    
    game.setDirection(direction);
    // 显示人类可读的方向
    const dirNames: Record<string, string> = {
      '0,-1': '上', '0,1': '下', '-1,0': '左', '1,0': '右'
    };
    const dirKey = direction.x + ',' + direction.y;
    aiStatusEl.textContent = dirNames[dirKey] || dirKey;
    
    game.update();
    updateUI();
    renderer.render(game);
    
    if (!game.isRunning || game.isOver) {
      await handleGameOver();
      return;
    }
    
    const speed = parseInt(speedInput.value);
    
    if (currentLoopId !== loopId) {
      return;
    }
    
    await gameLoopAI(currentLoopId);
  } catch (e) {
    console.error('gameLoopAI error:', e);
    gameRunning = false;
  reenableSettingButtons();
  }

}

async function handleGameOver(): Promise<void> {
  if (gameEnded) return;
  gameEnded = true;
  gameRunning = false;
  reenableSettingButtons();
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
  startBtn.textContent = '开始';
  pauseBtn.disabled = true;
  pauseBtn.textContent = '暂停';
  setControlsEnabled(true);
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
  const delay = Math.max(50, 500 - speed * 45);  // Speed 1=455ms, 5=275ms, 10=50ms
  humanInterval = window.setTimeout(gameLoopHuman, delay);
}

function handleGameOverHuman(): void {
  if (gameEnded) return;
  gameEnded = true;
  gameRunning = false;
  reenableSettingButtons();
  
  const stats = game.getStats();
  if (game.isWon) {
    gameStatusEl.textContent = '满分! 吃满全图!';
  } else {
    gameStatusEl.textContent = '结束! 得分: ' + stats.score;
  }

  // Save to localStorage for human mode
  if (!isAI) {
    const nameInput = document.getElementById('history-name') as HTMLInputElement;
    const playerName = nameInput?.value?.trim() || '';
    saveGameHistory(stats.score, stats.steps, currentSize, playerName);
  }

  startBtn.disabled = false;
  startBtn.textContent = '开始';
  pauseBtn.disabled = true;
  pauseBtn.textContent = '暂停';
  setControlsEnabled(true);
}

function togglePause(): void {
  if (gameEnded || !gameRunning) return;
  isPaused = !isPaused;
  pauseBtn.textContent = isPaused ? '继续' : '暂停';
  setControlsEnabled(false);  // 游戏进行中或暂停时都禁用设置
  
  if (!isPaused && gameRunning) {
    loopId++;
    if (isAI) {
      gameLoopAI(loopId);
    } else {
      gameLoopHuman();
    }
  }

}

// 设置控件组（用于游戏进行中禁用）
const settingsControls = [
  sizeDecBtn, sizeIncBtn,
  speedDecBtn, speedIncBtn,
  humanModeBtn, aiModeBtn,
  httpModeBtn, wsModeBtn
];

function setControlsEnabled(enabled: boolean): void {
  const opacity = enabled ? '1' : '0.5';
  const pointerEvents = enabled ? 'auto' : 'none';
  
  settingsControls.forEach(btn => {
    (btn as HTMLElement).style.opacity = opacity;
    (btn as HTMLElement).style.pointerEvents = pointerEvents;
  });
}

function resetGame(): void {
  gameRunning = false;
  reenableSettingButtons();
  gameEnded = true;
  isPaused = false;
  loopId++;
  
  // 恢复按钮文字
  startBtn.disabled = false;
  startBtn.textContent = '开始';
  pauseBtn.disabled = true;
  pauseBtn.textContent = '暂停';
  
  // 恢复设置控件
  setControlsEnabled(true);
  
  if (humanInterval) {
    clearTimeout(humanInterval);
    humanInterval = null;
  }

  
  // 重新初始化画布和游戏
  const gridSize = parseInt(mapSizeInput.value);
  initCanvas();
  game = new Game(canvas, gridSize, gridSize);
  // 更新 AI controller 的尺寸
  if (aiController) {
    aiController.setSize(gridSize, gridSize);
  }  renderer.render(game);
  
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
  // 更新顶部显示
  const summarySpeed = document.getElementById('summary-speed');
  if (summarySpeed) {
    summarySpeed.textContent = '速度' + speedInput.value;
  }

});

startBtn.addEventListener('click', async () => {
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  setControlsEnabled(false);
  await startGame();
});

pauseBtn.addEventListener('click', togglePause);
resetBtn.addEventListener('click', resetGame);

// 设置面板折叠/展开
const settingsToggle = document.getElementById('settings-toggle') as HTMLButtonElement;
const controlPanel = document.getElementById('control-panel') as HTMLDivElement;
settingsToggle.addEventListener('click', () => {
  controlPanel.classList.toggle('expanded');
});

humanModeBtn.addEventListener('click', () => { this.disabled = true;
  isAI = false;
  // 显示速度控制
  const speedGroup = document.querySelector('.speed-group');
  if (speedGroup) (speedGroup as HTMLElement).style.display = 'flex';
  // 显示顶部速度
  const summarySpeed = document.getElementById('summary-speed');
  if (summarySpeed) summarySpeed.style.display = 'inline';
  humanModeBtn.classList.add('active');
  // 隐藏连接模式按钮
  if (connectionModeGroup) connectionModeGroup.style.display = 'none';
  aiModeBtn.classList.remove('active');
  const summaryMode = document.getElementById('summary-mode');
  if (summaryMode) summaryMode.textContent = '人类';
  resetGame();
});

httpModeBtn.addEventListener('click', () => { this.disabled = true;
  if (aiController) {
    aiController.setMode('http');
  }

  httpModeBtn.classList.add('active');
  wsModeBtn.classList.remove('active');
  // Update URL without refresh
  const url = new URL(window.location.href);
  url.searchParams.set('mode', 'http');
  window.history.replaceState({}, '', url);
  resetGame();
});

wsModeBtn.addEventListener('click', () => { this.disabled = true;
  if (aiController) {
    aiController.setMode('ws');
  }

  wsModeBtn.classList.add('active');
  httpModeBtn.classList.remove('active');
  // Update URL without refresh
  const url = new URL(window.location.href);
  url.searchParams.set('mode', 'ws');
  window.history.replaceState({}, '', url);
  resetGame();
});

aiModeBtn.addEventListener('click', () => { this.disabled = true;
  isAI = true;
  // 隐藏速度控制（使用 class 选择）
  const speedGroup = document.querySelector('.speed-group');
  if (speedGroup) speedGroup.style.setProperty('display', 'none', 'important');
  // 隐藏顶部速度显示
  const summarySpeed = document.getElementById('summary-speed');
  if (summarySpeed) summarySpeed.style.display = 'none';
  const summaryMode = document.getElementById('summary-mode');
  if (summaryMode) summaryMode.textContent = 'AI';
  if (aiController) {
    wsModeBtn.classList.contains('active') ? aiController.setMode('ws') : aiController.setMode('http');
  }

  aiModeBtn.classList.add('active');
  // 显示连接模式按钮
  if (connectionModeGroup) connectionModeGroup.style.display = 'flex';
  humanModeBtn.classList.remove('active');
  resetGame();
});

document.addEventListener('keydown', (e) => {
  if (!game || isAI || gameEnded) return;
  
  const keyMap: Record<string, [number, number]> = {
    'ArrowUp': [0, -1], 'KeyW': [0, -1], 'KeyS': [0, 1], 'KeyA': [-1, 0], 'KeyD': [1, 0], 'ArrowDown': [0, 1],
    'ArrowLeft': [-1, 0], 'ArrowRight': [1, 0]
  };
  
  if (keyMap[e.key] || keyMap[e.code]) {
    const [dx, dy] = keyMap[e.key] || keyMap[e.code];
    const newDir = { x: dx, y: dy };
    game.setDirection(newDir);
    updateDirectionDisplay(newDir);
  }

  if (e.code === 'Space') {
    e.preventDefault();
    togglePause();
  }

});

// 移动端开始按钮
const startBtnMobile = document.getElementById('start-btn-mobile') as HTMLButtonElement;
startBtnMobile.addEventListener('click', async () => {
  startBtnMobile.style.display = 'none';
  const pauseBtnMobile = document.getElementById('pause-btn-mobile') as HTMLButtonElement;
  pauseBtnMobile.style.display = 'block';
  await startGame();
});

// 移动端暂停按钮
const pauseBtnMobile = document.getElementById('pause-btn-mobile') as HTMLButtonElement;
pauseBtnMobile.addEventListener('click', () => {
  togglePause();
  if (isPaused) {
    pauseBtnMobile.textContent = '▶';
  } else {
    pauseBtnMobile.textContent = '⏸';
  }

});

// 移动端重置按钮
const resetBtnMobile = document.getElementById('reset-btn-mobile') as HTMLButtonElement;
resetBtnMobile.addEventListener('click', () => {
  resetGame();
  const startBtnMobile = document.getElementById('start-btn-mobile') as HTMLButtonElement;
  startBtnMobile.style.display = 'block';
  const pauseBtnMobile = document.getElementById('pause-btn-mobile') as HTMLButtonElement;
  pauseBtnMobile.style.display = 'none';
});

// 移动端游戏手柄按钮事件
document.querySelectorAll('.dpad-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    if (!game || isAI || gameEnded) return;
    
    const dir = (e.target as HTMLElement).dataset.dir;
    const dirMap: Record<string, [number, number]> = {
      'up': [0, -1], 'down': [0, 1], 'left': [-1, 0], 'right': [1, 0]
    };
    
    if (dir && dirMap[dir]) {
      const [dx, dy] = dirMap[dir];
      const newDir = { x: dx, y: dy };
      game.setDirection(newDir);
      updateDirectionDisplay(newDir);
    }
  });
});

// Initialize name from localStorage
const initNameInput = () => {

  const nameInput = document.getElementById('history-name');
  const summaryName = document.getElementById('summary-name');

  const savedName = localStorage.getItem(NAME_KEY);
  const nameDialog = document.getElementById('name-dialog');
  


  
  if (savedName) {
    if (nameInput) (nameInput as HTMLInputElement).value = savedName;
    if (summaryName) {
      summaryName.textContent = '👤 ' + savedName;
      (summaryName as HTMLElement).style.display = 'inline';
    }
  } else if (nameDialog) {
    // No name - show required dialog
  
    nameDialog.classList.add('show');
    
    // Get elements inside dialog
    const requiredNameInput = document.getElementById('required-name');
    const nameConfirm = document.getElementById('name-confirm');
    
    if (requiredNameInput && nameConfirm) {
      const closeNameDialog = () => {
        const name = (requiredNameInput as HTMLInputElement).value.trim();
      
        if (name) {
          localStorage.setItem(NAME_KEY, name);
          if (nameInput) (nameInput as HTMLInputElement).value = name;
          if (summaryName) {
            summaryName.textContent = '👤 ' + name;
            (summaryName as HTMLElement).style.display = 'inline';
          }
          nameDialog.classList.remove('show');
        }
      };
      
      nameConfirm.addEventListener('click', closeNameDialog);
      requiredNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') closeNameDialog();
      });
    }
  }
  
  // Make name clickable to edit
  if (summaryName) {
    summaryName.addEventListener('click', () => {
      if (summaryName.isContentEditable) return;
      
      const currentName = localStorage.getItem(NAME_KEY) || '';
      summaryName.textContent = '';
      summaryName.contentEditable = 'true';
      summaryName.style.background = 'rgba(0, 255, 136, 0.3)';
      summaryName.style.padding = '2px 8px';
      summaryName.focus();
      
      // Select all text
      document.execCommand('selectAll', false);
      
      const saveName = () => {
        const newName = summaryName.textContent?.replace('👤 ', '').trim() || '';
        summaryName.contentEditable = 'false';
        summaryName.style.background = newName ? '' : 'transparent';
        localStorage.setItem(NAME_KEY, newName);
        summaryName.textContent = newName ? '👤 ' + newName : '';
        summaryName.style.display = newName ? 'inline' : 'none';
        
        if (nameInput) nameInput.value = newName;
      };
      
      summaryName.addEventListener('blur', saveName);
      summaryName.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          summaryName.blur();
        }
      });
    });
  }
};
initNameInput();

initFromURL();

// 根据初始模式显示/隐藏连接模式按钮
if (humanModeBtn.classList.contains('active')) {
  if (connectionModeGroup) connectionModeGroup.style.display = 'none';
} else if (aiModeBtn.classList.contains('active')) {
  if (connectionModeGroup) connectionModeGroup.style.display = 'flex';
}


// ========== History Functions ==========
const HISTORY_KEY = 'snake_game_history';
const NAME_KEY = 'snake_player_name';

interface HistoryItem {
  time: string;
  name?: string;
  size: number;
  score: number;
  steps: number;
}

function saveGameHistory(score: number, steps: number, size: number, name?: string): void {
  const history = getGameHistory();
  const now = new Date();
  const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  
  history.unshift({
    time: timeStr,
    name: name || '',
    size,
    score,
    steps
  });
  
  // Keep only last 50 records
  if (history.length > 50) {
    history.pop();
  }
  
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function getGameHistory(): HistoryItem[] {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// Fake leaderboard data (will connect to backend later)
function getLeaderboard(): Array<HistoryItem & { rank: number }> {
  const fakeData = [
    { rank: 1, name: '小明', size: 10, score: 97, steps: 500 },
    { rank: 2, name: '大神', size: 10, score: 95, steps: 480 },
    { rank: 3, name: '蛇王', size: 10, score: 90, steps: 450 },
    { rank: 4, name: '高手', size: 10, score: 85, steps: 420 },
    { rank: 5, name: '玩家1', size: 10, score: 80, steps: 400 },
    { rank: 6, name: '玩家2', size: 10, score: 75, steps: 380 },
    { rank: 7, name: '玩家3', size: 10, score: 70, steps: 350 },
    { rank: 8, name: '玩家4', size: 10, score: 65, steps: 320 },
  ];
  
  // Add current user's score if exists
  const userHistory = getGameHistory();
  if (userHistory.length > 0) {
    const bestScore = Math.max(...userHistory.map(h => h.score));
    const best = userHistory.find(h => h.score === bestScore);
    if (best) {
      const playerName = localStorage.getItem(NAME_KEY) || '你';
      fakeData.push({
        rank: 0, // Will be calculated
        name: playerName,
        size: best.size,
        score: bestScore,
        steps: best.steps
      });
    }
  }
  
  // Sort by score and calculate ranks
  fakeData.sort((a, b) => b.score - a.score);
  return fakeData.map((item, index) => ({ ...item, rank: index + 1 }));
}

function renderHistory(): void {
  const historyList = document.getElementById('history-list');
  if (!historyList) return;
  
  const history = getGameHistory();
  
  if (history.length === 0) {
    historyList.innerHTML = '<div class="history-empty">暂无游戏记录</div>';
    return;
  }
  
  historyList.innerHTML = history.map(item => `
    <div class="history-item">
      <div class="history-item-info">
        <span class="history-item-time">${item.time} · ${item.size}×${item.size}}</span>
        <span class="history-item-steps">步数: ${item.steps}</span>
      </div>
      <span class="history-item-score">${item.score}</span>
    </div>
  `).join('');
}

function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
}

// History dialog handlers
const historyBtn = document.getElementById('history-btn');
const historyDialog = document.getElementById('history-dialog');
const historyClose = document.getElementById('history-close');
const historyClear = document.getElementById('history-clear');

if (historyBtn && historyDialog) {
  historyBtn.addEventListener('click', () => {
    renderHistory();
    // Load saved name
    const nameInput = document.getElementById('history-name') as HTMLInputElement;
    if (nameInput) {
      nameInput.value = localStorage.getItem(NAME_KEY) || '';
    }
    historyDialog.classList.add('show');
  });
}

// Save name when changed
const nameInput = document.getElementById('history-name') as HTMLInputElement;
if (nameInput) {
  nameInput.addEventListener('change', () => {
    const name = nameInput.value.trim();
    localStorage.setItem(NAME_KEY, name);
    const summaryName = document.getElementById('summary-name');
    if (summaryName) {
      summaryName.textContent = name ? '👤 ' + name : '';
      summaryName.style.display = name ? 'inline' : 'none';
    }
  });
}

if (historyClose && historyDialog) {
  historyClose.addEventListener('click', () => {
    historyDialog.classList.remove('show');
  });
}

if (historyDialog) {
  historyDialog.addEventListener('click', (e) => {
    if (e.target === historyDialog) {
      historyDialog.classList.remove('show');
    }
  });
}

if (historyClear) {
  historyClear.addEventListener('click', () => {
    if (confirm('确定要清空所有游戏记录吗？')) {
      clearHistory();
    }
  });
}
