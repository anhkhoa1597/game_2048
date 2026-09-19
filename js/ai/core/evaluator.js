const LOG2_CACHE = {
  0: 0,
  2: 1,
  4: 2,
  8: 3,
  16: 4,
  32: 5,
  64: 6,
  128: 7,
  256: 8,
  512: 9,
  1024: 10,
  2048: 11,
  4096: 12,
  8192: 13,
  16384: 14,
  32768: 15,
  65536: 16,
};

function getTilePower(value) {
  return LOG2_CACHE[value] ?? Math.log2(value);
}

const SNAKE_PATTERNS_BY_SIZE = new Map();

function getSnakePatterns(size) {
  if (!SNAKE_PATTERNS_BY_SIZE.has(size)) {
    SNAKE_PATTERNS_BY_SIZE.set(size, buildSnakePatterns(size));
  }

  return SNAKE_PATTERNS_BY_SIZE.get(size);
}

export function countEmptyCells(board) {
  let count = 0;

  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      if (board[row][col] === 0) {
        count++;
      }
    }
  }

  return count;
}

export function getMaxTile(board) {
  let maxTile = 0;

  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      if (board[row][col] > maxTile) {
        maxTile = board[row][col];
      }
    }
  }

  return maxTile;
}

export function getMaxTilePower(board) {
  const maxTile = getMaxTile(board);

  if (maxTile === 0) {
    return 0;
  }

  return getTilePower(maxTile);
}

export function isMaxTileInCorner(board) {
  const maxTile = getMaxTile(board);
  const lastIndex = board.length - 1;

  const corners = [
    board[0][0],
    board[0][lastIndex],
    board[lastIndex][0],
    board[lastIndex][lastIndex],
  ];

  return corners.includes(maxTile);
}

export function calculateSmoothness(board) {
  let penalty = 0;

  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      const current = board[row][col];

      if (current === 0) continue;

      const right = col + 1 < board.length ? board[row][col + 1] : 0;
      const down = row + 1 < board.length ? board[row + 1][col] : 0;

      if (right !== 0) {
        penalty += Math.abs(getTilePower(current) - getTilePower(right));
      }

      if (down !== 0) {
        penalty += Math.abs(getTilePower(current) - getTilePower(down));
      }
    }
  }

  return -penalty;
}

export function calculateMonotonicity(board) {
  let rowScore = 0;
  let colScore = 0;

  for (let row = 0; row < board.length; row++) {
    let increasing = 0;
    let decreasing = 0;

    for (let col = 0; col < board.length - 1; col++) {
      const current = board[row][col] === 0 ? 0 : getTilePower(board[row][col]);
      const next =
        board[row][col + 1] === 0 ? 0 : getTilePower(board[row][col + 1]);

      if (current > next) {
        decreasing += current - next;
      } else {
        increasing += next - current;
      }
    }

    rowScore += Math.max(increasing, decreasing);
  }

  for (let col = 0; col < board.length; col++) {
    let increasing = 0;
    let decreasing = 0;

    for (let row = 0; row < board.length - 1; row++) {
      const current = board[row][col] === 0 ? 0 : getTilePower(board[row][col]);
      const next =
        board[row + 1][col] === 0 ? 0 : getTilePower(board[row + 1][col]);

      if (current > next) {
        decreasing += current - next;
      } else {
        increasing += next - current;
      }
    }

    colScore += Math.max(increasing, decreasing);
  }

  return rowScore + colScore;
}

export function countMergePotential(board) {
  let mergeCount = 0;

  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      const current = board[row][col];

      if (current === 0) continue;

      const right = col + 1 < board.length ? board[row][col + 1] : 0;
      const down = row + 1 < board.length ? board[row + 1][col] : 0;

      if (current === right) {
        mergeCount++;
      }

      if (current === down) {
        mergeCount++;
      }
    }
  }

  return mergeCount;
}

