import {
  prepareNtupleBenchmarkModel,
  printNtupleModelInfo,
} from "./ntupleBenchmarkUtils.js";

const { activeModelPath, copiedModelPath } = prepareNtupleBenchmarkModel();
await printNtupleModelInfo(activeModelPath, copiedModelPath);

const { BOT_NAMES } = await import("../botRegistry.js");
const {
  runMultiSeedBenchmark,
  formatMultiSeedTable,
  printMultiSeedTileDistributions,
} = await import("../seededBenchmark.js");

const BOTS_TO_TEST = [BOT_NAMES.NTUPLE_TD_V1, BOT_NAMES.NTUPLE_TD_BEAM_2];

const summaries = runMultiSeedBenchmark(BOTS_TO_TEST, {
  seeds: [10101, 20202],
  gamesPerSeed: 100,
  size: 4,
  maxSteps: 10000,
  logEachSeed: true,
});

console.log("Quick n-tuple benchmark summary:");
console.table(formatMultiSeedTable(summaries));
printMultiSeedTileDistributions(summaries);
