import {
  getDirectionalRandomTileBoards,
  getValidMoves,
  simulateMove,
} from "./boardSimulator.js";

import { evaluateBoardWithWeights } from "./weightedEvaluator.js";
import { CHAMPION_WEIGHTS } from "./trainedWeights.js";

const SEARCH_DEPTH = 2;
const GAME_OVER_PENALTY = 100000;

export function getWeightedExpectimaxMove(
  board,
  weights = CHAMPION_WEIGHTS,
  depth = 2,
) {
  const validMoves = getValidMoves(board);

  if (validMoves.length === 0) {
    return null;
  }

  let bestMove = null;
  let bestScore = -Infinity;

  for (const direction of validMoves) {
    const moveResult = simulateMove(board, direction);

    const score =
      moveResult.scoreGained +
      expectChanceNode(moveResult.board, SEARCH_DEPTH - 1, direction, weights);

    if (score > bestScore) {
      bestScore = score;
      bestMove = direction;
    }
  }

  return bestMove;
}

function expectMaxNode(board, depth, weights) {
  if (depth <= 0) {
    return evaluateBoardWithWeights(board, 0, weights)
  }

  const validMoves = getValidMoves(board);

  if (validMoves.length === 0) {
    return evaluateBoardWithWeights(board, 0, weights) - GAME_OVER_PENALTY;
  }

  let bestScore = -Infinity;

  for (const direction of validMoves) {
    const moveResult = simulateMove(board, direction);

    const score =
      moveResult.scoreGained +
      expectChanceNode(moveResult.board, depth - 1, direction);

    if (score > bestScore) {
      bestScore = score;
    }
  }

  return bestScore;
}

function expectChanceNode(board, depth, lastMoveDirection, weights) {
  const outcomes = getDirectionalRandomTileBoards(board, lastMoveDirection);

  if (outcomes.length === 0) {
    return expectMaxNode(board, depth, weight);
  }

  let expectedScore = 0;

  for (const outcome of outcomes) {
    const score = expectMaxNode(outcome.board, depth);
    expectedScore += score * outcome.probability;
  }

  return expectedScore;
}
