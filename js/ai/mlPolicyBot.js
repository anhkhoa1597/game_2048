import fs from "fs";
import path from "path";

const modelPath = path.resolve(process.cwd(), "ml/policy_mlp_v1.json");

const model = JSON.parse(fs.readFileSync(modelPath, "utf-8"));

import { getValidMoves } from "./boardSimulator.js";

const LABEL_TO_MOVE = {
  0: "up",
  1: "right",
  2: "down",
  3: "left",
};

function tileToPower(tile) {
  if (tile === 0) {
    return 0;
  }

  return Math.log2(tile);
}

function encodeBoardLog2(board) {
  const encoded = [];

  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      encoded.push(tileToPower(board[row][col]) / model.normalizationDivisor);
    }
  }

  return encoded;
}

function linear(input, weight, bias) {
  const output = [];

  for (let outIndex = 0; outIndex < weight.length; outIndex++) {
    let sum = bias[outIndex];

    for (let inIndex = 0; inIndex < input.length; inIndex++) {
      sum += input[inIndex] * weight[outIndex][inIndex];
    }

    output.push(sum);
  }

  return output;
}

function relu(vector) {
  return vector.map((value) => Math.max(0, value));
}

function forward(input) {
  const { linear1, linear2, linear3 } = model.layers;

  const h1 = relu(linear(input, linear1.weight, linear1.bias));
  const h2 = relu(linear(h1, linear2.weight, linear2.bias));
  const logits = linear(h2, linear3.weight, linear3.bias);

  return logits;
}

function getMoveRanking(logits) {
  return logits
    .map((score, label) => ({
      label,
      move: LABEL_TO_MOVE[label],
      score,
    }))
    .sort((a, b) => b.score - a.score);
}

export function getPolicyMlpMove(board) {
  const validMoves = getValidMoves(board);

  if (validMoves.length === 0) {
    return null;
  }

  const input = encodeBoardLog2(board);
  const logits = forward(input);
  const ranking = getMoveRanking(logits);

  for (const candidate of ranking) {
    if (validMoves.includes(candidate.move)) {
      return candidate.move;
    }
  }

  return validMoves[0];
}
