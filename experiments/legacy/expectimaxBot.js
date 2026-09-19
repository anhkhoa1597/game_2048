import {
  getDirectionalRandomTileBoards,
  getValidMoves,
  simulateMove,
} from "../../js/ai/core/boardSimulator.js";

import { evaluateBoardWithWeights } from "../../js/ai/core/weightedEvaluator.js";
import { CHAMPION_WEIGHTS } from "../../js/ai/models/trainedWeights.js";

const SEARCH_DEPTH = 2;
const GAME_OVER_PENALTY = 100000;

function getBoardKey(board) {
  let key = "";

  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      key += board[row][col] + ",";
    }
  }

  return key;
}

function evaluateBoardCached(board, evalCache) {
  const boardKey = getBoardKey(board);

  if (evalCache.has(boardKey)) {
    return evalCache.get(boardKey);
  }

  const score = evaluateBoardWithWeights(board, 0, CHAMPION_WEIGHTS);
  evalCache.set(boardKey, score);

  return score;
}

export function getExpectimaxMove(board) {
  const validMoves = getValidMoves(board);
  const maxCache = new Map();
  const chanceCache = new Map();
  const evalCache = new Map();
  if (validMoves.length === 0) {
    return null;
  }

  let bestMove = null;
  let bestScore = -Infinity;

  for (const direction of validMoves) {
    const moveResult = simulateMove(board, direction);

    const score =
      moveResult.scoreGained +
      expectChanceNode(
        moveResult.board,
        SEARCH_DEPTH - 1,
        direction,
        maxCache,
        chanceCache,
        evalCache,
      );

    if (score > bestScore) {
      bestScore = score;
      bestMove = direction;
    }
  }

  return bestMove;
}

function expectMaxNode(board, depth, maxCache, chanceCache, evalCache) {
  const boardKey = getBoardKey(board);
  const cacheKey = `${depth}|${boardKey}`;

  if (maxCache.has(cacheKey)) {
    return maxCache.get(cacheKey);
  }
  if (depth <= 0) {
    const score = evaluateBoardCached(board, evalCache);
    maxCache.set(cacheKey, score);
    return score;
  }

  const validMoves = getValidMoves(board);

  if (validMoves.length === 0) {
    const score = evaluateBoardCached(board, evalCache) - GAME_OVER_PENALTY;
    maxCache.set(cacheKey, score);
    return score;
  }

  let bestScore = -Infinity;

  for (const direction of validMoves) {
    const moveResult = simulateMove(board, direction);

    const score =
      moveResult.scoreGained +
      expectChanceNode(
        moveResult.board,
        depth - 1,
        direction,
        maxCache,
        chanceCache,
        evalCache,
      );

    if (score > bestScore) {
      bestScore = score;
    }
  }

  maxCache.set(cacheKey, bestScore);
  return bestScore;
}

function expectChanceNode(
  board,
  depth,
  lastMoveDirection,
  maxCache,
  chanceCache,
  evalCache,
) {
  const outcomes = getDirectionalRandomTileBoards(board, lastMoveDirection);

  if (outcomes.length === 0) {
    const score = expectMaxNode(board, depth, maxCache, chanceCache, evalCache);
    chanceCache.set(cacheKey, score);
    return score;
  }

  let expectedScore = 0;

  for (const outcome of outcomes) {
    const score = expectMaxNode(
      outcome.board,
      depth,
      maxCache,
      chanceCache,
      evalCache,
    );
    expectedScore += score * outcome.probability;
  }

  chanceCache.set(cacheKey, expectedScore);
  return expectedScore;
}
