import { BOT_NAMES } from "./botRegistry.js";
import {
  runMultiSeedBenchmark,
  formatMultiSeedTable,
  printMultiSeedTileDistributions,
} from "./seededBenchmark.js";
import { saveBenchmarkReport } from "./benchmarkReporter.js";
const BOTS_TO_TEST = [
  BOT_NAMES.TRAINED_V1,
  BOT_NAMES.TRAINED_V2,
  BOT_NAMES.TRAINED_V3,
];

const summaries = runMultiSeedBenchmark(BOTS_TO_TEST, {
  seeds: [10001, 20002, 30003, 40004, 50005],
  gamesPerSeed: 500,
  size: 4,
  maxSteps: 10000,
  logEachSeed: true,
});

console.log("Final multi-seed benchmark summary:");
console.table(formatMultiSeedTable(summaries));

printMultiSeedTileDistributions(summaries);
saveBenchmarkReport(summaries, {
  outputDir: "benchmark-results",
  filePrefix: "multi-seed-4x4",
  includeRaw: true,
});