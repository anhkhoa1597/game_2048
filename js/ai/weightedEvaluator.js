import { extractBoardFeatures } from "./evaluator.js";

export const DEFAULT_WEIGHTS = {
  emptyCells: 100,
  scoreGained: 1.2,
  maxTile: 0.2,
  maxTilePower: 0,
  cornerGradient: 120,
  smoothness: 8,
  monotonicity: 4,
  mergePotential: 60,
  snakeScore: 6,
  maxTileInCorner: 6,
  maxTileNotInCorner: -3,
};

export function evaluateBoardWithWeights(
  board,
  scoreGained = 0,
  weights = DEFAULT_WEIGHTS,
) {
  const f = extractBoardFeatures(board, scoreGained);

  let boardScore = 0;

  boardScore += f.emptyCells * weights.emptyCells;
  boardScore += f.scoreGained * weights.scoreGained;
  boardScore += f.maxTile * weights.maxTile;
  boardScore += f.maxTilePower * weights.maxTilePower;
  boardScore += f.cornerGradient * weights.cornerGradient;
  boardScore += f.smoothness * weights.smoothness;
  boardScore += f.monotonicity * weights.monotonicity;
  boardScore += f.mergePotential * weights.mergePotential;
  boardScore += f.snakeScore * weights.snakeScore;

  if (f.maxTileInCorner) {
    boardScore += f.maxTile * weights.maxTileInCorner;
  } else {
    boardScore += f.maxTile * weights.maxTileNotInCorner;
  }

  return boardScore;
}

export function cloneWeights(weights) {
  return {
    emptyCells: weights.emptyCells,
    scoreGained: weights.scoreGained,
    maxTile: weights.maxTile,
    maxTilePower: weights.maxTilePower,
    cornerGradient: weights.cornerGradient,
    smoothness: weights.smoothness,
    monotonicity: weights.monotonicity,
    mergePotential: weights.mergePotential,
    snakeScore: weights.snakeScore,
    maxTileInCorner: weights.maxTileInCorner,
    maxTileNotInCorner: weights.maxTileNotInCorner,
  };
}

export function createRandomWeights(
  baseWeights = DEFAULT_WEIGHTS,
  variation = 0.3,
) {
  const weights = {};

  for (const key in baseWeights) {
    const baseValue = baseWeights[key];
    const randomFactor = 1 + (Math.random() * 2 - 1) * variation;

    weights[key] = baseValue * randomFactor;
  }

  return weights;
}

export function mutateWeights(
  weights,
  mutationRate = 0.2,
  mutationStrength = 0.25,
) {
  const mutated = cloneWeights(weights);

  for (const key in mutated) {
    if (Math.random() < mutationRate) {
      const randomFactor = 1 + (Math.random() * 2 - 1) * mutationStrength;
      mutated[key] *= randomFactor;
    }
  }

  return mutated;
}
