export function getGameStorageKey(size) {
  return `game2048-board-${size}`;
}

export function getBestStorageKey(size) {
  return `bestScore2048-board-${size}`;
}

export function getCurrentBoardSize() {
  return Number(localStorage.getItem("currentBoardSize2048")) || 4;
}

export function setCurrentBoardSize(size) {
  localStorage.setItem("currentBoardSize2048", String(size));
}

export function getTheme() {
  return localStorage.getItem("theme2048") || "classic";
}

export function setTheme(theme) {
  localStorage.setItem("theme2048", theme);
}

export function loadBestScore(size) {
  return Number(localStorage.getItem(getBestStorageKey(size))) || 0;
}

export function saveBestScore(size, score) {
  localStorage.setItem(getBestStorageKey(size), String(score));
}

export function saveGameData(size, data) {
  localStorage.setItem(getGameStorageKey(size), JSON.stringify(data));
}

export function loadGameData(size) {
  const raw = localStorage.getItem(getGameStorageKey(size));

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function removeGameData(size) {
  localStorage.removeItem(getGameStorageKey(size));
}
