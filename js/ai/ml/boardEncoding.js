import { extractBoardFeatures } from "../evaluator.js";

export const VALUE_INPUT_SIZE = 18;
export const RANKER_INPUT_SIZE = 52;
export const NORMALIZATION_DIVISOR = 16;

const MOVE_TO_ONE_HOT = {
  up: [1, 0, 0, 0],
  down: [0, 1, 0, 0],
  left: [0, 0, 1, 0],
  right: [0, 0, 0, 1],
};

export function tileToPower(tile) {
  if (tile === 0) {
    return 0;
  }

  return Math.log2(tile);
}

export function getMaxTileForEncoding(board) {
  let maxTile = 0;

  for (const row of board) {
    for (const value of row) {
      if (value > maxTile) {
        maxTile = value;
      }
    }
  }

  return maxTile;
}

export function countEmptyCellsForEncoding(board) {
  let count = 0;

  for (const row of board) {
    for (const value of row) {
      if (value === 0) {
        count++;
      }
    }
  }

  return count;
}

export function encodeBoardForValueModel(board) {
  const encoded = [];
  const size = board.length;
  const cellCount = size * size;
  const maxTile = getMaxTileForEncoding(board);

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      encoded.push(tileToPower(board[row][col]) / NORMALIZATION_DIVISOR);
    }
  }

  encoded.push(countEmptyCellsForEncoding(board) / cellCount);
  encoded.push(tileToPower(maxTile) / NORMALIZATION_DIVISOR);

  return encoded;
}

export function encodeAfterstateForRanker(board, scoreGained = 0) {
  const encoded = encodeBoardForValueModel(board);
  const features = extractBoardFeatures(board, scoreGained);
  const size = board.length;
  const cellCount = size * size;

  encoded.push(Math.min(scoreGained / 4096, 1));
  encoded.push(features.cornerGradient / 100);
  encoded.push(features.smoothness / cellCount);
  encoded.push(features.monotonicity / cellCount);
  encoded.push(features.mergePotential / cellCount);
  encoded.push(features.snakeScore / (cellCount * cellCount));
  encoded.push(features.maxTileInCorner);
  encoded.push(features.maxTileNotInCorner);
  encoded.push(features.maxTilePower / NORMALIZATION_DIVISOR);
  encoded.push(features.maxTile / 65536);

  return encoded;
}

export function encodeMoveCandidateForRanker(
  boardBefore,
  direction,
  afterstate,
  scoreGained = 0,
) {
  const before = encodeBoardForValueModel(boardBefore);
  const after = encodeAfterstateForRanker(afterstate, scoreGained);
  const beforeEmpty = countEmptyCellsForEncoding(boardBefore);
  const afterEmpty = countEmptyCellsForEncoding(afterstate);
  const beforeMaxPower = tileToPower(getMaxTileForEncoding(boardBefore));
  const afterMaxPower = tileToPower(getMaxTileForEncoding(afterstate));
  const cellCount = boardBefore.length * boardBefore.length;

  return [
    ...before,
    ...after,
    ...(MOVE_TO_ONE_HOT[direction] || [0, 0, 0, 0]),
    (afterEmpty - beforeEmpty) / cellCount,
    (afterMaxPower - beforeMaxPower) / NORMALIZATION_DIVISOR,
  ];
}

export function normalizeValueTarget({
  finalScore,
  finalMaxTile,
  scoreNormalizer = 80000,
}) {
  const scoreValue = Math.min(finalScore / scoreNormalizer, 1);
  const winValue = finalMaxTile >= 2048 ? 1 : 0;
  const tileValue = Math.min(tileToPower(finalMaxTile) / 12, 1);

  return scoreValue * 0.55 + winValue * 0.3 + tileValue * 0.15;
}
