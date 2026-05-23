const gridContainer = document.getElementById("gridContainer");
const tileContainer = document.getElementById("tileContainer");
const boardElement = document.getElementById("board");

const scoreElement = document.getElementById("score");
const bestElement = document.getElementById("best");

const newGameBtn = document.getElementById("newGameBtn");
const tryAgainBtn = document.getElementById("tryAgainBtn");
const keepPlayingBtn = document.getElementById("keepPlayingBtn");

const gameMessage = document.getElementById("gameMessage");
const messageText = document.getElementById("messageText");

const menuToggle = document.getElementById("menuToggle");
const sideMenu = document.getElementById("sideMenu");
const themeSelect = document.getElementById("themeSelect");
const boardSizeSelect = document.getElementById("boardSizeSelect");
const resetCurrentBoardBtn = document.getElementById("resetCurrentBoardBtn");

const undoBtn = document.getElementById("undoBtn");
const swapBtn = document.getElementById("swapBtn");
const teleportBtn = document.getElementById("teleportBtn");

const undoCount = document.getElementById("undoCount");
const swapCount = document.getElementById("swapCount");
const teleportCount = document.getElementById("teleportCount");

const AVAILABLE_SIZES = [4, 5, 6, 8];
const MAX_BOARD_SIZE = 10;
const MAX_POWER = 2;
const ANIMATION_DURATION = 110;
const WIN_VALUE = 2048;

let boardSize = Number(localStorage.getItem("currentBoardSize2048")) || 4;
let theme = localStorage.getItem("theme2048") || "classic";

let tiles = [];
let nextId = 1;
let score = 0;
let bestScore = 0;

let powers = {
  undo: 0,
  swap: 0,
  teleport: 0,
};

let history = [];

let isAnimating = false;
let isGameOver = false;
let hasWon = false;
let keepPlaying = false;
let queuedDirection = null;

let activePower = null;
let selectedTileId = null;

let touchStartX = 0;
let touchStartY = 0;

let tileElementMap = new Map();

let cachedMetrics = {
  gap: 10,
  cellSize: 94,
};

function getStorageKey(size = boardSize) {
  return `game2048-board-${size}`;
}

function getBestStorageKey(size = boardSize) {
  return `bestScore2048-board-${size}`;
}
function createGrid() {
  document.documentElement.style.setProperty("--grid-size", boardSize);
  gridContainer.innerHTML = "";

  for (let i = 0; i < boardSize * boardSize; i++) {
    const cell = document.createElement("div");
    cell.className = "grid-cell";

    const row = Math.floor(i / boardSize);
    const col = i % boardSize;

    cell.dataset.row = row;
    cell.dataset.col = col;

    cell.addEventListener("click", () => handleCellClick(row, col));

    gridContainer.appendChild(cell);
  }

  requestAnimationFrame(() => {
    updateCachedMetrics();
    handleResize();
  });
}

function updateCachedMetrics() {
  const styles = getComputedStyle(boardElement);

  const boardWidth = boardElement.clientWidth;
  const padding = parseFloat(styles.getPropertyValue("--board-padding"));
  const gap = parseFloat(styles.getPropertyValue("--gap"));

  const cellSize =
    (boardWidth - padding * 2 - gap * (boardSize - 1)) / boardSize;

  cachedMetrics = {
    gap,
    cellSize,
  };
}

function getPixelPosition(row, col) {
  const { gap, cellSize } = cachedMetrics;

  return {
    x: col * (cellSize + gap),
    y: row * (cellSize + gap),
  };
}

