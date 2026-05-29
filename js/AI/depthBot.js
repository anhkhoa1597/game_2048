import { getValidMoves, simulateMove } from "./boardSimulator.js";
import { evaluateBoard } from "./evaluator.js";

const FUTURE_WEIGHT = 0.75;

export function getDepthMove(board, depth = 2) {
  const validMoves = getValidMoves(board);

  if (validMoves.length === 0) {
    return null;
  }

  const safeMoves = validMoves.filter((direction) => {
    const result = simulateMove(board, direction);
    return getCornerLockPenalty(board, result.board) === 0;
  });

  const movesToCheck = safeMoves.length > 0 ? safeMoves : validMoves;

  let bestMove = null;
  let bestScore = -Infinity;

  for (const direction of movesToCheck) {
    const result = simulateMove(board, direction);

    const cornerPenalty = getCornerLockPenalty(board, result.board);
    const score = evaluateMoveResult(result, depth) - cornerPenalty;

    if (score > bestScore) {
      bestScore = score;
      bestMove = direction;
    }
  }

  return bestMove;
}

function evaluateMoveResult(result, depth) {
  const currentScore = evaluateBoard(result.board, result.scoreGained);

  if (depth <= 1) {
    return currentScore;
  }

  const futureScore = getBestScoreAtDepth(result.board, depth - 1);

  return currentScore + futureScore * FUTURE_WEIGHT;
}

function getBestScoreAtDepth(board, depth) {
  const validMoves = getValidMoves(board);

  if (validMoves.length === 0) {
    return -100000;
  }

  let bestScore = -Infinity;

  for (const direction of validMoves) {
    const result = simulateMove(board, direction);
    const score = evaluateMoveResult(result, depth);

    if (score > bestScore) {
      bestScore = score;
    }
  }

  return bestScore;
}

function getMaxTile(board) {
  let maxTile = 0;

  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      maxTile = Math.max(maxTile, board[row][col]);
    }
  }

  return maxTile;
}

function getMaxTilePosition(board) {
  const maxTile = getMaxTile(board);

  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      if (board[row][col] === maxTile) {
        return { row, col, value: maxTile };
      }
    }
  }

  return null;
}

function isCornerPosition(board, position) {
  if (!position) return false;

  const lastIndex = board.length - 1;

  return (
    (position.row === 0 && position.col === 0) ||
    (position.row === 0 && position.col === lastIndex) ||
    (position.row === lastIndex && position.col === 0) ||
    (position.row === lastIndex && position.col === lastIndex)
  );
}

function isSamePosition(a, b) {
  if (!a || !b) return false;

  return a.row === b.row && a.col === b.col;
}

function getCornerLockPenalty(beforeBoard, afterBoard) {
  const beforeMax = getMaxTilePosition(beforeBoard);
  const afterMax = getMaxTilePosition(afterBoard);

  if (!beforeMax || !afterMax) return 0;

  const maxWasInCorner = isCornerPosition(beforeBoard, beforeMax);

  if (!maxWasInCorner) return 0;

  const maxStayedSameCorner = isSamePosition(beforeMax, afterMax);

  if (maxStayedSameCorner) return 0;

  return beforeMax.value * 20;
}
