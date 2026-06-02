import fs from "fs";
import readline from "readline";

import { scoreEncodedMoveWithRanker } from "./rankerMlpBot.js";

const CONFIG = {
  inputFile: "js/ai/ml/move-policy-v1.jsonl",
  thresholds: [0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9],
  margins: [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5],
};

function softmax(scores) {
  const maxScore = Math.max(...scores);
  const expScores = scores.map((score) => Math.exp(score - maxScore));
  const sum = expScores.reduce((total, value) => total + value, 0);

  return expScores.map((value) => value / sum);
}

async function analyzePolicyRankerConfidence(config = CONFIG) {
  const stream = fs.createReadStream(config.inputFile);
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  const stats = {};

  for (const threshold of config.thresholds) {
    for (const margin of config.margins) {
      stats[`${threshold}|${margin}`] = {
        threshold,
        margin,
        total: 0,
        accepted: 0,
        correct: 0,
      };
    }
  }

  for await (const line of rl) {
    if (!line.trim()) continue;

    const sample = JSON.parse(line);

    if (
      !Number.isInteger(sample.y) ||
      !Array.isArray(sample.candidates) ||
      sample.candidates.length < 2
    ) {
      continue;
    }

    const scores = sample.candidates.map((candidate) =>
      scoreEncodedMoveWithRanker(candidate.x),
    );

    const probabilities = softmax(scores);
    const rankedIndexes = scores
      .map((score, index) => ({ score, index, probability: probabilities[index] }))
      .sort((a, b) => b.score - a.score);
    const best = rankedIndexes[0];
    const second = rankedIndexes[1];
    const bestMargin = best.score - second.score;

    for (const key in stats) {
      const item = stats[key];
      item.total++;

      if (best.probability >= item.threshold && bestMargin >= item.margin) {
        item.accepted++;

        if (best.index === sample.y) {
          item.correct++;
        }
      }
    }
  }

  const rows = Object.values(stats).map((item) => ({
    threshold: item.threshold,
    margin: item.margin,
    coverage: Number((item.accepted / Math.max(item.total, 1)).toFixed(3)),
    acceptedAccuracy: Number(
      (item.correct / Math.max(item.accepted, 1)).toFixed(3),
    ),
    accepted: item.accepted,
  }));

  console.table(rows);
}

analyzePolicyRankerConfidence();
