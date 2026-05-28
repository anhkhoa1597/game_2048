export const dom = {
  gridContainer: document.getElementById("gridContainer"),
  tileContainer: document.getElementById("tileContainer"),
  boardElement: document.getElementById("board"),

  scoreElement: document.getElementById("score"),
  bestElement: document.getElementById("best"),

  newGameBtn: document.getElementById("newGameBtn"),
  tryAgainBtn: document.getElementById("tryAgainBtn"),
  keepPlayingBtn: document.getElementById("keepPlayingBtn"),

  gameMessage: document.getElementById("gameMessage"),
  messageText: document.getElementById("messageText"),

  menuToggle: document.getElementById("menuToggle"),
  sideMenu: document.getElementById("sideMenu"),
  themeSelect: document.getElementById("themeSelect"),
  boardSizeSelect: document.getElementById("boardSizeSelect"),
  resetCurrentBoardBtn: document.getElementById("resetCurrentBoardBtn"),

  undoBtn: document.getElementById("undoBtn"),
  swapBtn: document.getElementById("swapBtn"),
  teleportBtn: document.getElementById("teleportBtn"),

  undoCount: document.getElementById("undoCount"),
  swapCount: document.getElementById("swapCount"),
  teleportCount: document.getElementById("teleportCount"),
};

let tileElementMap = new Map();

export function clearTileMap() {
  tileElementMap.clear();
}

export function setTileElement(tileId, element) {
  tileElementMap.set(tileId, element);
}

export function deleteTileElement(tileId) {
  tileElementMap.delete(tileId);
}

export function getTileElement(tileId) {
  return tileElementMap.get(tileId);
}

export function updateScoreUI(score, bestScore) {
  dom.scoreElement.textContent = score;
  dom.bestElement.textContent = bestScore;
}

export function updatePowerUI(powers, historyLength, activePower) {
  dom.undoCount.textContent = powers.undo;
  dom.swapCount.textContent = powers.swap;
  dom.teleportCount.textContent = powers.teleport;

  dom.undoBtn.disabled = powers.undo <= 0 || historyLength === 0;
  dom.swapBtn.disabled = powers.swap <= 0;
  dom.teleportBtn.disabled = powers.teleport <= 0;

  dom.undoBtn.classList.toggle("active", activePower === "undo");
  dom.swapBtn.classList.toggle("active", activePower === "swap");
  dom.teleportBtn.classList.toggle("active", activePower === "teleport");
}

export function showMessage(type) {
  dom.gameMessage.classList.remove("hidden");

  if (type === "win") {
    dom.messageText.textContent = "You win!";
    dom.keepPlayingBtn.style.display = "inline-block";
  } else {
    dom.messageText.textContent = "Game Over!";
    dom.keepPlayingBtn.style.display = "none";
  }
}

export function hideMessage() {
  dom.gameMessage.classList.add("hidden");
}

export function applyThemeToBody(theme) {
  document.body.classList.remove("theme-green", "theme-dark");

  if (theme === "green") {
    document.body.classList.add("theme-green");
  }

  if (theme === "dark") {
    document.body.classList.add("theme-dark");
  }

  dom.themeSelect.value = theme;
}

export function toggleMenu() {
  dom.sideMenu.classList.toggle("hidden");
}

export function closeMenu() {
  dom.sideMenu.classList.add("hidden");
}

export function isClickInsideMenu(target) {
  return dom.sideMenu.contains(target) || dom.menuToggle.contains(target);
}

export function setBoardSizeSelect(size) {
  dom.boardSizeSelect.value = String(size);
}

export function setGridSizeCSS(size) {
  document.documentElement.style.setProperty("--grid-size", size);
}

export function createGridCells(size, onCellClick) {
  setGridSizeCSS(size);

  dom.gridContainer.innerHTML = "";

  for (let i = 0; i < size * size; i++) {
    const cell = document.createElement("div");
    cell.className = "grid-cell";

    const row = Math.floor(i / size);
    const col = i % size;

    cell.dataset.row = row;
    cell.dataset.col = col;

    cell.addEventListener("click", () => onCellClick(row, col));

    dom.gridContainer.appendChild(cell);
  }
}

export function updateTeleportTargets(isTeleportMode) {
  dom.gridContainer.querySelectorAll(".grid-cell").forEach((cell) => {
    cell.classList.toggle("teleport-target", isTeleportMode);
  });
}

export function clearTiles() {
  dom.tileContainer.innerHTML = "";
  clearTileMap();
}

export function createTileElement(tile, className, position, onTileClick) {
  const tileElement = document.createElement("div");

  tileElement.className = className;
  tileElement.dataset.id = tile.id;
  tileElement.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;

  tileElement.addEventListener("click", (event) => {
    event.stopPropagation();
    onTileClick(tile.id);
  });

  const inner = document.createElement("div");
  inner.className = "tile-inner";
  inner.textContent = tile.value;

  tileElement.appendChild(inner);
  dom.tileContainer.appendChild(tileElement);

  setTileElement(tile.id, tileElement);

  setTimeout(() => {
    tileElement.classList.remove("tile-new", "tile-merged");
  }, 260);

  return tileElement;
}

export function setTilePosition(tileElement, position) {
  if (!tileElement) return;

  tileElement.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
}

export function removeTileElement(tileId) {
  const element = getTileElement(tileId);

  if (element) {
    element.remove();
  }

  deleteTileElement(tileId);
}

export function refreshTileClass(tile, className) {
  const element = getTileElement(tile.id);

  if (element) {
    element.className = className;
  }
}
