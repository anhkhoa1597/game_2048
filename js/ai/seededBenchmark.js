import {
  benchmarkBots,
  formatBenchmarkTable,
  printTileDistributions,
} from "./benchmarkBots.js";

export function runMultiSeedBenchmark(botNames, options = {}) {
  const {
    seeds = [1001, 2002, 3003, 4004, 5005],
    gamesPerSeed = 200,
    size = 4,
    maxSteps = 10000,
    logEachSeed = true,
  } = options;

  const allSeedResults = [];

  for (const seed of seeds) {
    if (logEachSeed) {
      console.log(`Running seed: ${seed}`);
    }

    const seedResults = benchmarkBots(botNames, {
      games: gamesPerSeed,
      size,
      maxSteps,
      logEachGame: false,
      seed,
    });

    allSeedResults.push({
      seed,
      results: seedResults,
    });

    if (logEachSeed) {
      console.table(formatBenchmarkTable(seedResults));
    }
  }

  return summarizeMultiSeedResults(botNames, allSeedResults);
}

function summarizeMultiSeedResults(botNames, allSeedResults) {
  const summaries = [];

  for (const botName of botNames) {
    const botSeedResults = allSeedResults.map((seedResult) => {
      return seedResult.results.find((result) => result.botName === botName);
    });

    const seedCount = botSeedResults.length;

    const averageScore =
      botSeedResults.reduce((sum, result) => sum + result.averageScore, 0) /
      seedCount;

    const maxScore = Math.max(
      ...botSeedResults.map((result) => result.maxScore),
    );

    const averageSteps =
      botSeedResults.reduce((sum, result) => sum + result.averageSteps, 0) /
      seedCount;

    const maxTile = Math.max(...botSeedResults.map((result) => result.maxTile));

    const totalGames = botSeedResults.reduce(
      (sum, result) => sum + result.games,
      0,
    );

    const totalWins = botSeedResults.reduce(
      (sum, result) => sum + result.winCount,
      0,
    );

    const winRate = (totalWins / totalGames) * 100;

    const totalTimeMs = botSeedResults.reduce(
      (sum, result) => sum + result.totalTimeMs,
      0,
    );

    const averageTimeMs = totalTimeMs / totalGames;

    const totalSteps = botSeedResults.reduce((sum, result) => {
      return sum + result.averageSteps * result.games;
    }, 0);

    const averageMoveMs = totalSteps > 0 ? totalTimeMs / totalSteps : 0;

    const tileDistribution = {};

    for (const result of botSeedResults) {
      for (const tile in result.tileDistribution) {
        tileDistribution[tile] =
          (tileDistribution[tile] || 0) + result.tileDistribution[tile];
      }
    }

    summaries.push({
      botName,
      seeds: seedCount,
      games: totalGames,
      size: botSeedResults[0].size,
      averageScore,
      maxScore,
      averageSteps,
      maxTile,
      winCount: totalWins,
      winRate,
      totalTimeMs,
      averageTimeMs,
      averageMoveMs,
      tileDistribution,
      seedResults: botSeedResults,
    });
  }

  return summaries;
}

export function formatMultiSeedTable(summaries) {
  return summaries.map((summary) => ({
    bot: summary.botName,
    seeds: summary.seeds,
    games: summary.games,
    size: `${summary.size}x${summary.size}`,
    averageScore: Math.round(summary.averageScore),
    maxScore: summary.maxScore,
    averageSteps: Math.round(summary.averageSteps),
    maxTile: summary.maxTile,
    winCount: summary.winCount,
    winRate: `${summary.winRate.toFixed(2)}%`,
    totalTimeMs: Math.round(summary.totalTimeMs),
    averageTimeMs: Math.round(summary.averageTimeMs),
    averageMoveMs: Number(summary.averageMoveMs.toFixed(3)),
  }));
}

export function printMultiSeedTileDistributions(summaries) {
  for (const summary of summaries) {
    console.log(`${summary.botName} tile distribution:`);
    console.table(summary.tileDistribution);
  }
}
