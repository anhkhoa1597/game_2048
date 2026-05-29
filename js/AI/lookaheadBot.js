import { getValidMoves, simulateMove } from "./boardSimulator.js";
import { evaluateBoard } from "./evaluator.js";

export function getLookaheadMove(board) {
  const validMoves = getValidMoves(board);

  if (validMoves.length === 0) {
    return null;
  }

  let bestMove = null;
  let bestScore = -Infinity;

  for (const direction of validMoves) {
    const firstResult = simulateMove(board, direction);

    const currentScore = evaluateBoard(
      firstResult.board,
      firstResult.scoreGained,
    );

    const futureScore = getBestFutureScore(firstResult.board);

    const totalScore = currentScore + futureScore * 0.6;

    console.log(direction, {
      currentScore,
      futureScore,
      totalScore,
    });

    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestMove = direction;
    }
  }

  return bestMove;
}

function getBestFutureScore(board) {
  const validMoves = getValidMoves(board);

  if (validMoves.length === 0) {
    return -100000;
  }

  let bestFutureScore = -Infinity;

  for (const direction of validMoves) {
    const result = simulateMove(board, direction);
    const score = evaluateBoard(result.board, result.scoreGained);

    if (score > bestFutureScore) {
      bestFutureScore = score;
    }
  }

  return bestFutureScore;
}