function getTileClassName(tile) {
  const classes = ["tile"];

  if (tile.value <= 2048) {
    classes.push(`tile-${tile.value}`);
  } else {
    classes.push("tile-super");
  }

  if (tile.isNew) {
    classes.push("tile-new");
  }

  if (tile.isMerged) {
    classes.push("tile-merged");
  }

  if (activePower && (activePower === "swap" || activePower === "teleport")) {
    classes.push("selectable");
  }

  if (selectedTileId === tile.id) {
    classes.push("selected");
  }

  return classes.join(" ");
}
function createTileElement(tile) {
  const tileElement = document.createElement("div");
  tileElement.className = getTileClassName(tile);
  tileElement.dataset.id = tile.id;

  const { x, y } = getPixelPosition(tile.row, tile.col);
  tileElement.style.transform = `translate3d(${x}px, ${y}px, 0)`;

  tileElement.addEventListener("click", (event) => {
    event.stopPropagation();
    handleTileClick(tile.id);
  });

  const inner = document.createElement("div");
  inner.className = "tile-inner";
  inner.textContent = tile.value;

  tileElement.appendChild(inner);
  tileContainer.appendChild(tileElement);

  tileElementMap.set(tile.id, tileElement);

  setTimeout(() => {
    tileElement.classList.remove("tile-new", "tile-merged");
  }, 260);

  return tileElement;
}

function getTileElement(tileId) {
  return tileElementMap.get(tileId);
}

function setTilePosition(tileElement, row, col) {
  if (!tileElement) return;

  const { x, y } = getPixelPosition(row, col);
  tileElement.style.transform = `translate3d(${x}px, ${y}px, 0)`;
}
function renderAllTiles() {
  tileContainer.innerHTML = "";
  tileElementMap.clear();

  updateCachedMetrics();

  tiles.forEach((tile) => {
    tile.isNew = false;
    tile.isMerged = false;
    createTileElement(tile);
  });

  refreshTileClasses();
}

function refreshTileClasses() {
  tiles.forEach((tile) => {
    const element = getTileElement(tile.id);

    if (element) {
      element.className = getTileClassName(tile);
    }
  });

  gridContainer.querySelectorAll(".grid-cell").forEach((cell) => {
    cell.classList.toggle("teleport-target", activePower === "teleport");
  });
}

function updateScore() {
  scoreElement.textContent = score;

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem(getBestStorageKey(), String(bestScore));
  }

  bestElement.textContent = bestScore;
}

function updatePowerUI() {
  undoCount.textContent = powers.undo;
  swapCount.textContent = powers.swap;
  teleportCount.textContent = powers.teleport;

  undoBtn.disabled = powers.undo <= 0 || history.length === 0;
  swapBtn.disabled = powers.swap <= 0;
  teleportBtn.disabled = powers.teleport <= 0;

  undoBtn.classList.toggle("active", activePower === "undo");
  swapBtn.classList.toggle("active", activePower === "swap");
  teleportBtn.classList.toggle("active", activePower === "teleport");
}

function createEmptyBoard() {
  return Array.from({ length: boardSize }, () => Array(boardSize).fill(null));
}

function getBoardFromTiles() {
  const board = createEmptyBoard();

  tiles.forEach((tile) => {
    board[tile.row][tile.col] = tile;
  });

  return board;
}

function getEmptyCells() {
  const board = getBoardFromTiles();
  const emptyCells = [];

  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col < boardSize; col++) {
      if (!board[row][col]) {
        emptyCells.push({ row, col });
      }
    }
  }

  return emptyCells;
}

function addPower(type, amount = 1) {
  powers[type] = Math.min(MAX_POWER, powers[type] + amount);
  updatePowerUI();
}

function spendPower(type) {
  if (powers[type] <= 0) return false;

  powers[type] -= 1;

  updatePowerUI();
  return true;
}

function addRandomTile() {
  const emptyCells = getEmptyCells();

  if (emptyCells.length === 0) return;

  const randomIndex = Math.floor(Math.random() * emptyCells.length);
  const cell = emptyCells[randomIndex];

  const tile = {
    id: nextId++,
    value: Math.random() < 0.9 ? 2 : 4,
    row: cell.row,
    col: cell.col,
    isNew: true,
    isMerged: false,
  };

  tiles.push(tile);
  createTileElement(tile);

  tile.isNew = false;
}

function getGameSnapshot() {
  return {
    tiles: tiles.map((tile) => ({
      id: tile.id,
      value: tile.value,
      row: tile.row,
      col: tile.col,
    })),
    nextId,
    score,
    powers: { ...powers },
    isGameOver,
    hasWon,
    keepPlaying,
  };
}

