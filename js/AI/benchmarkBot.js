import { Env2048 } from "./env2048.js";
import { getDepthMove } from "./depthBot.js";
import { getExpectimaxMove } from "./expectimaxBot.js";
import { getHeuristicMove } from "./heuristicBot.js";
import { getMaxTile } from "./evaluator.js";

function getBotMove(botName, board) {
  switch (botName) {
    case "depth2":
      return getDepthMove(board, 2);

    case "depth3":
      return getDepthMove(board, 3);

    case "heuristic":
    case "heuristicBot":
      return getHeuristicMove(board);

    case "expectimax":
    case "expectimaxBot":
      return getExpectimaxMove(board, 2);

    case "expectimax3":
    case "expectimaxBot3":
      return getExpectimaxMove(board, 3);
    default:
      throw new Error(`Unknown bot name: ${botName}`);
  }
}

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

  for (let i = 0; i < games; i++) {
    const gameResult = playOneGame(botName, {
      size,
      maxSteps,
    });

    results.push(gameResult);

    if (logEachGame) {
      console.log(
        `[${botName}] Game ${i + 1}/${games} finished | score: ${gameResult.score} | steps: ${gameResult.steps} | maxTile: ${gameResult.maxTile} | win: ${gameResult.win}`,
      );
    }
  }

  const totalScore = results.reduce((sum, game) => sum + game.score, 0);
  const totalSteps = results.reduce((sum, game) => sum + game.steps, 0);

  const averageScore = totalScore / games;
  const averageSteps = totalSteps / games;

  const maxScore = Math.max(...results.map((game) => game.score));
  const maxTile = Math.max(...results.map((game) => game.maxTile));

  const winCount = results.filter((game) => game.win).length;
  const winRate = (winCount / games) * 100;

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
    tileDistribution,
    rawResults: results,
  };
}
