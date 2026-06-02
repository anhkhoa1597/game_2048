import { BOT_NAMES } from "../botRegistry.js";
import {
  runMultiSeedBenchmark,
  formatMultiSeedTable,
  printMultiSeedTileDistributions,
} from "../seededBenchmark.js";

const BOTS_TO_TEST = [
  BOT_NAMES.CHAMPION_BEAM_3,
  BOT_NAMES.RANKER_MLP_SAFE_STRICT,
  BOT_NAMES.RANKER_MLP_SAFE,
  BOT_NAMES.RANKER_MLP_SAFE_LOOSE,
  BOT_NAMES.RANKER_MLP_DEPTH_3_SAFE,
  BOT_NAMES.RANKER_MLP_FAST_SAFE,
];

const summaries = runMultiSeedBenchmark(BOTS_TO_TEST, {
  seeds: [30303, 40404],
  gamesPerSeed: 30,
  size: 4,
  maxSteps: 10000,
  logEachSeed: true,
});

console.log("Ranker MLP benchmark summary:");
console.table(formatMultiSeedTable(summaries));
printMultiSeedTileDistributions(summaries);
