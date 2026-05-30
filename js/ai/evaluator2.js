const TARGET_CORNER = "bottom-left";
const SNAKE_AXIS = "vertical";

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

  const corner = {
    row: size - 1,
    col: 0,
  };

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

  return score;
}

export function isMaxTileAtTargetCorner(board) {
  const maxTile = getMaxTile(board);
  const last = board.length - 1;

  return board[last][0] === maxTile;
}

export function buildFixedSnakePattern(size) {
  const pattern = [];

  if (TARGET_CORNER === "bottom-left" && SNAKE_AXIS === "vertical") {
    for (let col = 0; col < size; col++) {
      const rows = [...Array(size).keys()];

      if (col % 2 === 0) {
        rows.reverse(); // dưới lên
      }

      for (const row of rows) {
        pattern.push({ row, col });
      }
    }
  }

  return pattern;
}

export function calculateFixedSnakeScore(board) {
  const pattern = buildFixedSnakePattern(board.length);
  let score = 0;

  for (let index = 0; index < pattern.length; index++) {
    const { row, col } = pattern[index];
    const value = board[row][col];

    if (value === 0) continue;

    const tilePower = Math.log2(value);
    const weight = pattern.length - index;

    score += tilePower * weight;
  }

  return score;
}

export function calculateTopTilesSnakePenalty(board, topCount = 6) {
  const pattern = buildFixedSnakePattern(board.length);

  const tiles = [];

  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      const value = board[row][col];

      if (value !== 0) {
        tiles.push({ value, row, col });
      }
    }
  }

  tiles.sort((a, b) => b.value - a.value);

  const topTiles = tiles.slice(0, topCount);

  let penalty = 0;

  for (let i = 0; i < topTiles.length; i++) {
    const tile = topTiles[i];
    const expectedPosition = pattern[i];

    const distance =
      Math.abs(tile.row - expectedPosition.row) +
      Math.abs(tile.col - expectedPosition.col);

    penalty += Math.log2(tile.value) * distance;
  }

  return penalty;
}
export function evaluateBoard(board, scoreGained = 0) {
  const emptyCells = countEmptyCells(board);
  const maxTile = getMaxTile(board);
  const maxTileInCorner = isMaxTileInCorner(board);
  const smoothness = calculateSmoothness(board);
  const monotonicity = calculateMonotonicity(board);
  const mergePotential = countMergePotential(board);
  const cornerGradient = calculateCornerGradientScore(board);
  const fixedSnakeScore = calculateFixedSnakeScore(board);
  const maxAtTargetCorner = isMaxTileAtTargetCorner(board);
  const topTilesSnakePenalty = calculateTopTilesSnakePenalty(board, 8);

  let boardScore = 0;

  boardScore += emptyCells * 100;
  boardScore += scoreGained * 1.2;
  boardScore += maxTile * 0.2;

  boardScore += cornerGradient * 120;
  boardScore += smoothness * 8;
  boardScore += monotonicity * 4;
  boardScore += mergePotential * 60;

  boardScore += fixedSnakeScore * 25;
  boardScore -= topTilesSnakePenalty * 300;

  if (maxAtTargetCorner) {
    boardScore += maxTile * 20;
  } else {
    boardScore -= maxTile * 50;
  }

  if (maxTileInCorner) {
    boardScore += maxTile * 6;
  } else {
    boardScore -= maxTile * 3;
  }

  return boardScore;
}
