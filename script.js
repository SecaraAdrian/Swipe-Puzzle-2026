/* -----------------------------------------------------------
   STATE
----------------------------------------------------------- */
const state = {
  gridSize: 4,
  board: [],
  level: 1,
  moves: 0,
  seconds: 0,
  timerId: null,
  isPlaying: false,
  soundsEnabled: true,
  hasSave: false,
};

/* -----------------------------------------------------------
   DOM ELEMENTS
----------------------------------------------------------- */
const boardEl = document.getElementById('board');
const levelDisplay = document.getElementById('levelDisplay');
const movesDisplay = document.getElementById('movesDisplay');
const timeDisplay = document.getElementById('timeDisplay');

const shuffleBtn = document.getElementById('shuffleBtn');

const startOverlay = document.getElementById('startOverlay');
const startGameBtn = document.getElementById('startGameBtn');
const toggleSoundBtn = document.getElementById('toggleSoundBtn');

const levelOverlay = document.getElementById('levelOverlay');
const overlayStats = document.getElementById('overlayStats');
const nextLevelBtn = document.getElementById('nextLevelBtn');

const toggleHowToBtn = document.getElementById('toggleHowToBtn');
const howToContent = document.getElementById('howToContent');

const difficultyRadios = document.querySelectorAll("input[name='difficulty']");

/* -----------------------------------------------------------
   AUDIO
----------------------------------------------------------- */
const soundMove = new Audio('sounds/move.mp3');
const soundWrong = new Audio('sounds/wrong.mp3');
const soundWin = new Audio('sounds/win.mp3');
const soundStart = new Audio('sounds/start.mp3');

function playSound(s) {
  if (!state.soundsEnabled) return;
  try {
    s.currentTime = 0;
    s.play();
  } catch {}
}

/* -----------------------------------------------------------
   SAVE / LOAD
----------------------------------------------------------- */
function saveProgress() {
  const data = {
    gridSize: state.gridSize,
    level: state.level,
    moves: state.moves,
    seconds: state.seconds,
    board: state.board,
    soundsEnabled: state.soundsEnabled,
  };

  localStorage.setItem('swipeSave', JSON.stringify(data));
}

function loadProgress() {
  const raw = localStorage.getItem('swipeSave');
  if (!raw) return false;

  try {
    const s = JSON.parse(raw);

    // VALIDATION
    if (![3, 4, 5].includes(s.gridSize)) return false;
    if (!Array.isArray(s.board)) return false;
    if (s.board.length !== s.gridSize * s.gridSize) return false;
    if (typeof s.level !== 'number' || s.level < 1) return false;
    if (typeof s.moves !== 'number') return false;
    if (typeof s.seconds !== 'number') return false;

    // LOAD
    state.gridSize = s.gridSize;
    state.level = s.level;
    state.moves = s.moves;
    state.seconds = s.seconds;
    state.board = s.board;
    state.soundsEnabled = s.soundsEnabled ?? true;
    state.hasSave = true;

    return true;
  } catch {
    return false;
  }
}

/* -----------------------------------------------------------
   CHECK REAL PROGRESS
----------------------------------------------------------- */
function hasRealProgress() {
  if (!state.hasSave) return false;

  // Dacă puzzle-ul este exact în stare inițială: 1,2,3..,0 → NU e progres
  if (isSolved(state.board) && state.level === 1 && state.moves === 0) {
    return false;
  }

  // Dacă nu sunt mutări și nici timp → NU e progres real
  if (state.moves === 0 && state.seconds === 0 && state.level === 1) {
    return false;
  }

  return true;
}

/* -----------------------------------------------------------
   PUZZLE UTILITIES
----------------------------------------------------------- */
function setCSSGridSize(n) {
  document.documentElement.style.setProperty('--grid-size', n);
}

function createOrderedBoard(n) {
  const arr = [];
  for (let i = 1; i < n * n; i++) arr.push(i);
  arr.push(0);
  return arr;
}

function getAdjacentIndices(idx, size) {
  const r = Math.floor(idx / size);
  const c = idx % size;
  const a = [];

  if (r > 0) a.push(idx - size);
  if (r < size - 1) a.push(idx + size);
  if (c > 0) a.push(idx - 1);
  if (c < size - 1) a.push(idx + 1);

  return a;
}

function generateSolvableBoard(size) {
  const b = createOrderedBoard(size);
  const moves = Math.min(3 + state.level, 28);
  let z = b.indexOf(0);

  for (let i = 0; i < moves; i++) {
    const neigh = getAdjacentIndices(z, size);
    const pick = neigh[Math.floor(Math.random() * neigh.length)];
    [b[z], b[pick]] = [b[pick], b[z]];
    z = pick;
  }

  return b;
}

function isSolved(b = state.board) {
  for (let i = 0; i < b.length - 1; i++) if (b[i] !== i + 1) return false;

  return b[b.length - 1] === 0;
}

function isTileMovable(i) {
  const size = state.gridSize;
  const z = state.board.indexOf(0);

  const r1 = Math.floor(i / size),
    c1 = i % size;
  const r2 = Math.floor(z / size),
    c2 = z % size;

  return (
    (r1 === r2 && Math.abs(c1 - c2) === 1) ||
    (c1 === c2 && Math.abs(r1 - r2) === 1)
  );
}

