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
  const mergedResult = mergeLineLeft(slidedLine);
  return mergedResult;
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

function moveLineRight(line) {
  const reverseLine = [...line].reverse();
  const result = moveLineLeft(reverseLine);
  return {
    line: result.line.reverse(),
    scoreGained: result.scoreGained,
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
function moveBoardUp(board) {
  const newBoard = board.map((row) => [...row]);
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
  const newBoard = board.map((row) => [...row]);
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

const board2 = [
  [2, 0, 2, 4],
  [2, 2, 2, 0],
  [4, 0, 4, 4],
  [0, 0, 2, 2],
];

console.log(moveBoardUp(board2));
