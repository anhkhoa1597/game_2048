import { getValidMoves, simulateMove } from "../core/boardSimulator.js";
import { NTUPLE_TD_V1 } from "../models/ntupleWeights.js";

// export const DEFAULT_NTUPLE_FUTURE_WEIGHT = 0.72;
export const DEFAULT_NTUPLE_FUTURE_WEIGHT = 0.49;
const GAME_OVER_PENALTY = 100000;

let cachedModel = null;
let activeModel = NTUPLE_TD_V1;

export function setNtupleModel(model) {
  if (!model || !Array.isArray(model.patterns) || !Array.isArray(model.weights) || model.patterns.length !== model.weights.length) {
    throw new Error("Invalid n-tuple model");
  }
  activeModel = model;
  cachedModel = null;
}

function getTilePower(tile, maxTilePower) {
  if (tile === 0) {
    return 0;
  }

  return Math.min(Math.log2(tile), maxTilePower);
}

function encodeBoardPowers(board, maxTilePower) {
  const values = [];

  for (const row of board) {
    for (const tile of row) {
      values.push(getTilePower(tile, maxTilePower));
    }
  }

  return values;
}

function getTupleKey(values, pattern, encodingBase) {
  let key = 0;

  for (const index of pattern) {
    key = key * encodingBase + values[index];
  }

  return key;
}

function getModel() {
  if (!activeModel) {
    return null;
  }

  if (cachedModel) {
    return cachedModel;
  }

  cachedModel = {
    encodingBase: activeModel.metadata?.encodingBase ?? 16,
    maxTilePower: activeModel.metadata?.maxTilePower ?? 15,
    patterns: activeModel.patterns,
    weights: activeModel.weights.map((entries) => {
      const map = new Map();

      for (const [key, value] of entries) {
        map.set(key, value);
      }

      return map;
    }),
  };

  return cachedModel;
}

export function evaluateBoardWithNtuple(board) {
  const model = getModel();

  if (!model) {
    return 0;
  }

  const values = encodeBoardPowers(board, model.maxTilePower);
  let total = 0;

  for (
    let patternIndex = 0;
    patternIndex < model.patterns.length;
    patternIndex++
  ) {
    const key = getTupleKey(
      values,
      model.patterns[patternIndex],
      model.encodingBase,
    );
    total += model.weights[patternIndex].get(key) || 0;
  }

  return total;
}

function getNtupleMoveScore(result) {
  return result.scoreGained + evaluateBoardWithNtuple(result.board);
}

export function getNtupleTdMove(board) {
  const validMoves = getValidMoves(board);

  if (validMoves.length === 0) {
    return null;
  }

  let bestMove = null;
  let bestScore = -Infinity;

  for (const direction of validMoves) {
    const result = simulateMove(board, direction);
    const score = getNtupleMoveScore(result);

    if (score > bestScore) {
      bestScore = score;
      bestMove = direction;
    }
  }

  return bestMove;
}

function getBestNtupleScoreAtDepth(
  board,
  depth,
  beamWidth,
  futureWeight = DEFAULT_NTUPLE_FUTURE_WEIGHT,
) {
  const validMoves = getValidMoves(board);

  if (validMoves.length === 0) {
    return evaluateBoardWithNtuple(board) - GAME_OVER_PENALTY;
  }

  const candidates = validMoves
    .map((direction) => {
      const result = simulateMove(board, direction);
      return {
        result,
        score: getNtupleMoveScore(result),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, beamWidth);

  let bestScore = -Infinity;

  for (const candidate of candidates) {
    const score =
      candidate.score +
      (depth <= 1
        ? 0
        : getBestNtupleScoreAtDepth(
            candidate.result.board,
            depth - 1,
            beamWidth,
            futureWeight,
          ) * futureWeight);

    if (score > bestScore) {
      bestScore = score;
    }
  }

  return bestScore;
}

export function getNtupleTdBeamMove(
  board,
  depth = 2,
  beamWidth = 2,
  futureWeight = DEFAULT_NTUPLE_FUTURE_WEIGHT,
) {
  const validMoves = getValidMoves(board);

  if (validMoves.length === 0) {
    return null;
  }

  let bestMove = null;
  let bestScore = -Infinity;

  for (const direction of validMoves) {
    const result = simulateMove(board, direction);
    const score =
      getNtupleMoveScore(result) +
      (depth <= 1
        ? 0
        : getBestNtupleScoreAtDepth(
            result.board,
            depth - 1,
            beamWidth,
            futureWeight,
          ) * futureWeight);

    if (score > bestScore) {
      bestScore = score;
      bestMove = direction;
    }
  }

  return bestMove;
}
