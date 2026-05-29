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

import { getSmartMove } from "./ai/smartBot.js";
import { getLookaheadMove } from "./ai/lookaheadBot.js";
import { getDepthMove } from "./ai/depthBot.js";
import { getHeuristicMove } from "./ai/heuristicBot.js";
import { getExpectimaxMove } from "./ai/expectimaxBot.js";

let touchStartX = 0;
let touchStartY = 0;
let autoPlayTimer = null;
let isAutoPlaying = false;

function handleKeydown(event) {
  if (event.key === "Escape") {
    cancelPowerMode();
    closeMenu();
    return;
  }
  if (event.key === "b" || event.key === "B") {
    const board = getBoardValues();
    const aiMove = getSmartMove(board);
    console.log("AI move:", aiMove);

    if (aiMove) {
      move(aiMove);
    }

    return;
  }
  if (event.key === "v" || event.key === "V") {
    const board = getBoardValues();
    const aiMove = getLookaheadMove(board);

    console.log("Lookahead AI move:", aiMove);

    if (aiMove) {
      move(aiMove);
    }

    return;
  }
  if (event.key === "g" || event.key === "G") {
    const board = getBoardValues();
    const aiMove = getDepthMove(board, 3);

    console.log("Depth AI move:", aiMove);

    if (aiMove) {
      move(aiMove);
    }

    return;
  }

  if (event.key === "h" || event.key === "H") {
    const board = getBoardValues();
    const aiMove = getHeuristicMove(board);

    console.log("Heuristic AI move:", aiMove);

    if (aiMove) {
      move(aiMove);
    }

    return;
  }

  if (event.key === "e" || event.key === "E") {
    const board = getBoardValues();
    const aiMove = getExpectimaxMove(board, 2);

    console.log("Expectimax AI move:", aiMove);

    if (aiMove) {
      move(aiMove);
    }

    return;
  }
  if (event.key === "m" || event.key === "M") {
    toggleAutoPlay();
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

function toggleAutoPlay() {
  if (isAutoPlaying) {
    clearInterval(autoPlayTimer);
    autoPlayTimer = null;
    isAutoPlaying = false;
    console.log("Auto play stopped");
    return;
  }

  isAutoPlaying = true;
  console.log("Auto play started");

  autoPlayTimer = setInterval(() => {
    const board = getBoardValues();
    const aiMove = getExpectimaxMove(board, 2);

    if (!aiMove) {
      clearInterval(autoPlayTimer);
      autoPlayTimer = null;
      isAutoPlaying = false;
      console.log("Auto play stopped: no valid moves");
      return;
    }

    move(aiMove);
  }, 180);
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
  toggleAutoPlay();
}
function disableSecretMode() {
  secretModeEnabled = false;
  console.log("Secret mode disabled!");
  toggleAutoPlay();
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
