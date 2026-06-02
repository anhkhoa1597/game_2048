import { BOT_NAMES } from "../botRegistry.js";
import {
  runMultiSeedBenchmark,
  formatMultiSeedTable,
  printMultiSeedTileDistributions,
} from "../seededBenchmark.js";

const BOTS_TO_TEST = [
  BOT_NAMES.CHAMPION_BEAM_3,
  BOT_NAMES.RANKER_MLP_BEST,
];

const summaries = runMultiSeedBenchmark(BOTS_TO_TEST, {
  seeds: [10101, 20202, 30303, 40404, 50505],
  gamesPerSeed: 100,
  size: 4,
  maxSteps: 10000,
  logEachSeed: true,
});

console.log("Final hybrid benchmark summary:");
console.table(formatMultiSeedTable(summaries));
printMultiSeedTileDistributions(summaries);