function applyGameSnapshot(snapshot) {
  tiles = snapshot.tiles.map((tile) => ({
    ...tile,
    isNew: false,
    isMerged: false,
  }));

  nextId = snapshot.nextId;
  score = snapshot.score;
  //   const currentUndo = powers.undo;

  //   powers = {
  //     ...snapshot.powers,
  //     undo: currentUndo,
  //   };

  isGameOver = snapshot.isGameOver;
  hasWon = snapshot.hasWon;
  keepPlaying = snapshot.keepPlaying;

  cancelPowerMode();
  hideMessage();
  renderAllTiles();
  updateScore();
  updatePowerUI();

  if (isGameOver) {
    showMessage("lose");
  } else if (hasWon && !keepPlaying) {
    showMessage("win");
  }
}

function pushHistory() {
  history.push(getGameSnapshot());

  if (history.length > 30) {
    history.shift();
  }
}

function saveGame() {
  const payload = {
    boardSize,
    tiles: tiles.map((tile) => ({
      id: tile.id,
      value: tile.value,
      row: tile.row,
      col: tile.col,
    })),
    nextId,
    score,
    powers,
    history,
    isGameOver,
    hasWon,
    keepPlaying,
  };

  localStorage.setItem(getStorageKey(), JSON.stringify(payload));
}

function loadGame(size) {
  const raw = localStorage.getItem(getStorageKey(size));

  if (!raw) return false;

  try {
    const data = JSON.parse(raw);

    if (!data || !Array.isArray(data.tiles)) return false;

    boardSize = Math.min(Number(data.boardSize) || size, MAX_BOARD_SIZE);
    tiles = data.tiles.map((tile) => ({
      ...tile,
      isNew: false,
      isMerged: false,
    }));

    nextId = Number(data.nextId) || 1;
    score = Number(data.score) || 0;

    powers = {
      undo: Number(data.powers?.undo) || 0,
      swap: Number(data.powers?.swap) || 0,
      teleport: Number(data.powers?.teleport) || 0,
    };

    history = Array.isArray(data.history) ? data.history : [];

    isGameOver = Boolean(data.isGameOver);
    hasWon = Boolean(data.hasWon);
    keepPlaying = Boolean(data.keepPlaying);

    return true;
  } catch {
    return false;
  }
}

function startNewGame({ clearSaved = false } = {}) {
  if (clearSaved) {
    localStorage.removeItem(getStorageKey());
  }

  tiles = [];
  nextId = 1;
  score = 0;

  powers = {
    undo: 0,
    swap: 0,
    teleport: 0,
  };

  history = [];
  isAnimating = false;
  isGameOver = false;
  hasWon = false;
  keepPlaying = false;
  queuedDirection = null;

  cancelPowerMode();
  hideMessage();

  tileContainer.innerHTML = "";
  tileElementMap.clear();

  addRandomTile();
  addRandomTile();

  updateScore();
  updatePowerUI();
  saveGame();
}

function loadOrCreateGame() {
  localStorage.setItem("currentBoardSize2048", String(boardSize));

  bestScore = Number(localStorage.getItem(getBestStorageKey())) || 0;

  createGrid();

  const loaded = loadGame(boardSize);

  if (loaded) {
    renderAllTiles();
    updateScore();
    updatePowerUI();

    if (isGameOver) {
      showMessage("lose");
    } else if (hasWon && !keepPlaying) {
      showMessage("win");
    }
  } else {
    startNewGame();
  }

  boardSizeSelect.value = String(boardSize);
}

function showMessage(type) {
  gameMessage.classList.remove("hidden");

  if (type === "win") {
    messageText.textContent = "You win!";
    keepPlayingBtn.style.display = "inline-block";
  } else {
    messageText.textContent = "Game Over!";
    keepPlayingBtn.style.display = "none";
  }
}

function hideMessage() {
  gameMessage.classList.add("hidden");
}

