import {
  benchmarkBots,
  formatBenchmarkTable,
  printTileDistributions,
} from "./benchmarkBots.js";

import { BOT_NAMES } from "./botRegistry.js";

const BOTS_TO_TEST = [
  BOT_NAMES.CHAMPION,
  BOT_NAMES.CHAMPION_BEAM_3,
];

const results = benchmarkBots(BOTS_TO_TEST, {
  games: 300,
  size: 4,
  maxSteps: 10000,
  // logEachGame: true,
  seed: 20260530,
});

console.log("Speed benchmark summary:");
console.table(formatBenchmarkTable(results));

printTileDistributions(results);