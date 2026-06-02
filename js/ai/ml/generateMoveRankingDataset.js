import fs from "fs";
import path from "path";

import { Env2048 } from "../env2048.js";
import { getBotMove, BOT_NAMES } from "../botRegistry.js";
import { createSeededRandom } from "../random.js";
import { getValidMoves, simulateMove } from "../boardSimulator.js";
import { encodeMoveCandidateForRanker } from "./boardEncoding.js";

const DEFAULT_CONFIG = {
  botName: BOT_NAMES.CHAMPION_BEAM_3,
  games: 160,
  size: 4,
  maxSteps: 10000,
  seed: 20260603,
  outputFile: "js/ai/ml/move-ranking-v1.jsonl",
};

function ensureDirectoryExists(filePath) {
  const directory = path.dirname(filePath);

  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

function createPair({ board, expertMove, otherMove, gameIndex, stepIndex }) {
  const expertResult = simulateMove(board, expertMove);
  const otherResult = simulateMove(board, otherMove);

  return {
    winner: encodeMoveCandidateForRanker(
      board,
      expertMove,
      expertResult.board,
      expertResult.scoreGained,
    ),
    loser: encodeMoveCandidateForRanker(
      board,
      otherMove,
      otherResult.board,
      otherResult.scoreGained,
    ),
    meta: {
      gameIndex,
      stepIndex,
      expertMove,
      otherMove,
      expertScoreGained: expertResult.scoreGained,
      otherScoreGained: otherResult.scoreGained,
    },
  };
}

export function generateMoveRankingDataset(options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };
  ensureDirectoryExists(config.outputFile);

  const output = fs.createWriteStream(config.outputFile, { flags: "w" });
  const stats = {
    botName: config.botName,
    games: config.games,
    states: 0,
    pairs: 0,
    skippedStates: 0,
    moveCounts: {
      up: 0,
      down: 0,
      left: 0,
      right: 0,
    },
  };

  for (let gameIndex = 0; gameIndex < config.games; gameIndex++) {
    const random = createSeededRandom(config.seed + gameIndex);
    const env = new Env2048(config.size, { random });
    let state = env.reset();
    let stepIndex = 0;

    while (!env.isDone() && stepIndex < config.maxSteps) {
      const validMoves = getValidMoves(state);
      const expertMove = getBotMove(config.botName, state);

      if (!expertMove || !validMoves.includes(expertMove)) {
        stats.skippedStates++;
        break;
      }

      stats.states++;
      stats.moveCounts[expertMove]++;

      for (const otherMove of validMoves) {
        if (otherMove === expertMove) continue;

        output.write(
          JSON.stringify(
            createPair({
              board: state,
              expertMove,
              otherMove,
              gameIndex,
              stepIndex,
            }),
          ) + "\n",
        );
        stats.pairs++;
      }

      const result = env.step(expertMove);

      if (!result.moved) {
        break;
      }

      state = result.state;
      stepIndex++;
    }

    console.log(
      `Game ${gameIndex + 1}/${config.games} | states=${stepIndex} | pairs=${stats.pairs}`,
    );
  }

  output.end();

  console.log("\nMove ranking dataset generated");
  console.log(JSON.stringify({ outputFile: config.outputFile, stats }, null, 2));

  return stats;
}

generateMoveRankingDataset();