function buildLines(direction) {
  const lines = [];

  if (direction === "left") {
    for (let row = 0; row < boardSize; row++) {
      const line = [];
      for (let col = 0; col < boardSize; col++) {
        line.push({ row, col });
      }
      lines.push(line);
    }
  }

  if (direction === "right") {
    for (let row = 0; row < boardSize; row++) {
      const line = [];
      for (let col = boardSize - 1; col >= 0; col--) {
        line.push({ row, col });
      }
      lines.push(line);
    }
  }

  if (direction === "up") {
    for (let col = 0; col < boardSize; col++) {
      const line = [];
      for (let row = 0; row < boardSize; row++) {
        line.push({ row, col });
      }
      lines.push(line);
    }
  }

  if (direction === "down") {
    for (let col = 0; col < boardSize; col++) {
      const line = [];
      for (let row = boardSize - 1; row >= 0; row--) {
        line.push({ row, col });
      }
      lines.push(line);
    }
  }

  return lines;
}

function prepareMove(direction) {
  const board = getBoardFromTiles();
  const lines = buildLines(direction);

  const moves = [];
  const merges = [];

  let moved = false;
  let gainedScore = 0;

  lines.forEach((line) => {
    const lineTiles = line
      .map((cell) => board[cell.row][cell.col])
      .filter(Boolean);

    let targetIndex = 0;
    let lastCandidate = null;

    lineTiles.forEach((tile) => {
      if (
        lastCandidate &&
        !lastCandidate.used &&
        lastCandidate.tile.value === tile.value
      ) {
        const destination = lastCandidate.destination;

        moves.push({
          tile,
          toRow: destination.row,
          toCol: destination.col,
        });

        merges.push({
          firstTile: lastCandidate.tile,
          secondTile: tile,
          value: tile.value * 2,
          row: destination.row,
          col: destination.col,
        });

        gainedScore += tile.value * 2;

        if (tile.row !== destination.row || tile.col !== destination.col) {
          moved = true;
        }

        lastCandidate.used = true;
        lastCandidate = null;
      } else {
        const destination = line[targetIndex];

        moves.push({
          tile,
          toRow: destination.row,
          toCol: destination.col,
        });

        if (tile.row !== destination.row || tile.col !== destination.col) {
          moved = true;
        }

        lastCandidate = {
          tile,
          destination,
          used: false,
        };

        targetIndex++;
      }
    });
  });

  return {
    moved,
    moves,
    merges,
    gainedScore,
  };
}

function move(direction) {
  if (isGameOver) return;
  if (hasWon && !keepPlaying) return;
  if (activePower) return;

  if (isAnimating) {
    queuedDirection = direction;
    return;
  }

  const result = prepareMove(direction);

  if (!result.moved && result.merges.length === 0) {
    return;
  }

  pushHistory();
  isAnimating = true;

  result.moves.forEach((moveItem) => {
    const tileElement = getTileElement(moveItem.tile.id);

    if (tileElement) {
      setTilePosition(tileElement, moveItem.toRow, moveItem.toCol);
    }

    moveItem.tile.row = moveItem.toRow;
    moveItem.tile.col = moveItem.toCol;
  });

  setTimeout(() => {
    finishMove(result);
  }, ANIMATION_DURATION);
}

function finishMove(result) {
  const mergedIds = new Set();

  result.merges.forEach((merge) => {
    mergedIds.add(merge.firstTile.id);
    mergedIds.add(merge.secondTile.id);
  });

  mergedIds.forEach((id) => {
    const element = getTileElement(id);

    if (element) {
      element.remove();
    }

    tileElementMap.delete(id);
  });

  tiles = tiles.filter((tile) => !mergedIds.has(tile.id));

  result.merges.forEach((merge) => {
    const newTile = {
      id: nextId++,
      value: merge.value,
      row: merge.row,
      col: merge.col,
      isNew: false,
      isMerged: true,
    };

    tiles.push(newTile);
    createTileElement(newTile);

    newTile.isMerged = false;

    if (newTile.value === 64) {
      addPower("swap", 1);
    }

    if (newTile.value === 128) {
      addPower("teleport", 1);
    }

    if (newTile.value === WIN_VALUE && !hasWon) {
      hasWon = true;
    }
  });

  score += result.gainedScore;
  addPower("undo", 1);

  updateScore();
  addRandomTile();

  isAnimating = false;

  if (hasWon && !keepPlaying) {
    showMessage("win");
    saveGame();
    return;
  }

  if (!canMove()) {
    isGameOver = true;
    showMessage("lose");
    saveGame();
    return;
  }

  saveGame();

  if (queuedDirection) {
    const nextDirection = queuedDirection;
    queuedDirection = null;

    setTimeout(() => {
      move(nextDirection);
    }, 0);
  }
}

