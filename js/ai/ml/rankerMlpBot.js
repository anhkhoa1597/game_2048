import { getValidMoves, simulateMove } from "../boardSimulator.js";
import { evaluateBoardWithWeights } from "../weightedEvaluator.js";
import { CHAMPION_WEIGHTS } from "../trainedWeights.js";
import {
  getWeightedDepthMove,
  getWeightedBeamDepthMove,
} from "../weightedDepthBot.js";
import { encodeMoveCandidateForRanker } from "./boardEncoding.js";
import { RANKER_MLP_V1 } from "./rankerMlpWeights.js";

const FUTURE_WEIGHT = 0.72;
const GAME_OVER_PENALTY = 1000;

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

function softmax(scores) {
  const maxScore = Math.max(...scores);
  const expScores = scores.map((score) => Math.exp(score - maxScore));
  const sum = expScores.reduce((total, value) => total + value, 0);

  return expScores.map((value) => value / sum);
}

export function scoreMoveWithRanker(
  boardBefore,
  direction,
  afterstate,
  scoreGained = 0,
) {
  if (!RANKER_MLP_V1) {
    return evaluateBoardWithWeights(afterstate, scoreGained, CHAMPION_WEIGHTS);
  }

  const input = encodeMoveCandidateForRanker(
    boardBefore,
    direction,
    afterstate,
    scoreGained,
  );

  return scoreEncodedMoveWithRanker(input) + scoreGained / 100000;
}

export function scoreEncodedMoveWithRanker(input) {
  if (!RANKER_MLP_V1) {
    return 0;
  }

  const { linear1, linear2, linear3 } = RANKER_MLP_V1.layers;
  const h1 = relu(linear(input, linear1));
  const h2 = relu(linear(h1, linear2));
  const output = linear(h2, linear3);

  return output[0];
}

export function getRankerMlpMove(board) {
  const rankedMoves = getRankedRankerMoves(board);

  if (rankedMoves.length === 0) {
    return null;
  }

  return rankedMoves[0].direction;
}

export function getRankedRankerMoves(board) {
  const validMoves = getValidMoves(board);

  if (validMoves.length === 0) {
    return [];
  }

  const rankedMoves = [];

  for (const direction of validMoves) {
    const result = simulateMove(board, direction);
    const score = scoreMoveWithRanker(
      board,
      direction,
      result.board,
      result.scoreGained,
    );

    rankedMoves.push({
      direction,
      result,
      score,
    });
  }

  rankedMoves.sort((a, b) => b.score - a.score);

  const probabilities = softmax(rankedMoves.map((move) => move.score));

  return rankedMoves.map((move, index) => ({
    ...move,
    probability: probabilities[index],
  }));
}

function getBestRankerScoreAtDepth(board, depth, beamWidth) {
  const validMoves = getValidMoves(board);

  if (validMoves.length === 0) {
    return -GAME_OVER_PENALTY;
  }

  const candidates = validMoves
    .map((direction) => {
      const result = simulateMove(board, direction);

      return {
        result,
        score: scoreMoveWithRanker(
          board,
          direction,
          result.board,
          result.scoreGained,
        ),
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
        : getBestRankerScoreAtDepth(
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

export function getRankerMlpBeamMove(board, depth = 2, beamWidth = 2) {
  const validMoves = getValidMoves(board);

  if (validMoves.length === 0) {
    return null;
  }

  let bestMove = null;
  let bestScore = -Infinity;

  for (const direction of validMoves) {
    const result = simulateMove(board, direction);
    const currentScore = scoreMoveWithRanker(
      board,
      direction,
      result.board,
      result.scoreGained,
    );
    const futureScore =
      depth <= 1
        ? 0
        : getBestRankerScoreAtDepth(result.board, depth - 1, beamWidth) *
          FUTURE_WEIGHT;
    const score = currentScore + futureScore;

    if (score > bestScore) {
      bestScore = score;
      bestMove = direction;
    }
  }

  return bestMove;
}

export function getRankerMlpSafeMove(
  board,
  {
    minProbability = 0.82,
    minMargin = 1.1,
    fallback = "beam3",
  } = {},
) {
  return getRankerMlpSafeDecision(board, {
    minProbability,
    minMargin,
    fallback,
  }).direction;
}

export function getRankerMlpSafeDecision(
  board,
  {
    minProbability = 0.82,
    minMargin = 1.1,
    fallback = "beam3",
  } = {},
) {
  const rankedMoves = getRankedRankerMoves(board);

  if (rankedMoves.length === 0) {
    return {
      direction: null,
      source: "none",
      probability: 0,
      margin: 0,
    };
  }

  if (rankedMoves.length === 1) {
    return {
      direction: rankedMoves[0].direction,
      source: "forced",
      probability: 1,
      margin: Infinity,
    };
  }

  const best = rankedMoves[0];
  const second = rankedMoves[1];
  const margin = best.score - second.score;

  if (best.probability >= minProbability && margin >= minMargin) {
    return {
      direction: best.direction,
      source: "ml",
      probability: best.probability,
      margin,
    };
  }

  if (fallback === "depth2") {
    return {
      direction: getWeightedDepthMove(board, CHAMPION_WEIGHTS, 2),
      source: "fallback-depth2",
      probability: best.probability,
      margin,
    };
  }

  if (fallback === "depth3") {
    return {
      direction: getWeightedDepthMove(board, CHAMPION_WEIGHTS, 3),
      source: "fallback-depth3",
      probability: best.probability,
      margin,
    };
  }

  return {
    direction: getWeightedBeamDepthMove(board, CHAMPION_WEIGHTS, 3, 2),
    source: "fallback-beam3",
    probability: best.probability,
    margin,
  };
}
