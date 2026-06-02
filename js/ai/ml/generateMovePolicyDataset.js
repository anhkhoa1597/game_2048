import fs from "fs";
import path from "path";

import { Env2048 } from "../env2048.js";
import { getBotMove, BOT_NAMES } from "../botRegistry.js";
import { createSeededRandom } from "../random.js";
import { getValidMoves, simulateMove } from "../boardSimulator.js";
import { encodeMoveCandidateForRanker } from "./boardEncoding.js";

const DEFAULT_CONFIG = {
  botName: BOT_NAMES.CHAMPION_BEAM_3,
  games: 180,
  size: 4,
  maxSteps: 10000,
  seed: 20260604,
  outputFile: "js/ai/ml/move-policy-v1.jsonl",
};

function ensureDirectoryExists(filePath) {
  const directory = path.dirname(filePath);

  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

function createPolicySample({ board, validMoves, expertMove, gameIndex, stepIndex }) {
  const candidates = validMoves.map((move) => {
    const result = simulateMove(board, move);

    return {
      move,
      x: encodeMoveCandidateForRanker(
        board,
        move,
        result.board,
        result.scoreGained,
      ),
      scoreGained: result.scoreGained,
    };
  });

  return {
    y: candidates.findIndex((candidate) => candidate.move === expertMove),
    candidates,
    meta: {
      gameIndex,
      stepIndex,
      expertMove,
      validMoves,
    },
  };
}

export function generateMovePolicyDataset(options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };
  ensureDirectoryExists(config.outputFile);

  const output = fs.createWriteStream(config.outputFile, { flags: "w" });
  const stats = {
    botName: config.botName,
    games: config.games,
    states: 0,
    skippedStates: 0,
    candidateCounts: {},
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

      const sample = createPolicySample({
        board: state,
        validMoves,
        expertMove,
        gameIndex,
        stepIndex,
      });

      if (sample.y < 0) {
        stats.skippedStates++;
        break;
      }

      output.write(JSON.stringify(sample) + "\n");
      stats.states++;
      stats.moveCounts[expertMove]++;
      stats.candidateCounts[validMoves.length] =
        (stats.candidateCounts[validMoves.length] || 0) + 1;

      const result = env.step(expertMove);

      if (!result.moved) {
        break;
      }

      state = result.state;
      stepIndex++;
    }

    console.log(
      `Game ${gameIndex + 1}/${config.games} | states=${stepIndex} | total=${stats.states}`,
    );
  }

  output.end();

  console.log("\nMove policy dataset generated");
  console.log(JSON.stringify({ outputFile: config.outputFile, stats }, null, 2));

  return stats;
}

generateMovePolicyDataset();
