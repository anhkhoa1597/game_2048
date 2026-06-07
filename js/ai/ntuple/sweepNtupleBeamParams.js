import { Env2048 } from "../env2048.js";
import { getMaxTile } from "../evaluator.js";
import { createSeededRandom } from "../random.js";
import {
  prepareNtupleBenchmarkModel,
  printNtupleModelInfo,
} from "./ntupleBenchmarkUtils.js";

const { activeModelPath, copiedModelPath } = prepareNtupleBenchmarkModel();
await printNtupleModelInfo(activeModelPath, copiedModelPath);

const { getNtupleTdBeamMove } = await import("./ntupleBot.js");

function getArgValue(name, fallback) {
  const index = process.argv.indexOf(name);

  if (index === -1) {
    return fallback;
  }

  return process.argv[index + 1] ?? fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function parseNumberArg(name, fallback) {
  const value = Number(getArgValue(name, fallback));
  return Number.isFinite(value) ? value : fallback;
}

function parseSeedsArg() {
  const raw = getArgValue("--seeds", "10101,20202");
  return raw
    .split(",")
    .map((seed) => Number(seed.trim()))
    .filter((seed) => Number.isFinite(seed));
}

function buildFutureSweepConfigs() {
  const depth = parseNumberArg("--depth", 2);
  const beamWidth = parseNumberArg("--beam-width", 2);
  const start = parseNumberArg("--future-start", 0.01);
  const end = parseNumberArg("--future-end", 1.0);
  const step = parseNumberArg("--future-step", 0.01);
  const configs = [];

  for (
    let value = Math.round(start * 100);
    value <= Math.round(end * 100);
    value += Math.round(step * 100)
  ) {
    const futureWeight = Number((value / 100).toFixed(2));
    const label = String(value).padStart(3, "0");

    configs.push({
      name: `d${depth}-b${beamWidth}-fw${label}`,
      depth,
      beamWidth,
      futureWeight,
    });
  }

  return configs;
}

function buildFutureValuesConfigs() {
  const depth = parseNumberArg("--depth", 2);
  const beamWidth = parseNumberArg("--beam-width", 2);
  const rawValues = getArgValue("--future-values", "");
  const values = rawValues
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) {
    throw new Error("--future-values requires a comma-separated list, e.g. 0.31,0.42,0.72");
  }

  return values.map((futureWeight) => {
    const label = String(Math.round(futureWeight * 100)).padStart(3, "0");

    return {
      name: `d${depth}-b${beamWidth}-fw${label}`,
      depth,
      beamWidth,
      futureWeight: Number(futureWeight.toFixed(4)),
    };
  });
}

const DEFAULT_CONFIGS = [
  { name: "d2-b2-fw050", depth: 2, beamWidth: 2, futureWeight: 0.5 },
  { name: "d2-b2-fw060", depth: 2, beamWidth: 2, futureWeight: 0.6 },
  { name: "d2-b2-fw072", depth: 2, beamWidth: 2, futureWeight: 0.72 },
  { name: "d2-b2-fw085", depth: 2, beamWidth: 2, futureWeight: 0.85 },
  { name: "d2-b2-fw100", depth: 2, beamWidth: 2, futureWeight: 1.0 },
  { name: "d2-b3-fw072", depth: 2, beamWidth: 3, futureWeight: 0.72 },
  { name: "d2-b3-fw085", depth: 2, beamWidth: 3, futureWeight: 0.85 },
  { name: "d3-b2-fw060", depth: 3, beamWidth: 2, futureWeight: 0.6 },
  { name: "d3-b2-fw072", depth: 3, beamWidth: 2, futureWeight: 0.72 },
];

const CONFIGS = hasFlag("--future-values")
  ? buildFutureValuesConfigs()
  : hasFlag("--future-sweep")
    ? buildFutureSweepConfigs()
    : DEFAULT_CONFIGS;
const SEEDS = parseSeedsArg();
const GAMES_PER_SEED = parseNumberArg("--games-per-seed", 25);
const MAX_STEPS = parseNumberArg("--max-steps", 10000);
const SHOW_PROGRESS = !hasFlag("--no-progress");

