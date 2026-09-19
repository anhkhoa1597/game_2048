import { getValidMoves, simulateMove } from "../core/boardSimulator.js";
import {
  DEFAULT_WEIGHTS,
  evaluateBoardWithWeights,
} from "../core/weightedEvaluator.js";

const FUTURE_WEIGHT = 0.75;

function getBoardCacheKey(board, scoreGained) {
  return `${scoreGained}|${board.flat().join(",")}`;
}
function evaluateBoardCached(board, scoreGained, weights, scoreCache) {
  const key = getBoardCacheKey(board, scoreGained);

  if (scoreCache.has(key)) {
    return scoreCache.get(key);
  }

  const score = evaluateBoardWithWeights(board, scoreGained, weights);
  scoreCache.set(key, score);

  return score;
}
export function getWeightedDepthMove(
  board,
  weights = DEFAULT_WEIGHTS,
  depth = 2,
) {
  const scoreCache = new Map();
  const validMoves = getValidMoves(board);

  if (validMoves.length === 0) {
    return null;
  }

  let bestMove = null;
  let bestScore = -Infinity;

  for (const direction of validMoves) {
    const result = simulateMove(board, direction);
    const score = evaluateMoveResult(result, weights, depth, scoreCache);

    if (score > bestScore) {
      bestScore = score;
      bestMove = direction;
    }
  }

  return bestMove;
}

function evaluateMoveResult(result, weights, depth, scoreCache) {
  const currentScore = evaluateBoardWithWeights(
    result.board,
    result.scoreGained,
    weights,
    scoreCache,
  );

  if (depth <= 1) {
    return currentScore;
  }

  const futureScore = getBestScoreAtDepth(
    result.board,
    weights,
    depth - 1,
    scoreCache,
  );

  return currentScore + futureScore * FUTURE_WEIGHT;
}

function getBestScoreAtDepth(board, weights, depth, scoreCache) {
  const validMoves = getValidMoves(board);

  if (validMoves.length === 0) {
    return -100000;
  }

  let bestScore = -Infinity;

  for (const direction of validMoves) {
    const result = simulateMove(board, direction);
    const score = evaluateMoveResult(result, weights, depth, scoreCache);

    if (score > bestScore) {
      bestScore = score;
    }
  }

  return bestScore;
}

function getTopBeamCandidates(board, weights, beamWidth, scoreCache) {
  const validMoves = getValidMoves(board);

  const candidates = validMoves.map((direction) => {
    const result = simulateMove(board, direction);

    const immediateScore = evaluateBoardCached
      ? evaluateBoardCached(
          result.board,
          result.scoreGained,
          weights,
          scoreCache,
        )
      : evaluateBoardWithWeights(result.board, result.scoreGained, weights);

    return {
      direction,
      result,
      immediateScore,
    };
  });

  candidates.sort((a, b) => b.immediateScore - a.immediateScore);

  return candidates.slice(0, beamWidth);
}
function getBestBeamScoreAtDepth(board, weights, depth, beamWidth, scoreCache) {
  const validMoves = getValidMoves(board);

  if (validMoves.length === 0) {
    return -100000;
  }

  const candidates = getTopBeamCandidates(
    board,
    weights,
    beamWidth,
    scoreCache,
  );

  let bestScore = -Infinity;

  for (const candidate of candidates) {
    const score = evaluateBeamMoveResult(
      candidate.result,
      weights,
      depth,
      beamWidth,
      scoreCache,
    );

    if (score > bestScore) {
      bestScore = score;
    }
  }

  return bestScore;
}
function evaluateBeamMoveResult(result, weights, depth, beamWidth, scoreCache) {
  const currentScore = evaluateBoardCached
    ? evaluateBoardCached(result.board, result.scoreGained, weights, scoreCache)
    : evaluateBoardWithWeights(result.board, result.scoreGained, weights);

  if (depth <= 1) {
    return currentScore;
  }

  const futureScore = getBestBeamScoreAtDepth(
    result.board,
    weights,
    depth - 1,
    beamWidth,
    scoreCache,
  );

  return currentScore + futureScore * FUTURE_WEIGHT;
}
export function getWeightedBeamDepthMove(
  board,
  weights = DEFAULT_WEIGHTS,
  depth = 3,
  beamWidth = 2,
) {
  const scoreCache = new Map();
  const validMoves = getValidMoves(board);

  if (validMoves.length === 0) {
    return null;
  }

  let bestMove = null;
  let bestScore = -Infinity;

  for (const direction of validMoves) {
    const result = simulateMove(board, direction);
    const score = evaluateBeamMoveResult(
      result,
      weights,
      depth,
      beamWidth,
      scoreCache,
    );

    if (score > bestScore) {
      bestScore = score;
      bestMove = direction;
    }
  }

  return bestMove;
}
