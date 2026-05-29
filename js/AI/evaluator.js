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
        penalty += Math.abs(Math.log2(current) - Math.log2(right));
      }

      if (down !== 0) {
        penalty += Math.abs(Math.log2(current) - Math.log2(down));
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
      const current = board[row][col] === 0 ? 0 : Math.log2(board[row][col]);
      const next =
        board[row][col + 1] === 0 ? 0 : Math.log2(board[row][col + 1]);

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
      const current = board[row][col] === 0 ? 0 : Math.log2(board[row][col]);
      const next =
        board[row + 1][col] === 0 ? 0 : Math.log2(board[row + 1][col]);

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

        const tilePower = Math.log2(value);
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

  const patterns = buildSnakePatterns(size);
  let bestScore = -Infinity;

  for (const pattern of patterns) {
    let score = 0;

    for (let index = 0; index < pattern.length; index++) {
      const { row, col } = pattern[index];
      const value = board[row][col];

      if (value === 0) continue;

      const tilePower = Math.log2(value);

      // Ô càng gần đầu rắn càng có trọng số cao.
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

export function evaluateBoard(board, scoreGained = 0) {
  const emptyCells = countEmptyCells(board);
  const maxTile = getMaxTile(board);
  const maxTileInCorner = isMaxTileInCorner(board);
  const smoothness = calculateSmoothness(board);
  const monotonicity = calculateMonotonicity(board);
  const mergePotential = countMergePotential(board);
  const cornerGradient = calculateCornerGradientScore(board);
  const snakeScore = calculateSnakeScore(board);

  let boardScore = 0;

  boardScore += emptyCells * 100;
  boardScore += scoreGained * 1.2;
  boardScore += maxTile * 0.2;
  boardScore += cornerGradient * 120;
  boardScore += smoothness * 8;
  boardScore += monotonicity * 4;
  boardScore += mergePotential * 60;

  boardScore += snakeScore * 6;

  if (maxTileInCorner) {
    boardScore += maxTile * 6;
  } else {
    boardScore -= maxTile * 3;
  }
  return boardScore;
}
