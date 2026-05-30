import { getValidMoves, simulateMove } from "./boardSimulator.js";
import {
  DEFAULT_WEIGHTS,
  evaluateBoardWithWeights,
} from "./weightedEvaluator.js";

const FUTURE_WEIGHT = 0.75;

export function getWeightedDepthMove(
  board,
  weights = DEFAULT_WEIGHTS,
  depth = 2,
) {
  const validMoves = getValidMoves(board);

  if (validMoves.length === 0) {
    return null;
  }

  let bestMove = null;
  let bestScore = -Infinity;

  for (const direction of validMoves) {
    const result = simulateMove(board, direction);
    const score = evaluateMoveResult(result, weights, depth);

    if (score > bestScore) {
      bestScore = score;
      bestMove = direction;
    }
  }

  return bestMove;
}

function evaluateMoveResult(result, weights, depth) {
  const currentScore = evaluateBoardWithWeights(
    result.board,
    result.scoreGained,
    weights,
  );

  if (depth <= 1) {
    return currentScore;
  }

  const futureScore = getBestScoreAtDepth(result.board, weights, depth - 1);

  return currentScore + futureScore * FUTURE_WEIGHT;
}

function getBestScoreAtDepth(board, weights, depth) {
  const validMoves = getValidMoves(board);

  if (validMoves.length === 0) {
    return -100000;
  }

  let bestScore = -Infinity;

  for (const direction of validMoves) {
    const result = simulateMove(board, direction);
    const score = evaluateMoveResult(result, weights, depth);

    if (score > bestScore) {
      bestScore = score;
    }
  }

  return bestScore;
}
