import {
  applyThemeToBody,
  clearTiles,
  closeMenu,
  createGridCells,
  createTileElement,
  deleteTileElement,
  dom,
  getTileElement,
  hideMessage,
  refreshTileClass,
  removeTileElement,
  setBoardSizeSelect,
  setTilePosition,
  showMessage,
  updatePowerUI,
  updateScoreUI,
  updateTeleportTargets,
} from "./ui.js";

import {
  getCurrentBoardSize,
  getTheme,
  loadBestScore,
  loadGameData,
  removeGameData,
  saveBestScore,
  saveGameData,
  setCurrentBoardSize,
  setTheme,
} from "./storage.js";

const AVAILABLE_SIZES = [4, 5, 6, 8];
const MAX_BOARD_SIZE = 10;
const MAX_POWER = 2;
const ANIMATION_DURATION = 110;
const WIN_VALUE = 2048;

let boardSize = getCurrentBoardSize();
let theme = getTheme();

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

let cachedMetrics = {
  gap: 10,
  cellSize: 94,
};

export function getAnimationDuration() {
  return ANIMATION_DURATION;
}

function updateCachedMetrics() {
  const styles = getComputedStyle(dom.boardElement);

  const boardWidth = dom.boardElement.clientWidth;
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

  if (activePower === "swap" || activePower === "teleport") {
    classes.push("selectable");
  }

  if (selectedTileId === tile.id) {
    classes.push("selected");
  }

  return classes.join(" ");
}

function createTile(tile) {
  return createTileElement(
    tile,
    getTileClassName(tile),
    getPixelPosition(tile.row, tile.col),
    handleTileClick,
  );
}

function renderAllTiles() {
  clearTiles();
  updateCachedMetrics();

  tiles.forEach((tile) => {
    tile.isNew = false;
    tile.isMerged = false;
    createTile(tile);
  });

  refreshTileClasses();
}

function refreshTileClasses() {
  tiles.forEach((tile) => {
    refreshTileClass(tile, getTileClassName(tile));
  });

  updateTeleportTargets(activePower === "teleport");
}

function updateScore() {
  if (score > bestScore) {
    bestScore = score;
    saveBestScore(boardSize, bestScore);
  }

  updateScoreUI(score, bestScore);
}

function updatePowers() {
  updatePowerUI(powers, history.length, activePower);
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

export function getBoardValues() {
  const board = Array.from({ length: boardSize }, () =>
    Array(boardSize).fill(0),
  );

  tiles.forEach((tile) => (board[tile.row][tile.col] = tile.value));
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
  updatePowers();
}

function spendPower(type) {
  if (powers[type] <= 0) return false;

  powers[type] -= 1;
  updatePowers();

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
  createTile(tile);

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
  const currentUndo = powers.undo;

  tiles = snapshot.tiles.map((tile) => ({
    ...tile,
    isNew: false,
    isMerged: false,
  }));

  nextId = snapshot.nextId;
  score = snapshot.score;

  powers = {
    ...snapshot.powers,
    undo: currentUndo,
  };

  isGameOver = snapshot.isGameOver;
  hasWon = snapshot.hasWon;
  keepPlaying = snapshot.keepPlaying;
  queuedDirection = null;

  cancelPowerMode();
  hideMessage();
  renderAllTiles();
  updateScore();
  updatePowers();

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

export function saveGame() {
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

  saveGameData(boardSize, payload);
}

function loadGame(size) {
  const data = loadGameData(size);

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
}

export function startNewGame({ clearSaved = false } = {}) {
  if (clearSaved) {
    removeGameData(boardSize);
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
  clearTiles();

  updateCachedMetrics();

  addRandomTile();
  addRandomTile();

  updateScore();
  updatePowers();
  saveGame();
}

export function loadOrCreateGame() {
  setCurrentBoardSize(boardSize);

  bestScore = loadBestScore(boardSize);

  createGridCells(boardSize, handleCellClick);

  const loaded = loadGame(boardSize);

  if (loaded) {
    renderAllTiles();
    updateScore();
    updatePowers();

    if (isGameOver) {
      showMessage("lose");
    } else if (hasWon && !keepPlaying) {
      showMessage("win");
    }
  } else {
    startNewGame();
  }

  setBoardSizeSelect(boardSize);

  requestAnimationFrame(() => {
    handleResize();
  });
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

export function move(direction) {
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

    setTilePosition(
      tileElement,
      getPixelPosition(moveItem.toRow, moveItem.toCol),
    );

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
    removeTileElement(id);
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
    createTile(newTile);

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

export function undoMove() {
  if (isAnimating) return;
  if (powers.undo <= 0) return;
  if (history.length === 0) return;

  spendPower("undo");

  const snapshot = history.pop();
  applyGameSnapshot(snapshot);

  saveGame();
}

export function setActivePower(powerName) {
  if (isAnimating || isGameOver) return;

  if (activePower === powerName) {
    cancelPowerMode();
    return;
  }

  if (powers[powerName] <= 0) return;

  activePower = powerName;
  selectedTileId = null;

  hideMessage();
  updatePowers();
  refreshTileClasses();
}

export function cancelPowerMode() {
  activePower = null;
  selectedTileId = null;

  updatePowers();
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

  setTilePosition(
    getTileElement(firstTile.id),
    getPixelPosition(firstTile.row, firstTile.col),
  );

  setTilePosition(
    getTileElement(secondTile.id),
    getPixelPosition(secondTile.row, secondTile.col),
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

  setTilePosition(getTileElement(tile.id), getPixelPosition(row, col));

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

export function handleResize() {
  updateCachedMetrics();

  tiles.forEach((tile) => {
    setTilePosition(
      getTileElement(tile.id),
      getPixelPosition(tile.row, tile.col),
    );
  });
}

export function applyTheme(nextTheme) {
  theme = nextTheme;

  applyThemeToBody(theme);
  setTheme(theme);
}

export function changeBoardSize(nextSize) {
  const parsedSize = Number(nextSize);

  if (!AVAILABLE_SIZES.includes(parsedSize)) return;
  if (parsedSize > MAX_BOARD_SIZE) return;

  saveGame();

  boardSize = parsedSize;
  setCurrentBoardSize(boardSize);

  cancelPowerMode();
  hideMessage();
  clearTiles();

  loadOrCreateGame();
}

export function keepPlayingAfterWin() {
  keepPlaying = true;
  hideMessage();
  saveGame();
}

export function initGame() {
  applyTheme(theme);
  loadOrCreateGame();
}
