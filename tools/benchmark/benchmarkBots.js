import { benchmarkBot } from "./benchmarkBot.js";

export function benchmarkBots(botNames, options = {}) {
  const summaries = [];

  for (const botName of botNames) {
    console.log(`Running benchmark: ${botName}`);

    const summary = benchmarkBot(botName, options);
    summaries.push(summary);
  }

  return summaries;
}

export function formatBenchmarkSummary(summary) {
  return {
    bot: summary.botName,
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
  };
}

export function formatBenchmarkTable(summaries) {
  return summaries.map((summary) => formatBenchmarkSummary(summary));
}

export function printTileDistributions(summaries) {
  for (const summary of summaries) {
    console.log(`${summary.botName} tile distribution:`);
    console.table(summary.tileDistribution);
  }
}
