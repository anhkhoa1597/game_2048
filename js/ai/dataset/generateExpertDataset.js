import fs from "fs";
import path from "path";

import { Env2048 } from "../env2048.js";
import { getBotMove, BOT_NAMES } from "../botRegistry.js";
import { createSeededRandom } from "../random.js";
import { getValidMoves } from "../boardSimulator.js";

import {
  encodeBoardLog2,
  countEmptyCellsForDataset,
  getMaxTileForDataset,
} from "./datasetEncoder.js";

import { moveToLabel } from "./moveLabels.js";

const CONFIG = {
  botName: BOT_NAMES.CHAMPION_BEAM_3,
  games: 100,
  size: 4,
  maxSteps: 10000,
  seed: 20260602,
  outputFile: "expert_championBeam3_100games_v1.jsonl",
  includeMeta: true,
};

function createDatasetSample({
  board,
  action,
  validMoves,
  gameIndex,
  stepIndex,
  score,
  botName,
}) {
  const maxTile = getMaxTileForDataset(board);
  const emptyCells = countEmptyCellsForDataset(board);

  return {
    x: encodeBoardLog2(board),
    y: moveToLabel(action),

    // meta để debug / phân tích dataset
    meta: {
      botName,
      gameIndex,
      stepIndex,
      score,
      action,
      validMoves,
      maxTile,
      emptyCells,
    },
  };
}

function generateExpertDataset(config = CONFIG) {
  const outputPath = path.resolve(process.cwd(), config.outputFile);
  const outputStream = fs.createWriteStream(outputPath, { flags: "w" });

  const stats = {
    botName: config.botName,
    games: config.games,
    size: config.size,
    seed: config.seed,
    samples: 0,
    moveCounts: {
      up: 0,
      right: 0,
      down: 0,
      left: 0,
    },
    maxTileCounts: {},
    emptyCellCounts: {},
  };

  for (let gameIndex = 0; gameIndex < config.games; gameIndex++) {
    const random = createSeededRandom(config.seed + gameIndex);
    const env = new Env2048(config.size, { random });

    let state = env.reset();
    let stepIndex = 0;

    while (!env.isDone() && stepIndex < config.maxSteps) {
      const boardBefore = state;
      const validMoves = getValidMoves(boardBefore);
      const action = getBotMove(config.botName, boardBefore);

      if (!action) {
        break;
      }

      if (!validMoves.includes(action)) {
        console.warn(
          `[Warning] Invalid expert action at game=${gameIndex}, step=${stepIndex}: ${action}`,
        );
        break;
      }

      const sample = createDatasetSample({
        board: boardBefore,
        action,
        validMoves,
        gameIndex,
        stepIndex,
        score: env.getScore(),
        botName: config.botName,
      });

      const line = config.includeMeta
        ? JSON.stringify(sample)
        : JSON.stringify({ x: sample.x, y: sample.y });

      outputStream.write(line + "\n");

      stats.samples++;
      stats.moveCounts[action]++;

      const maxTile = sample.meta.maxTile;
      const emptyCells = sample.meta.emptyCells;

      stats.maxTileCounts[maxTile] = (stats.maxTileCounts[maxTile] || 0) + 1;
      stats.emptyCellCounts[emptyCells] =
        (stats.emptyCellCounts[emptyCells] || 0) + 1;

      const result = env.step(action);

      if (!result.moved) {
        break;
      }

      state = result.state;
      stepIndex++;
    }

    console.log(
      `Game ${gameIndex + 1}/${config.games} finished | steps=${stepIndex} | score=${env.getScore()}`,
    );
  }

  outputStream.end();

  console.log("\nDataset generated:");
  console.log(outputPath);

  console.log("\nStats:");
  console.log(JSON.stringify(stats, null, 2));

  return stats;
}

generateExpertDataset();