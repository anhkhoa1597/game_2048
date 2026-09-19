import {
  prepareNtupleBenchmarkModel,
  printNtupleModelInfo,
} from "./ntupleBenchmarkUtils.js";

const { activeModelPath, copiedModelPath } = prepareNtupleBenchmarkModel();
await printNtupleModelInfo(activeModelPath, copiedModelPath);

const { BOT_NAMES } = await import("../../js/ai/botRegistry.js");
const {
  runMultiSeedBenchmark,
  formatMultiSeedTable,
  printMultiSeedTileDistributions,
} = await import("./seededBenchmark.js");

const BOTS_TO_TEST = [
  BOT_NAMES.BOT_01,
  BOT_NAMES.BOT_02,
];

const summaries = runMultiSeedBenchmark(BOTS_TO_TEST, {
  seeds: [10101, 20202, 30303],
  gamesPerSeed: 50,
  size: 4,
  maxSteps: 10000,
  logEachSeed: true,
});

console.log("N-tuple benchmark summary:");
console.table(formatMultiSeedTable(summaries));
printMultiSeedTileDistributions(summaries);
