import { getNtupleTdMove, getNtupleTdBeamMove } from "./ntuple/ntupleBot.js";
import { getWeightedBeamDepthMove } from "./weightedDepthBot.js";
import { CHAMPION_WEIGHTS } from "./trainedWeights.js";

export const BOT_NAMES = {
  AUTO_FAST: "autoFast",
  AUTO_STRONG: "autoStrong",
  CHAMPION: "champion",
  LEGACY_CHAMPION: "legacyChampion",
  NTUPLE_TD_V1: "ntupleTdV1",
  NTUPLE_TD_BEAM_2: "ntupleTdBeam2",
};

export function getBotMove(botName, board) {
  switch (botName) {
    case BOT_NAMES.AUTO_FAST:
    case BOT_NAMES.NTUPLE_TD_V1:
      return getNtupleTdMove(board);
    case BOT_NAMES.AUTO_STRONG:
    case BOT_NAMES.CHAMPION:
    case BOT_NAMES.NTUPLE_TD_BEAM_2:
      return getNtupleTdBeamMove(board, 2, 2, 0.49);
    case BOT_NAMES.LEGACY_CHAMPION:
      return getWeightedBeamDepthMove(board, CHAMPION_WEIGHTS, 3, 2);

    default:
      throw new Error(`Unknown bot name: ${botName}`);
  }
}