function canMove() {
  if (getEmptyCells().length > 0) {
    return true;
  }

  const board = getBoardFromTiles();

  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col < boardSize; col++) {
      const tile = board[row][col];

      const right = col + 1 < boardSize ? board[row][col + 1] : null;
      const down = row + 1 < boardSize ? board[row + 1][col] : null;

      if (right && right.value === tile.value) {
        return true;
      }

      if (down && down.value === tile.value) {
        return true;
      }
    }
  }

  return false;
}

function undoMove() {
  if (isAnimating || isGameOver) return;
  if (powers.undo <= 0) return;
  if (history.length === 0) return;

  spendPower("undo");
  const snapshot = history.pop();
  applyGameSnapshot(snapshot);

  saveGame();
}

function setActivePower(powerName) {
  if (isAnimating || isGameOver) return;

  if (activePower === powerName) {
    cancelPowerMode();
    return;
  }

  if (powers[powerName] <= 0) return;

  activePower = powerName;
  selectedTileId = null;

  hideMessage();
  updatePowerUI();
  refreshTileClasses();
}

function cancelPowerMode() {
  activePower = null;
  selectedTileId = null;

  updatePowerUI();
  refreshTileClasses();
}

function getTileById(tileId) {
  return tiles.find((tile) => tile.id === tileId);
}

function handleTileClick(tileId) {
  if (!activePower) return;

  if (activePower === "swap") {
    handleSwapTileClick(tileId);
    return;
  }

  if (activePower === "teleport") {
    handleTeleportTileClick(tileId);
  }
}

function handleSwapTileClick(tileId) {
  if (powers.swap <= 0) return;

  if (!selectedTileId) {
    selectedTileId = tileId;
    refreshTileClasses();
    return;
  }

  if (selectedTileId === tileId) {
    selectedTileId = null;
    refreshTileClasses();
    return;
  }

  const firstTile = getTileById(selectedTileId);
  const secondTile = getTileById(tileId);

  if (!firstTile || !secondTile) {
    cancelPowerMode();
    return;
  }

  pushHistory();

  const firstPosition = {
    row: firstTile.row,
    col: firstTile.col,
  };

  firstTile.row = secondTile.row;
  firstTile.col = secondTile.col;

  secondTile.row = firstPosition.row;
  secondTile.col = firstPosition.col;

  setTilePosition(getTileElement(firstTile.id), firstTile.row, firstTile.col);
  setTilePosition(
    getTileElement(secondTile.id),
    secondTile.row,
    secondTile.col,
  );

  spendPower("swap");
  cancelPowerMode();

  setTimeout(() => {
    saveGame();
  }, ANIMATION_DURATION);
}

function handleTeleportTileClick(tileId) {
  if (powers.teleport <= 0) return;

  if (selectedTileId === tileId) {
    selectedTileId = null;
  } else {
    selectedTileId = tileId;
  }

  refreshTileClasses();
}

function handleCellClick(row, col) {
  if (activePower !== "teleport") return;
  if (!selectedTileId) return;
  if (powers.teleport <= 0) return;

  const board = getBoardFromTiles();

  if (board[row][col]) return;

  const tile = getTileById(selectedTileId);

  if (!tile) {
    cancelPowerMode();
    return;
  }

  pushHistory();

  tile.row = row;
  tile.col = col;

  const element = getTileElement(tile.id);

  if (element) {
    setTilePosition(element, row, col);
  }

  spendPower("teleport");
  cancelPowerMode();

  setTimeout(() => {
    saveGame();

    if (!canMove()) {
      isGameOver = true;
      showMessage("lose");
      saveGame();
    }
  }, ANIMATION_DURATION);
}

