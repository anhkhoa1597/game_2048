import {
  getDirectionalRandomTileBoards,
  getValidMoves,
  simulateMove,
} from "./boardSimulator.js";

import { evaluateBoard } from "./evaluator.js";

const SEARCH_DEPTH = 2;
const GAME_OVER_PENALTY = 100000;

export function getExpectimaxMove(board) {
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
      expectChanceNode(moveResult.board, SEARCH_DEPTH - 1, direction);

    if (score > bestScore) {
      bestScore = score;
      bestMove = direction;
    }
  }

  return bestMove;
}

function expectMaxNode(board, depth) {
  if (depth <= 0) {
    return evaluateBoard(board, 0);
  }

  const validMoves = getValidMoves(board);

  if (validMoves.length === 0) {
    return evaluateBoard(board, 0) - GAME_OVER_PENALTY;
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

function expectChanceNode(board, depth, lastMoveDirection) {
  const outcomes = getDirectionalRandomTileBoards(board, lastMoveDirection);

  if (outcomes.length === 0) {
    return expectMaxNode(board, depth);
  }

  let expectedScore = 0;

  for (const outcome of outcomes) {
    const score = expectMaxNode(outcome.board, depth);
    expectedScore += score * outcome.probability;
  }

  return expectedScore;
}
