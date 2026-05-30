import { Env2048 } from "./env2048.js";
import { getMaxTile } from "./evaluator.js";
import { getBotMove } from "./botRegistry.js";

export function playOneGame(botName, options = {}) {
  const { size = 4, maxSteps = 10000 } = options;

  const env = new Env2048(size);
  let state = env.reset();

  let steps = 0;

  while (!env.isDone() && steps < maxSteps) {
    const action = getBotMove(botName, state);

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
  const finalScore = env.getScore();
  const maxTile = getMaxTile(finalBoard);

  return {
    botName,
    size,
    score: finalScore,
    steps,
    maxTile,
    win: maxTile >= 2048,
    board: finalBoard,
  };
}

export function benchmarkBot(botName, options = {}) {
  const {
    games = 20,
    size = 4,
    maxSteps = 10000,
    logEachGame = false,
  } = options;

  const results = [];

  const startTime = performance.now();

  for (let i = 0; i < games; i++) {
    const gameStartTime = performance.now();

    const gameResult = playOneGame(botName, {
      size,
      maxSteps,
    });

    const gameEndTime = performance.now();
    const gameTimeMs = gameEndTime - gameStartTime;

    gameResult.timeMs = gameTimeMs;
    gameResult.averageMoveMs =
      gameResult.steps > 0 ? gameTimeMs / gameResult.steps : 0;

    results.push(gameResult);

    if (logEachGame) {
      console.log(
        `[${botName}] ${i + 1}/${games} | score=${gameResult.score} | steps=${gameResult.steps} | maxTile=${gameResult.maxTile} | win=${gameResult.win} | time=${gameResult.timeMs.toFixed(1)}ms`,
      );
    }
  }

  const endTime = performance.now();
  const totalTimeMs = endTime - startTime;

  const totalScore = results.reduce((sum, game) => sum + game.score, 0);
  const totalSteps = results.reduce((sum, game) => sum + game.steps, 0);

  const averageScore = totalScore / games;
  const averageSteps = totalSteps / games;

  const maxScore = Math.max(...results.map((game) => game.score));
  const maxTile = Math.max(...results.map((game) => game.maxTile));

  const winCount = results.filter((game) => game.win).length;
  const winRate = (winCount / games) * 100;

  const averageTimeMs = totalTimeMs / games;
  const averageMoveMs = totalSteps > 0 ? totalTimeMs / totalSteps : 0;

  const tileDistribution = {};

  for (const game of results) {
    tileDistribution[game.maxTile] = (tileDistribution[game.maxTile] || 0) + 1;
  }

  return {
    botName,
    games,
    size,
    averageScore,
    maxScore,
    averageSteps,
    maxTile,
    winCount,
    winRate,
    totalTimeMs,
    averageTimeMs,
    averageMoveMs,
    tileDistribution,
    rawResults: results,
  };
}
