import { getValidMoves } from "./boardSimulator.js";

export function getRandomMove(board) {
  const validMoves = getValidMoves(board);

  if (validMoves.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * validMoves.length);

  return validMoves[randomIndex];
}
