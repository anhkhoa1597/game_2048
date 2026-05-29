const DIRECTIONS = ["up", "down", "left", "right"];

export function getDirections() {
  return DIRECTIONS;
}

export function cloneBoard(board) {
  return board.map((row) => [...row]);
}

export function boardsAreEqual(boardA, boardB) {
  if (boardA.length !== boardB.length) return false;

  for (let row = 0; row < boardA.length; row++) {
    for (let col = 0; col < boardA[row].length; col++) {
      if (boardA[row][col] !== boardB[row][col]) {
        return false;
      }
    }
  }

  return true;
}

function slideLineLeft(line) {
  const numbers = line.filter((value) => value !== 0);

  while (numbers.length < line.length) {
    numbers.push(0);
  }

  return numbers;
}

function mergeLineLeft(line) {
  const result = [];
  let scoreGained = 0;

  for (let i = 0; i < line.length; i++) {
    const current = line[i];
    const next = line[i + 1];

    if (current !== 0 && current === next) {
      const mergedValue = current * 2;

      result.push(mergedValue);
      scoreGained += mergedValue;

      i++;
    } else {
      result.push(current);
    }
  }

  while (result.length < line.length) {
    result.push(0);
  }

  return {
    line: result,
    scoreGained,
  };
}

function moveLineLeft(line) {
  const slidedLine = slideLineLeft(line);
  return mergeLineLeft(slidedLine);
}

function moveLineRight(line) {
  const reversedLine = [...line].reverse();
  const result = moveLineLeft(reversedLine);

  return {
    line: result.line.reverse(),
    scoreGained: result.scoreGained,
  };
}

function getColumn(board, col) {
  const column = [];

  for (let row = 0; row < board.length; row++) {
    column.push(board[row][col]);
  }

  return column;
}

function setColumn(board, col, column) {
  for (let row = 0; row < board.length; row++) {
    board[row][col] = column[row];
  }
}

function moveBoardLeft(board) {
  const newBoard = [];
  let totalScoreGained = 0;

  for (let row = 0; row < board.length; row++) {
    const result = moveLineLeft(board[row]);

    newBoard.push(result.line);
    totalScoreGained += result.scoreGained;
  }

  return {
    board: newBoard,
    scoreGained: totalScoreGained,
  };
}

function moveBoardRight(board) {
  const newBoard = [];
  let totalScoreGained = 0;

  for (let row = 0; row < board.length; row++) {
    const result = moveLineRight(board[row]);

    newBoard.push(result.line);
    totalScoreGained += result.scoreGained;
  }

  return {
    board: newBoard,
    scoreGained: totalScoreGained,
  };
}

function moveBoardUp(board) {
  const newBoard = cloneBoard(board);
  let totalScoreGained = 0;

  for (let col = 0; col < board.length; col++) {
    const column = getColumn(newBoard, col);
    const result = moveLineLeft(column);

    setColumn(newBoard, col, result.line);
    totalScoreGained += result.scoreGained;
  }

  return {
    board: newBoard,
    scoreGained: totalScoreGained,
  };
}

function moveBoardDown(board) {
  const newBoard = cloneBoard(board);
  let totalScoreGained = 0;

  for (let col = 0; col < board.length; col++) {
    const column = getColumn(newBoard, col);
    const reversedColumn = [...column].reverse();

    const result = moveLineLeft(reversedColumn);
    const finalColumn = result.line.reverse();

    setColumn(newBoard, col, finalColumn);
    totalScoreGained += result.scoreGained;
  }

  return {
    board: newBoard,
    scoreGained: totalScoreGained,
  };
}

export function simulateMove(board, direction) {
  let result;

  if (direction === "left") {
    result = moveBoardLeft(board);
  } else if (direction === "right") {
    result = moveBoardRight(board);
  } else if (direction === "up") {
    result = moveBoardUp(board);
  } else if (direction === "down") {
    result = moveBoardDown(board);
  } else {
    throw new Error(`Invalid direction: ${direction}`);
  }

  return {
    board: result.board,
    scoreGained: result.scoreGained,
    moved: !boardsAreEqual(board, result.board),
  };
}

export function getEmptyCells(board) {
  const emptyCells = [];

  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      if (board[row][col] === 0) {
        emptyCells.push({ row, col });
      }
    }
  }

  return emptyCells;
}

export function getRandomTileBoards(board, options = {}) {
  const { mode = "full", limit = 8 } = options;

  const emptyCells = getEmptyCells(board);

  if (emptyCells.length === 0) {
    return [];
  }

  let selectedCells = emptyCells;

  if (mode === "sample" && emptyCells.length > limit) {
    selectedCells = sampleCells(emptyCells, limit);
  }

  const outcomes = [];

  for (const cell of selectedCells) {
    const probabilityPerCell = 1 / selectedCells.length;

    const boardWithTwo = cloneBoard(board);
    boardWithTwo[cell.row][cell.col] = 2;

    outcomes.push({
      board: boardWithTwo,
      probability: 0.9 * probabilityPerCell,
      tileValue: 2,
      row: cell.row,
      col: cell.col,
    });

    const boardWithFour = cloneBoard(board);
    boardWithFour[cell.row][cell.col] = 4;

    outcomes.push({
      board: boardWithFour,
      probability: 0.1 * probabilityPerCell,
      tileValue: 4,
      row: cell.row,
      col: cell.col,
    });
  }

  return outcomes;
}

function sampleCells(cells, limit) {
  const result = [];
  const usedIndexes = new Set();

  while (result.length < limit && result.length < cells.length) {
    const randomIndex = Math.floor(Math.random() * cells.length);

    if (!usedIndexes.has(randomIndex)) {
      usedIndexes.add(randomIndex);
      result.push(cells[randomIndex]);
    }
  }

  return result;
}

export function getValidMoves(board) {
  return DIRECTIONS.filter((direction) => {
    const result = simulateMove(board, direction);
    return result.moved;
  });
}

export function isMoveValid(board, direction) {
  return simulateMove(board, direction).moved;
}
