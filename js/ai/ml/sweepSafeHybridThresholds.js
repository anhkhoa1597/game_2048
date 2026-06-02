import { Env2048 } from "../env2048.js";
import { getMaxTile } from "../evaluator.js";
import { createSeededRandom } from "../random.js";
import { getWeightedBeamDepthMove } from "../weightedDepthBot.js";
import { CHAMPION_WEIGHTS } from "../trainedWeights.js";
import { getRankerMlpSafeDecision } from "./rankerMlpBot.js";

const CONFIG = {
  seeds: [10101, 20202, 30303],
  gamesPerSeed: 60,
  size: 4,
  maxSteps: 10000,
  thresholds: [
    { name: "p88-m125", minProbability: 0.88, minMargin: 1.25 },
    { name: "p90-m125", minProbability: 0.9, minMargin: 1.25 },
    { name: "p90-m150", minProbability: 0.9, minMargin: 1.5 },
    { name: "p92-m150", minProbability: 0.92, minMargin: 1.5 },
    { name: "p92-m175", minProbability: 0.92, minMargin: 1.75 },
    { name: "p94-m175", minProbability: 0.94, minMargin: 1.75 },
  ],
};

function playOneHybridGame(config, random, options) {
  const env = new Env2048(config.size, { random });
  let state = env.reset();
  let steps = 0;
  let mlMoves = 0;
  let fallbackMoves = 0;
  let forcedMoves = 0;

  while (!env.isDone() && steps < config.maxSteps) {
    const decision = getRankerMlpSafeDecision(state, {
      minProbability: options.minProbability,
      minMargin: options.minMargin,
      fallback: "beam3",
    });

    if (!decision.direction) {
      break;
    }

    if (decision.source === "ml") {
      mlMoves++;
    } else if (decision.source === "forced") {
      forcedMoves++;
    } else {
      fallbackMoves++;
    }

    const result = env.step(decision.direction);

    if (!result.moved) {
      break;
    }

    state = result.state;
    steps++;
  }

  const finalBoard = env.getState();
  const maxTile = getMaxTile(finalBoard);

  return {
    score: env.getScore(),
    steps,
    maxTile,
    win: maxTile >= 2048,
    mlMoves,
    fallbackMoves,
    forcedMoves,
  };
}

function playOneChampionGame(config, random) {
  const env = new Env2048(config.size, { random });
  let state = env.reset();
  let steps = 0;

  while (!env.isDone() && steps < config.maxSteps) {
    const action = getWeightedBeamDepthMove(state, CHAMPION_WEIGHTS, 3, 2);

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

  const finalBoard = env.getState();
  const maxTile = getMaxTile(finalBoard);

  return {
    score: env.getScore(),
    steps,
    maxTile,
    win: maxTile >= 2048,
  };
}

function summarize(name, results, totalTimeMs) {
  const games = results.length;
  const totalScore = results.reduce((sum, result) => sum + result.score, 0);
  const totalSteps = results.reduce((sum, result) => sum + result.steps, 0);
  const winCount = results.filter((result) => result.win).length;
  const mlMoves = results.reduce((sum, result) => sum + (result.mlMoves || 0), 0);
  const fallbackMoves = results.reduce(
    (sum, result) => sum + (result.fallbackMoves || 0),
    0,
  );
  const forcedMoves = results.reduce(
    (sum, result) => sum + (result.forcedMoves || 0),
    0,
  );

  return {
    bot: name,
    games,
    averageScore: Math.round(totalScore / games),
    winRate: `${((winCount / games) * 100).toFixed(2)}%`,
    winCount,
    averageSteps: Math.round(totalSteps / games),
    averageMoveMs: Number((totalTimeMs / Math.max(totalSteps, 1)).toFixed(3)),
    mlCoverage: Number((mlMoves / Math.max(totalSteps, 1)).toFixed(3)),
    fallbackCoverage: Number((fallbackMoves / Math.max(totalSteps, 1)).toFixed(3)),
    forcedCoverage: Number((forcedMoves / Math.max(totalSteps, 1)).toFixed(3)),
  };
}

function runSweep(config = CONFIG) {
  const rows = [];

  {
    const results = [];
    const startTime = performance.now();

    for (const seed of config.seeds) {
      for (let i = 0; i < config.gamesPerSeed; i++) {
        results.push(playOneChampionGame(config, createSeededRandom(seed + i)));
      }
    }

    rows.push(summarize("championBeam3", results, performance.now() - startTime));
  }

  for (const threshold of config.thresholds) {
    const results = [];
    const startTime = performance.now();

    for (const seed of config.seeds) {
      for (let i = 0; i < config.gamesPerSeed; i++) {
        results.push(
          playOneHybridGame(config, createSeededRandom(seed + i), threshold),
        );
      }
    }

    rows.push(summarize(threshold.name, results, performance.now() - startTime));
  }

  console.log("Safe hybrid threshold sweep:");
  console.table(rows);
}

runSweep();
