import { getDepthMove } from "./depthBot.js";
import { getHeuristicMove } from "./heuristicBot.js";
import { getExpectimaxMove } from "./expectimaxBot.js";
import { TRAINED_WEIGHTS_V3, TRAINED_WEIGHTS_V2 } from "./trainedWeights.js";
import { DEFAULT_WEIGHTS } from "./weightedEvaluator.js";
import { getWeightedDepthMove } from "./weightedDepthBot.js";

export const BOT_NAMES = {
  DEPTH_2: "depth2",
  DEPTH_3: "depth3",
  HEURISTIC: "heuristic",
  EXPECTIMAX_1: "expectimax1",
  EXPECTIMAX_SAMPLE_6: "expectimax2Sample6",
  EXPECTIMAX_SAMPLE_8: "expectimax2Sample8",
  FAST: "fast",
  EXPECTIMAX_STRONG: "expectimaxStrong",
  WEIGHTED_DEFAULT: "weightedDefault",
  TRAINED_V3: "trainedV3",
  TRAINED_V2: "trainedV2",
  AUTO_FAST: "autoFast",
  AUTO_STRONG: "autoStrong",
};

export function getBotMove(botName, board) {
  switch (botName) {
    case BOT_NAMES.DEPTH_2:
    case BOT_NAMES.FAST:
      return getDepthMove(board, 2);

    case BOT_NAMES.DEPTH_3:
      return getDepthMove(board, 3);

    case BOT_NAMES.HEURISTIC:
      return getHeuristicMove(board);

    case BOT_NAMES.EXPECTIMAX_1:
      return getExpectimaxMove(board, 1);

    case BOT_NAMES.EXPECTIMAX_SAMPLE_6:
      return getExpectimaxMove(board, 2, {
        randomOptions: {
          mode: "sample",
          limit: 6,
        },
      });

    case BOT_NAMES.EXPECTIMAX_SAMPLE_8:
    case BOT_NAMES.EXPECTIMAX_STRONG:
      return getExpectimaxMove(board, 2, {
        randomOptions: {
          mode: "sample",
          limit: 8,
        },
      });
    case BOT_NAMES.WEIGHTED_DEFAULT:
      return getWeightedDepthMove(board, DEFAULT_WEIGHTS, 2);

    case BOT_NAMES.TRAINED_V3:
    case BOT_NAMES.AUTO_FAST:
    case BOT_NAMES.AUTO_STRONG:
      return getWeightedDepthMove(board, TRAINED_WEIGHTS_V3, 2);

    case BOT_NAMES.TRAINED_V2:
      return getWeightedDepthMove(board, TRAINED_WEIGHTS_V2, 2);
    default:
      throw new Error(`Unknown bot name: ${botName}`);
  }
}