/* -----------------------------------------------------------
   RENDER BOARD
----------------------------------------------------------- */
function renderBoard() {
  boardEl.innerHTML = '';
  setCSSGridSize(state.gridSize);

  state.board.forEach((val, i) => {
    const t = document.createElement('div');
    t.className = 'tile';

    if (val === 0) {
      t.classList.add('empty');
    } else {
      t.textContent = val;
      if (isTileMovable(i)) t.classList.add('tile-hint');
      t.onclick = () => handleTileTap(i);
    }

    boardEl.appendChild(t);
  });
}

/* -----------------------------------------------------------
   GAME LOGIC
----------------------------------------------------------- */
function handleTileTap(i) {
  if (!state.isPlaying) return;

  const size = state.gridSize;
  const z = state.board.indexOf(0);

  const r1 = Math.floor(i / size),
    c1 = i % size;
  const r2 = Math.floor(z / size),
    c2 = z % size;

  const valid =
    (r1 === r2 && Math.abs(c1 - c2) === 1) ||
    (c1 === c2 && Math.abs(r1 - r2) === 1);

  if (!valid) {
    playSound(soundWrong);
    return;
  }

  playSound(soundMove);

  [state.board[i], state.board[z]] = [state.board[z], state.board[i]];

  state.moves++;
  updateHUD();
  renderBoard();
  saveProgress();

  if (isSolved()) handleLevelComplete();
}

/* -----------------------------------------------------------
   HUD + TIMER
----------------------------------------------------------- */
function updateHUD() {
  levelDisplay.textContent = state.level;
  movesDisplay.textContent = state.moves;
  timeDisplay.textContent = `${state.seconds}s`;
}

function startTimer() {
  stopTimer();
  state.timerId = setInterval(() => {
    state.seconds++;
    updateHUD();
  }, 1000);
}

function stopTimer() {
  if (state.timerId) clearInterval(state.timerId);
}

/* -----------------------------------------------------------
   LEVEL MANAGEMENT
----------------------------------------------------------- */
function handleLevelComplete() {
  stopTimer();
  state.isPlaying = false;

  overlayStats.textContent = `Level ${state.level} · Moves ${state.moves} · Time ${state.seconds}s`;

  playSound(soundWin);
  levelOverlay.classList.remove('hidden');
}

function goToNextLevel() {
  levelOverlay.classList.add('hidden');

  state.level++;
  state.moves = 0;
  state.seconds = 0;
  state.isPlaying = true;

  state.board = generateSolvableBoard(state.gridSize);

  renderBoard();
  updateHUD();
  startTimer();
  saveProgress();
}

/* -----------------------------------------------------------
   NEW GAME / CONTINUE GAME
----------------------------------------------------------- */
function startNewGame() {
  difficultyRadios.forEach((r) => {
    if (r.checked) state.gridSize = parseInt(r.value);
  });

  state.board = generateSolvableBoard(state.gridSize);
  state.level = 1;
  state.moves = 0;
  state.seconds = 0;
  state.isPlaying = true;

  renderBoard();
  updateHUD();
  startTimer();
  shuffleBtn.disabled = false;

  saveProgress();
}

function continueGame() {
  startOverlay.classList.add('hidden');

  // Aplică grid-ul din salvare
  setCSSGridSize(state.gridSize);

  state.isPlaying = true;
  renderBoard();
  updateHUD();
  startTimer();
}

/* -----------------------------------------------------------
   UI EVENTS
----------------------------------------------------------- */
startGameBtn.onclick = () => {
  playSound(soundStart);
  startOverlay.classList.add('hidden');
  startNewGame();
};

toggleSoundBtn.onclick = () => {
  state.soundsEnabled = !state.soundsEnabled;
  toggleSoundBtn.textContent = state.soundsEnabled ? 'Sound: On' : 'Sound: Off';
};

shuffleBtn.onclick = () => {
  state.board = generateSolvableBoard(state.gridSize);
  state.moves = 0;
  state.seconds = 0;

  renderBoard();
  updateHUD();
  saveProgress();
};

nextLevelBtn.onclick = goToNextLevel;

toggleHowToBtn.onclick = () => {
  howToContent.classList.toggle('collapsed');
  toggleHowToBtn.textContent = howToContent.classList.contains('collapsed')
    ? 'Show'
    : 'Hide';
};

/* -----------------------------------------------------------
   INIT — SHOW MENU ALWAYS
----------------------------------------------------------- */
function init() {
  const hasSave = loadProgress();

  if (hasSave && hasRealProgress()) {
    const contBtn = document.createElement('button');
    contBtn.textContent = 'Continue Game';
    contBtn.className = 'btn primary-btn';
    contBtn.style.marginBottom = '12px';

    startGameBtn.insertAdjacentElement('beforebegin', contBtn);

    contBtn.onclick = () => {
      playSound(soundStart);
      setCSSGridSize(state.gridSize);
      continueGame();
    };

    return; // IMPORTANT: nu suprascrie salvarea!
  }

  // Fără salvare: afișează un board demo 4×4
  state.board = createOrderedBoard(4);
  renderBoard();
  updateHUD();
  shuffleBtn.disabled = true;
}

document.addEventListener('DOMContentLoaded', init);