function formatPercent(value) {
  return `${value.toFixed(1)}%`;
}

function writeProgress(message, done = false) {
  if (!SHOW_PROGRESS) {
    return;
  }

  if (process.stdout.clearLine && process.stdout.cursorTo) {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(message);

    if (done) {
      process.stdout.write("\n");
    }

    return;
  }

  console.log(message);
}

function playOneGame(config, seed) {
  const env = new Env2048(4, { random: createSeededRandom(seed) });
  let state = env.reset();
  let steps = 0;

  const start = performance.now();

  while (!env.isDone() && steps < MAX_STEPS) {
    const action = getNtupleTdBeamMove(
      state,
      config.depth,
      config.beamWidth,
      config.futureWeight,
    );

    if (!action) {
      break;
    }

    const result = env.step(action);

    if (!result.moved) {
      break;
    }

    state = result.state;
    steps++;
  }

  const timeMs = performance.now() - start;
  const maxTile = getMaxTile(env.getState());

  return {
    score: env.getScore(),
    steps,
    maxTile,
    win: maxTile >= 2048,
    timeMs,
  };
}

function benchmarkConfig(config, index, totalConfigs) {
  const results = [];
  const totalGames = SEEDS.length * GAMES_PER_SEED;

  for (const seed of SEEDS) {
    for (let game = 0; game < GAMES_PER_SEED; game++) {
      results.push(playOneGame(config, seed + game));

      const completedGames = results.length;
      const totalProgress =
        ((index * totalGames + completedGames) / (totalConfigs * totalGames)) *
        100;

      writeProgress(
        `[${index + 1}/${totalConfigs}] ${config.name} | ` +
          `game ${completedGames}/${totalGames} | ` +
          `overall ${formatPercent(totalProgress)}`,
      );
    }
  }

  const games = results.length;
  const totalScore = results.reduce((sum, result) => sum + result.score, 0);
  const totalSteps = results.reduce((sum, result) => sum + result.steps, 0);
  const totalTimeMs = results.reduce((sum, result) => sum + result.timeMs, 0);
  const winCount = results.filter((result) => result.win).length;
  const tileDistribution = {};

  for (const result of results) {
    tileDistribution[result.maxTile] =
      (tileDistribution[result.maxTile] || 0) + 1;
  }

  const summary = {
    config: config.name,
    depth: config.depth,
    beamWidth: config.beamWidth,
    futureWeight: config.futureWeight,
    games,
    averageScore: Math.round(totalScore / games),
    maxScore: Math.max(...results.map((result) => result.score)),
    averageSteps: Math.round(totalSteps / games),
    maxTile: Math.max(...results.map((result) => result.maxTile)),
    winCount,
    winRate: `${((winCount / games) * 100).toFixed(2)}%`,
    averageMoveMs: Number((totalTimeMs / Math.max(totalSteps, 1)).toFixed(3)),
    tileDistribution,
  };

  writeProgress(
    `[${index + 1}/${totalConfigs}] ${config.name} done | ` +
      `winRate=${summary.winRate} avgScore=${summary.averageScore} ` +
      `maxTile=${summary.maxTile} avgMoveMs=${summary.averageMoveMs}`,
    true,
  );

  return summary;
}

const summaries = CONFIGS.map((config, index) => {
  return benchmarkConfig(config, index, CONFIGS.length);
});
const sortedSummaries = summaries
  .slice()
  .sort((a, b) => {
    if (b.winCount !== a.winCount) {
      return b.winCount - a.winCount;
    }

    return b.averageScore - a.averageScore;
  });

console.log("N-tuple beam parameter sweep:");
console.table(
  summaries.map(({ tileDistribution, ...summary }) => summary),
);

console.log("Top configs by win count, then average score:");
console.table(
  sortedSummaries
    .slice(0, 10)
    .map(({ tileDistribution, ...summary }) => summary),
);

for (const summary of sortedSummaries.slice(0, 10)) {
  console.log(`${summary.config} tile distribution:`);
  console.table(summary.tileDistribution);
}