export function calculateCornerGradientScore(board) {
  const size = board.length;
  const maxTile = getMaxTile(board);

  if (maxTile === 0) return 0;

  const corners = [
    { row: 0, col: 0 },
    { row: 0, col: size - 1 },
    { row: size - 1, col: 0 },
    { row: size - 1, col: size - 1 },
  ];

  let bestScore = -Infinity;

  for (const corner of corners) {
    if (board[corner.row][corner.col] !== maxTile) {
      continue;
    }

    let score = 0;

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const value = board[row][col];

        if (value === 0) continue;

        const distanceFromCorner =
          Math.abs(row - corner.row) + Math.abs(col - corner.col);

        const tilePower = getTilePower(value);
        const weight = Math.pow(0.5, distanceFromCorner);

        score += tilePower * weight;
      }
    }

    if (score > bestScore) {
      bestScore = score;
    }
  }

  if (bestScore === -Infinity) {
    return 0;
  }

  return bestScore;
}

export function calculateSnakeScore(board) {
  const size = board.length;

  const patterns = getSnakePatterns(size);
  let bestScore = -Infinity;

  for (const pattern of patterns) {
    let score = 0;

    for (let index = 0; index < pattern.length; index++) {
      const { row, col } = pattern[index];
      const value = board[row][col];

      if (value === 0) continue;

      const tilePower = getTilePower(value);
      const weight = pattern.length - index;

      score += tilePower * weight;
    }

    bestScore = Math.max(bestScore, score);
  }

  return bestScore;
}

function buildSnakePatterns(size) {
  return [
    buildSnakePattern(size, "top-left"),
    buildSnakePattern(size, "top-right"),
    buildSnakePattern(size, "bottom-left"),
    buildSnakePattern(size, "bottom-right"),
  ];
}

function buildSnakePattern(size, corner) {
  const rows = [...Array(size).keys()];
  const cols = [...Array(size).keys()];

  if (corner.startsWith("bottom")) {
    rows.reverse();
  }

  const pattern = [];

  for (let rowIndex = 0; rowIndex < size; rowIndex++) {
    const row = rows[rowIndex];

    let currentCols = [...cols];

    const shouldReverse =
      (corner.endsWith("left") && rowIndex % 2 === 1) ||
      (corner.endsWith("right") && rowIndex % 2 === 0);

    if (shouldReverse) {
      currentCols.reverse();
    }

    for (const col of currentCols) {
      pattern.push({ row, col });
    }
  }

  return pattern;
}

export function extractBoardFeatures(board, scoreGained = 0) {
  const emptyCells = countEmptyCells(board);
  const maxTile = getMaxTile(board);
  const maxTilePower = maxTile === 0 ? 0 : getTilePower(maxTile);
  const maxTileInCorner = isMaxTileInCorner(board);

  return {
    emptyCells,
    scoreGained,
    maxTile,
    maxTilePower,
    maxTileInCorner: maxTileInCorner ? 1 : 0,
    maxTileNotInCorner: maxTileInCorner ? 0 : 1,
    smoothness: calculateSmoothness(board),
    monotonicity: calculateMonotonicity(board),
    mergePotential: countMergePotential(board),
    cornerGradient: calculateCornerGradientScore(board),
    snakeScore: calculateSnakeScore(board),
  };
}

export function evaluateBoard(board, scoreGained = 0) {
  const f = extractBoardFeatures(board, scoreGained);

  let boardScore = 0;

  boardScore += f.emptyCells * 100;
  boardScore += f.scoreGained * 1.2;
  boardScore += f.maxTile * 0.2;
  boardScore += f.cornerGradient * 120;
  boardScore += f.smoothness * 8;
  boardScore += f.monotonicity * 4;
  boardScore += f.mergePotential * 60;
  boardScore += f.snakeScore * 6;

  if (f.maxTileInCorner) {
    boardScore += f.maxTile * 6;
  } else {
    boardScore -= f.maxTile * 3;
  }

  return boardScore;
}
