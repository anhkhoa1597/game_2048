import { BOT_NAMES } from "../botRegistry.js";
import {
  runMultiSeedBenchmark,
  formatMultiSeedTable,
  printMultiSeedTileDistributions,
} from "../seededBenchmark.js";

const BOTS_TO_TEST = [
  BOT_NAMES.CHAMPION_BEAM_3,
  BOT_NAMES.VALUE_MLP_V1,
  BOT_NAMES.VALUE_MLP_BEAM_2,
];

const summaries = runMultiSeedBenchmark(BOTS_TO_TEST, {
  seeds: [30303, 40404],
  gamesPerSeed: 30,
  size: 4,
  maxSteps: 10000,
  logEachSeed: true,
});

console.log("Value MLP benchmark summary:");
console.table(formatMultiSeedTable(summaries));
printMultiSeedTileDistributions(summaries);
