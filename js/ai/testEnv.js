import {
  benchmarkBots,
  formatBenchmarkTable,
  printTileDistributions,
} from "./benchmarkBots.js";

import { BOT_NAMES } from "./botRegistry.js";

const BOTS_TO_TEST = [BOT_NAMES.TRAINED_V3, BOT_NAMES.TRAINED_V2];

const results = benchmarkBots(BOTS_TO_TEST, {
  games: 1000,
  size: 4,
  maxSteps: 10000,
  logEachGame: true,
});

console.log("Benchmark summary:");
console.table(formatBenchmarkTable(results));

printTileDistributions(results);
