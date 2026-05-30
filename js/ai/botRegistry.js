import { getDepthMove } from "./depthBot.js";
import { getHeuristicMove } from "./heuristicBot.js";
import { getExpectimaxMove } from "./expectimaxBot.js";
import {
  TRAINED_WEIGHTS_V3,
  TRAINED_WEIGHTS_V2,
  TRAINED_WEIGHTS_V1,
  CHAMPION_WEIGHTS,
} from "./trainedWeights.js";

import { DEFAULT_WEIGHTS } from "./weightedEvaluator.js";
import { getWeightedDepthMove } from "./weightedDepthBot.js";

export const BOT_NAMES = {
  DEPTH_2: "depth2",
  DEPTH_3: "depth3",
  HEURISTIC: "heuristic",
  EXPECTIMAX: "expectimax",
  FAST: "fast",
  WEIGHTED_DEFAULT: "weightedDefault",
  TRAINED_V3: "trainedV3",
  TRAINED_V2: "trainedV2",
  TRAINED_V1: "trainedV1",
  AUTO_FAST: "autoFast",
  AUTO_STRONG: "autoStrong",
  CHAMPION: "champion",
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
    case BOT_NAMES.EXPECTIMAX:
      return getExpectimaxMove(board);
    case BOT_NAMES.WEIGHTED_DEFAULT:
      return getWeightedDepthMove(board, DEFAULT_WEIGHTS, 2);
    case BOT_NAMES.TRAINED_V1:
      return getWeightedDepthMove(board, TRAINED_WEIGHTS_V1, 2);
    case BOT_NAMES.TRAINED_V2:
      return getWeightedDepthMove(board, TRAINED_WEIGHTS_V2, 2);
    case BOT_NAMES.TRAINED_V3:
      return getWeightedDepthMove(board, TRAINED_WEIGHTS_V3, 2);

    case BOT_NAMES.AUTO_FAST:
    case BOT_NAMES.AUTO_STRONG:
    case BOT_NAMES.CHAMPION:
      return getWeightedDepthMove(board, CHAMPION_WEIGHTS, 2);
    default:
      throw new Error(`Unknown bot name: ${botName}`);
  }
}
