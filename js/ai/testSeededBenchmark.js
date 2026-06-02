import { BOT_NAMES } from "./botRegistry.js";
import {
  runMultiSeedBenchmark,
  formatMultiSeedTable,
  printMultiSeedTileDistributions,
} from "./seededBenchmark.js";
import { saveBenchmarkReport } from "./benchmarkReporter.js";
const BOTS_TO_TEST = [
  BOT_NAMES.POLICY_MLP_V1,
  BOT_NAMES.VALUE_MLP_V1,
  BOT_NAMES.CHAMPION_BEAM_3,
];

const summaries = runMultiSeedBenchmark(BOTS_TO_TEST, {
  seeds: [10101, 20202],
  gamesPerSeed: 50,
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
