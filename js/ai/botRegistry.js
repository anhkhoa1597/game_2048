import { getNtupleTdMove, getNtupleTdBeamMove } from "./ntuple/ntupleBot.js";

export const BOT_NAMES = {
  AUTO_FAST: "autoFast",
  AUTO_STRONG: "autoStrong",
  CHAMPION: "champion",
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

    default:
      throw new Error(`Unknown bot name: ${botName}`);
  }
}
