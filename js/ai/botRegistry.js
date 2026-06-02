import { getDepthMove } from "./depthBot.js";
import { getHeuristicMove } from "./heuristicBot.js";
import { getExpectimaxMove } from "./expectimaxBot.js";
import {
  TRAINED_WEIGHTS_V3,
  TRAINED_WEIGHTS_V2,
  TRAINED_WEIGHTS_V1,
  CHAMPION_WEIGHTS,
  TRAINED_WEIGHTS_V4,
  TRAINED_WEIGHTS_V5,
} from "./trainedWeights.js";

import { DEFAULT_WEIGHTS } from "./weightedEvaluator.js";
import {
  getWeightedDepthMove,
  getWeightedBeamDepthMove,
} from "./weightedDepthBot.js";
import { getWeightedExpectimaxMove } from "./weightedExpectimaxBot.js";
import { getPolicyMlpMove } from "./mlPolicyBot.js";
import { getValueMlpMove } from "./valueMlpBot.js";

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
  CHAMPION_DEPTH_2: "championDepth2",
  CHAMPION_DEPTH_3: "championDepth3",
  WEIGHTED_EXPECTIMAX: "weightedExpectimax",
  CHAMPION_BEAM_3: "championBeam3",
  TRAINED_BEAM_3_WEIGHTS_V5: "trainedBeam3V5",
  // TRAINED_BEAM_WEIGHTS_V1: "trainedBeamV1",
  POLICY_MLP_V1: "policyMlpV1",
  VALUE_MLP_V1: "valueMlpV1",
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
    case BOT_NAMES.WEIGHTED_EXPECTIMAX:
      return getWeightedExpectimaxMove(board, CHAMPION_WEIGHTS, 2);
    case BOT_NAMES.AUTO_FAST:
    case BOT_NAMES.CHAMPION_DEPTH_2:
      return getWeightedDepthMove(board, CHAMPION_WEIGHTS, 2);
    case BOT_NAMES.AUTO_STRONG:
    case BOT_NAMES.CHAMPION_DEPTH_3:
      return getWeightedDepthMove(board, CHAMPION_WEIGHTS, 3);
    case BOT_NAMES.CHAMPION:
    case BOT_NAMES.CHAMPION_BEAM_3:
      return getWeightedBeamDepthMove(board, CHAMPION_WEIGHTS, 3, 2);
    case BOT_NAMES.TRAINED_BEAM_3_WEIGHTS_V5:
      return getWeightedBeamDepthMove(board, TRAINED_WEIGHTS_V5, 3, 2);

    case BOT_NAMES.POLICY_MLP_V1:
      return getPolicyMlpMove(board);
    case BOT_NAMES.VALUE_MLP_V1:
      return getValueMlpMove(board);
    default:
      throw new Error(`Unknown bot name: ${botName}`);
  }
}
