import fs from "fs";

import { Env2048 } from "./env2048.js";
import { getBotMove, BOT_NAMES } from "./botRegistry.js";
import { createSeededRandom } from "./random.js";

function tileToPower(tile) {
  if (tile === 0) return 0;
  return Math.log2(tile);
}

function encodeBoardLog2(board) {
  const encoded = [];

  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      encoded.push(tileToPower(board[row][col]));
    }
  }

  return encoded;
}

function getMaxTile(board) {
  let maxTile = 0;

  for (const row of board) {
    for (const tile of row) {
      if (tile > maxTile) {
        maxTile = tile;
      }
    }
  }

  return maxTile;
}

function countEmptyCells(board) {
  let count = 0;

  for (const row of board) {
    for (const tile of row) {
      if (tile === 0) {
        count++;
      }
    }
  }

  return count;
}

const CONFIG = {
  botName: BOT_NAMES.CHAMPION_BEAM_3,
  games: 1000,
  size: 4,
  maxSteps: 10000,
  seed: 20260602,
  outputFile: "expert_championBeam3_value_1000games_v1.jsonl",
  scoreNormalizer: 70000,
};

function normalizeValue(finalScore, scoreNormalizer) {
  return Math.min(finalScore / scoreNormalizer, 1);
}

function generateValueDataset(config = CONFIG) {
  const outputStream = fs.createWriteStream(config.outputFile, { flags: "w" });

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
      const boardBefore = state;
      const scoreBefore = env.getScore();
      const action = getBotMove(config.botName, boardBefore);

      if (!action) {
        break;
      }

      trajectory.push({
        board: boardBefore,
        gameIndex,
        stepIndex,
        score: scoreBefore,
        action,
        maxTile: getMaxTile(boardBefore),
        emptyCells: countEmptyCells(boardBefore),
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
    const finalMaxTile = getMaxTile(finalBoard);
    const value = normalizeValue(finalScore, config.scoreNormalizer);

    totalFinalScore += finalScore;
    stats.maxFinalScore = Math.max(stats.maxFinalScore, finalScore);
    stats.maxTileCounts[finalMaxTile] =
      (stats.maxTileCounts[finalMaxTile] || 0) + 1;

    for (const item of trajectory) {
      const sample = {
        x: encodeBoardLog2(item.board),
        value,
        meta: {
          gameIndex: item.gameIndex,
          stepIndex: item.stepIndex,
          score: item.score,
          action: item.action,
          maxTile: item.maxTile,
          emptyCells: item.emptyCells,
          finalScore,
          finalMaxTile,
        },
      };

      outputStream.write(JSON.stringify(sample) + "\n");
      stats.samples++;
    }

    console.log(
      `Game ${gameIndex + 1}/${config.games} | steps=${stepIndex} | finalScore=${finalScore} | finalMaxTile=${finalMaxTile}`,
    );
  }

  outputStream.end();

  stats.averageFinalScore = totalFinalScore / config.games;

  console.log("\nValue dataset generated");
  console.log("----------------------------------------");
  console.log(`Output: ${config.outputFile}`);
  console.log(JSON.stringify(stats, null, 2));
}

generateValueDataset();
