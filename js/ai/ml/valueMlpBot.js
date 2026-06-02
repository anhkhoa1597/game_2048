import { getValidMoves, simulateMove } from "../boardSimulator.js";
import { evaluateBoardWithWeights } from "../weightedEvaluator.js";
import { CHAMPION_WEIGHTS } from "../trainedWeights.js";
import { encodeBoardForValueModel } from "./boardEncoding.js";
import { VALUE_MLP_V1 } from "./valueMlpWeights.js";

const FUTURE_WEIGHT = 0.72;
const GAME_OVER_PENALTY = 1;

function linear(input, layer) {
  const output = [];

  for (let outIndex = 0; outIndex < layer.weight.length; outIndex++) {
    let sum = layer.bias[outIndex];
    const row = layer.weight[outIndex];

    for (let inIndex = 0; inIndex < input.length; inIndex++) {
      sum += input[inIndex] * row[inIndex];
    }

    output.push(sum);
  }

  return output;
}

function relu(values) {
  return values.map((value) => (value > 0 ? value : 0));
}

function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
}

export function evaluateBoardWithValueModel(board, scoreGained = 0) {
  if (!VALUE_MLP_V1) {
    return evaluateBoardWithWeights(board, scoreGained, CHAMPION_WEIGHTS);
  }

  const { linear1, linear2, linear3 } = VALUE_MLP_V1.layers;
  const input = encodeBoardForValueModel(board);
  const h1 = relu(linear(input, linear1));
  const h2 = relu(linear(h1, linear2));
  const output = linear(h2, linear3);

  return sigmoid(output[0]);
}

export function getValueMlpMove(board) {
  const validMoves = getValidMoves(board);

  if (validMoves.length === 0) {
    return null;
  }

  let bestMove = null;
  let bestScore = -Infinity;

  for (const direction of validMoves) {
    const result = simulateMove(board, direction);
    const score =
      evaluateBoardWithValueModel(result.board, result.scoreGained) +
      result.scoreGained / 100000;

    if (score > bestScore) {
      bestScore = score;
      bestMove = direction;
    }
  }

  return bestMove;
}

function getBestValueScoreAtDepth(board, depth, beamWidth) {
  const validMoves = getValidMoves(board);

  if (validMoves.length === 0) {
    return evaluateBoardWithValueModel(board, 0) - GAME_OVER_PENALTY;
  }

  const candidates = validMoves
    .map((direction) => {
      const result = simulateMove(board, direction);
      const score =
        evaluateBoardWithValueModel(result.board, result.scoreGained) +
        result.scoreGained / 100000;

      return { result, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, beamWidth);

  let bestScore = -Infinity;

  for (const candidate of candidates) {
    const score =
      candidate.score +
      (depth <= 1
        ? 0
        : getBestValueScoreAtDepth(
            candidate.result.board,
            depth - 1,
            beamWidth,
          ) * FUTURE_WEIGHT);

    if (score > bestScore) {
      bestScore = score;
    }
  }

  return bestScore;
}

export function getValueMlpBeamMove(board, depth = 2, beamWidth = 2) {
  const validMoves = getValidMoves(board);

  if (validMoves.length === 0) {
    return null;
  }

  let bestMove = null;
  let bestScore = -Infinity;

  for (const direction of validMoves) {
    const result = simulateMove(board, direction);
    const currentScore =
      evaluateBoardWithValueModel(result.board, result.scoreGained) +
      result.scoreGained / 100000;
    const futureScore =
      depth <= 1
        ? 0
        : getBestValueScoreAtDepth(result.board, depth - 1, beamWidth) *
          FUTURE_WEIGHT;
    const score = currentScore + futureScore;

    if (score > bestScore) {
      bestScore = score;
      bestMove = direction;
    }
  }

  return bestMove;
}
