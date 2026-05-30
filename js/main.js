import { dom, closeMenu, isClickInsideMenu, toggleMenu } from "./ui.js";

import {
  applyTheme,
  cancelPowerMode,
  changeBoardSize,
  getBoardValues,
  handleResize,
  initGame,
  keepPlayingAfterWin,
  move,
  setActivePower,
  startNewGame,
  undoMove,
} from "./game.js";

import { getBotMove, BOT_NAMES } from "./ai/botRegistry.js";
let touchStartX = 0;
let touchStartY = 0;
let autoPlayTimer = null;
let isAutoPlaying = false;

let currentBotName = BOT_NAMES.AUTO_STRONG;
function getAutoPlayDelay(botName) {
  if (botName === BOT_NAMES.EXPECTIMAX_STRONG) {
    return 180;
  }

  if (botName === BOT_NAMES.FAST) {
    return 140;
  }

  if (botName === BOT_NAMES.DEPTH_2) {
    return 80;
  }
  if (botName === BOT_NAMES.AUTO_STRONG) {
    return 100;
  }

  if (botName === BOT_NAMES.AUTO_FAST) {
    return 60;
  }

  return 140;
}
function handleKeydown(event) {
  if (event.key === "Escape") {
    cancelPowerMode();
    closeMenu();
    return;
  }

  if (event.key === "f" || event.key === "F") {
    toggleAutoPlay(BOT_NAMES.AUTO_FAST);
    return;
  }

  if (event.key === "m" || event.key === "M") {
    toggleAutoPlay(BOT_NAMES.AUTO_STRONG);
    return;
  }
  if (event.key === "x" || event.key === "X") {
    stopAutoPlay();
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

function startAutoPlay(botName = currentBotName) {
  currentBotName = botName;

  if (isAutoPlaying) {
    stopAutoPlay();
  }

  const delay = getAutoPlayDelay(currentBotName);

  isAutoPlaying = true;

  console.log(`Auto play started: ${currentBotName}, delay=${delay}ms`);

  autoPlayTimer = setInterval(() => {
    const board = getBoardValues();
    const aiMove = getBotMove(currentBotName, board);

    if (!aiMove) {
      stopAutoPlay();
      console.log("Auto play stopped: no valid moves");
      return;
    }

    move(aiMove);
  }, delay);
}

function stopAutoPlay() {
  if (autoPlayTimer) {
    clearInterval(autoPlayTimer);
    autoPlayTimer = null;
  }

  isAutoPlaying = false;
  console.log("Auto play stopped");
}

function toggleAutoPlay(botName = currentBotName) {
  if (isAutoPlaying && currentBotName === botName) {
    stopAutoPlay();
    return;
  }

  startAutoPlay(botName);
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

const scoreBox = document.getElementById("scoreBox");
const bestBox = document.getElementById("bestBox");
let secretModeEnabled = false;
let enableStep = "score";
let scoreClickCount = 0;
let bestClickCount = 0;
let disableStep = "score";
function enableSecretMode() {
  secretModeEnabled = true;
  console.log("Secret mode enabled!");
  startAutoPlay(BOT_NAMES.AUTO_STRONG);
}

function disableSecretMode() {
  secretModeEnabled = false;
  console.log("Secret mode disabled!");
  stopAutoPlay();
}

function resetEnableSequence() {
  enableStep = "score";
  scoreClickCount = 0;
  bestClickCount = 0;
}
function resetDisableSequence() {
  disableStep = "score";
}

scoreBox.addEventListener("click", () => {
  if (secretModeEnabled) {
    disableStep = "best";
    return;
  }
  if (enableStep !== "score") {
    resetEnableSequence();
  }
  scoreClickCount++;
  if (scoreClickCount === 3) {
    enableStep = "best";
  }
});

bestBox.addEventListener("click", () => {
  if (secretModeEnabled) {
    if (disableStep === "best") {
      disableSecretMode();
      resetDisableSequence();
    } else {
      resetDisableSequence();
    }
    return;
  }
  if (enableStep !== "best") {
    resetEnableSequence();
    return;
  }
  bestClickCount++;

  if (bestClickCount === 3) {
    enableSecretMode();
    resetEnableSequence();
  }
});
