export function tileToPower(tile) {
  if (tile === 0) {
    return 0;
  }

  return Math.log2(tile);
}

export function encodeBoardLog2(board) {
  const encoded = [];

  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      encoded.push(tileToPower(board[row][col]));
    }
  }

  return encoded;
}

export function countEmptyCellsForDataset(board) {
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

export function getMaxTileForDataset(board) {
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