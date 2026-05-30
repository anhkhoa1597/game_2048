import {
  getRandomTileBoards,
  getValidMoves,
  simulateMove,
} from "./boardSimulator.js";

import { evaluateBoard } from "./evaluator.js";
export function getExpectimaxMove(board, depth = 2, options = {}) {
  const validMoves = getValidMoves(board);

  if (validMoves.length === 0) {
    return null;
  }

  const randomOptions = options.randomOptions || getRandomOptions(board);

  let bestMove = null;
  let bestScore = -Infinity;

  for (const direction of validMoves) {
    const moveResult = simulateMove(board, direction);

    const score =
      evaluateBoard(moveResult.board, moveResult.scoreGained) +
      expectChanceNode(moveResult.board, depth - 1, randomOptions);
    // console.log(direction, {
    //   score,
    //   board: moveResult.board,
    // });
    if (score > bestScore) {
      bestScore = score;
      bestMove = direction;
    }
  }

  return bestMove;
}

function expectMaxNode(board, depth, randomOptions) {
  if (depth <= 0) {
    return evaluateBoard(board, 0);
  }

  const validMoves = getValidMoves(board);

  if (validMoves.length === 0) {
    return evaluateBoard(board, 0) - 100000;
  }

  let bestScore = -Infinity;

  for (const direction of validMoves) {
    const moveResult = simulateMove(board, direction);

    const score =
      evaluateBoard(moveResult.board, moveResult.scoreGained) +
      expectChanceNode(moveResult.board, depth - 1, randomOptions);

    if (score > bestScore) {
      bestScore = score;
    }
  }

  return bestScore;
}

function expectChanceNode(board, depth, randomOptions) {
  const outcomes = getRandomTileBoards(board, randomOptions);

  if (outcomes.length === 0) {
    return expectMaxNode(board, depth, randomOptions);
  }

  let expectedScore = 0;

  for (const outcome of outcomes) {
    const score = expectMaxNode(outcome.board, depth, randomOptions);

    expectedScore += score * outcome.probability;
  }

  return expectedScore;
}

function getRandomOptions(board) {
  const size = board.length;

  if (size <= 4) {
    return {
      mode: "full",
    };
  }

  if (size <= 6) {
    return {
      mode: "sample",
      limit: 8,
    };
  }

  return {
    mode: "sample",
    limit: 6,
  };
}