function handleKeydown(event) {
  if (event.key === "Escape") {
    cancelPowerMode();
    sideMenu.classList.add("hidden");
    return;
  }

  const keyMap = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",

    w: "up",
    s: "down",
    a: "left",
    d: "right",

    W: "up",
    S: "down",
    A: "left",
    D: "right",

    i: "up",
    k: "down",
    j: "left",
    l: "right",

    I: "up",
    K: "down",
    J: "left",
    L: "right",
  };

  const direction = keyMap[event.key];

  if (!direction) return;

  event.preventDefault();
  move(direction);
}

function handleTouchStart(event) {
  const touch = event.touches[0];

  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
}

function handleTouchEnd(event) {
  const touch = event.changedTouches[0];

  const deltaX = touch.clientX - touchStartX;
  const deltaY = touch.clientY - touchStartY;

  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  const minSwipeDistance = 30;

  if (Math.max(absX, absY) < minSwipeDistance) {
    return;
  }

  if (absX > absY) {
    move(deltaX > 0 ? "right" : "left");
  } else {
    move(deltaY > 0 ? "down" : "up");
  }
}

function handleResize() {
  updateCachedMetrics();

  tiles.forEach((tile) => {
    const tileElement = getTileElement(tile.id);
    setTilePosition(tileElement, tile.row, tile.col);
  });
}

function applyTheme(nextTheme) {
  theme = nextTheme;

  document.body.classList.remove("theme-green", "theme-dark");

  if (theme === "green") {
    document.body.classList.add("theme-green");
  }

  if (theme === "dark") {
    document.body.classList.add("theme-dark");
  }

  localStorage.setItem("theme2048", theme);
  themeSelect.value = theme;
}

function changeBoardSize(nextSize) {
  const parsedSize = Number(nextSize);

  if (!AVAILABLE_SIZES.includes(parsedSize)) return;
  if (parsedSize > MAX_BOARD_SIZE) return;

  saveGame();

  boardSize = parsedSize;
  localStorage.setItem("currentBoardSize2048", String(boardSize));

  cancelPowerMode();
  hideMessage();
  tileContainer.innerHTML = "";

  loadOrCreateGame();
}

createGrid();
applyTheme(theme);
loadOrCreateGame();

window.addEventListener("keydown", handleKeydown);
window.addEventListener("resize", handleResize);

boardElement.addEventListener("touchstart", handleTouchStart, {
  passive: true,
});

boardElement.addEventListener("touchend", handleTouchEnd, {
  passive: true,
});

newGameBtn.addEventListener("click", () => {
  const isConfirm = confirm("Start new game?");
  if (isConfirm) startNewGame({ clearSaved: true });
});

tryAgainBtn.addEventListener("click", () => {
  startNewGame({ clearSaved: true });
});

keepPlayingBtn.addEventListener("click", () => {
  keepPlaying = true;
  hideMessage();
  saveGame();
});

menuToggle.addEventListener("click", () => {
  sideMenu.classList.toggle("hidden");
});

themeSelect.addEventListener("change", (event) => {
  applyTheme(event.target.value);
});

boardSizeSelect.addEventListener("change", (event) => {
  changeBoardSize(event.target.value);
});

resetCurrentBoardBtn.addEventListener("click", () => {
  startNewGame({ clearSaved: true });
  sideMenu.classList.add("hidden");
});

undoBtn.addEventListener("click", undoMove);

swapBtn.addEventListener("click", () => {
  setActivePower("swap");
});

teleportBtn.addEventListener("click", () => {
  setActivePower("teleport");
});

document.addEventListener("click", (event) => {
  const clickedInsideMenu =
    sideMenu.contains(event.target) || menuToggle.contains(event.target);

  if (!clickedInsideMenu) {
    sideMenu.classList.add("hidden");
  }
});
