import { getValidMoves, simulateMove } from "./boardSimulator.js";
import { evaluateBoard } from "./evaluator.js";

const FUTURE_WEIGHT = 0.75;

export function getDepthMove(board, depth = 2) {
  const validMoves = getValidMoves(board);

  if (validMoves.length === 0) {
    return null;
  }

  let bestMove = null;
  let bestScore = -Infinity;

  for (const direction of validMoves) {
    const result = simulateMove(board, direction);
    const score = evaluateMoveResult(result, depth);

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
