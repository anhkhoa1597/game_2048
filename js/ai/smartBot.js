import { getValidMoves, simulateMove } from "./boardSimulator.js";
import { evaluateBoard } from "./evaluator.js";

export function getSmartMove(board) {
  const validMoves = getValidMoves(board);

  if (validMoves.length === 0) {
    return null;
  }

  let bestMove = null;
  let bestScore = -Infinity;

  for (const direction of validMoves) {
    const result = simulateMove(board, direction);
    const boardScore = evaluateBoard(result.board, result.scoreGained);

    if (boardScore > bestScore) {
      bestScore = boardScore;
      bestMove = direction;
    }
  }

  return bestMove;
}
