import { dom, closeMenu, isClickInsideMenu, toggleMenu } from "./ui.js";

import {
  applyTheme,
  cancelPowerMode,
  changeBoardSize,
  handleResize,
  initGame,
  keepPlayingAfterWin,
  move,
  setActivePower,
  startNewGame,
  undoMove,
} from "./game.js";

let touchStartX = 0;
let touchStartY = 0;

function handleKeydown(event) {
  if (event.key === "Escape") {
    cancelPowerMode();
    closeMenu();
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

initGame();

window.addEventListener("keydown", handleKeydown);
window.addEventListener("resize", handleResize);

dom.boardElement.addEventListener("touchstart", handleTouchStart, {
  passive: true,
});

dom.boardElement.addEventListener("touchend", handleTouchEnd, {
  passive: true,
});

dom.newGameBtn.addEventListener("click", () => {
  const isConfirm = confirm("Start new game?");

  if (isConfirm) {
    startNewGame({ clearSaved: true });
  }
});

dom.tryAgainBtn.addEventListener("click", () => {
  startNewGame({ clearSaved: true });
});

dom.keepPlayingBtn.addEventListener("click", keepPlayingAfterWin);

dom.menuToggle.addEventListener("click", toggleMenu);

dom.themeSelect.addEventListener("change", (event) => {
  applyTheme(event.target.value);
});

dom.boardSizeSelect.addEventListener("change", (event) => {
  changeBoardSize(event.target.value);
});

dom.resetCurrentBoardBtn.addEventListener("click", () => {
  startNewGame({ clearSaved: true });
  closeMenu();
});

dom.undoBtn.addEventListener("click", undoMove);

dom.swapBtn.addEventListener("click", () => {
  setActivePower("swap");
});

dom.teleportBtn.addEventListener("click", () => {
  setActivePower("teleport");
});

document.addEventListener("click", (event) => {
  if (!isClickInsideMenu(event.target)) {
    closeMenu();
  }
});
