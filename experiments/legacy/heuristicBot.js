import { getDepthMove } from "./depthBot.js";

export function getHeuristicMove(board) {
  const size = board.length;

  if (size <= 4) {
    return getDepthMove(board, 3);
  }

  if (size <= 6) {
    return getDepthMove(board, 2);
  }

  return getDepthMove(board, 1);
}
