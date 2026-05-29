import {
  benchmarkBots,
  formatBenchmarkTable,
  printTileDistributions,
} from "./benchmarkBots.js";

const BOTS_TO_TEST = ["expectimaxBot3"];

const results = benchmarkBots(BOTS_TO_TEST, {
  games: 2,
  size: 4,
  maxSteps: 10000,
});

console.log("Benchmark summary:");
console.table(formatBenchmarkTable(results));

printTileDistributions(results);

// console.log("Raw results:");
// console.log(results);
