import { getNtupleTdBeamMove, getNtupleTdMove } from "./bots/ntuple.js";
import { CHAMPION_WEIGHTS } from "./models/trainedWeights.js";
import { getWeightedBeamDepthMove } from "./bots/weightedDepthBot.js";

export const BOT_NAMES = {
  AUTO_FAST: "autoFast",
  AUTO_STRONG: "autoStrong",
  CHAMPION: "champion",
  BOT_00: "00-legacy-beam3",
  BOT_01: "01-ntuple-greedy",
  BOT_02: "02-ntuple-beam2",
};

export function getBotMove(botName, board) {
  switch (botName) {
    case BOT_NAMES.AUTO_FAST:
    case BOT_NAMES.BOT_01:
      if (board.length !== 4 || board.some(row => row.length !== 4)) {
        return getWeightedBeamDepthMove(board, CHAMPION_WEIGHTS, 3, 2);
      }
      return getNtupleTdMove(board);
    case BOT_NAMES.AUTO_STRONG:
    case BOT_NAMES.CHAMPION:
    case BOT_NAMES.BOT_02:
      if (board.length !== 4 || board.some(row => row.length !== 4)) {
        return getWeightedBeamDepthMove(board, CHAMPION_WEIGHTS, 3, 2);
      }
      return getNtupleTdBeamMove(board, 2, 2, 0.49);
    case BOT_NAMES.BOT_00:
      return getWeightedBeamDepthMove(board, CHAMPION_WEIGHTS, 3, 2);

    default:
      throw new Error(`Unknown bot name: ${botName}`);
  }
}
