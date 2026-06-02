import fs from "fs";
import path from "path";

import { Env2048 } from "../env2048.js";
import { getBotMove, BOT_NAMES } from "../botRegistry.js";
import { createSeededRandom } from "../random.js";
import { simulateMove } from "../boardSimulator.js";
import {
  encodeBoardForValueModel,
  getMaxTileForEncoding,
  normalizeValueTarget,
} from "./boardEncoding.js";

const DEFAULT_CONFIG = {
  botName: BOT_NAMES.CHAMPION_BEAM_3,
  games: 120,
  size: 4,
  maxSteps: 10000,
  seed: 20260602,
  outputFile: "js/ai/ml/afterstate-value-v1.jsonl",
  scoreNormalizer: 80000,
};

function ensureDirectoryExists(filePath) {
  const directory = path.dirname(filePath);

  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

function createSample(item, finalScore, finalMaxTile, config) {
  const target = normalizeValueTarget({
    finalScore,
    finalMaxTile,
    scoreNormalizer: config.scoreNormalizer,
  });

  return {
    x: encodeBoardForValueModel(item.afterstate),
    y: target,
    meta: {
      botName: config.botName,
      gameIndex: item.gameIndex,
      stepIndex: item.stepIndex,
      action: item.action,
      scoreBefore: item.scoreBefore,
      scoreGained: item.scoreGained,
      finalScore,
      finalMaxTile,
    },
  };
}

export function generateAfterstateDataset(options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };
  ensureDirectoryExists(config.outputFile);

  const output = fs.createWriteStream(config.outputFile, { flags: "w" });
  const stats = {
    botName: config.botName,
    games: config.games,
    samples: 0,
    averageFinalScore: 0,
    maxFinalScore: 0,
    maxTileCounts: {},
  };

  let totalFinalScore = 0;

  for (let gameIndex = 0; gameIndex < config.games; gameIndex++) {
    const random = createSeededRandom(config.seed + gameIndex);
    const env = new Env2048(config.size, { random });
    let state = env.reset();
    let stepIndex = 0;
    const trajectory = [];

    while (!env.isDone() && stepIndex < config.maxSteps) {
      const action = getBotMove(config.botName, state);

      if (!action) {
        break;
      }

      const afterstateResult = simulateMove(state, action);

      if (!afterstateResult.moved) {
        break;
      }

      trajectory.push({
        gameIndex,
        stepIndex,
        action,
        scoreBefore: env.getScore(),
        scoreGained: afterstateResult.scoreGained,
        afterstate: afterstateResult.board,
      });

      const result = env.step(action);

      if (!result.moved) {
        break;
      }

      state = result.state;
      stepIndex++;
    }

    const finalBoard = env.getState();
    const finalScore = env.getScore();
    const finalMaxTile = getMaxTileForEncoding(finalBoard);

    totalFinalScore += finalScore;
    stats.maxFinalScore = Math.max(stats.maxFinalScore, finalScore);
    stats.maxTileCounts[finalMaxTile] =
      (stats.maxTileCounts[finalMaxTile] || 0) + 1;

    for (const item of trajectory) {
      output.write(
        JSON.stringify(createSample(item, finalScore, finalMaxTile, config)) +
          "\n",
      );
      stats.samples++;
    }

    console.log(
      `Game ${gameIndex + 1}/${config.games} | steps=${stepIndex} | finalScore=${finalScore} | finalMaxTile=${finalMaxTile}`,
    );
  }

  output.end();
  stats.averageFinalScore = totalFinalScore / config.games;

  console.log("\nAfterstate dataset generated");
  console.log(JSON.stringify({ outputFile: config.outputFile, stats }, null, 2));

  return stats;
}

generateAfterstateDataset();
