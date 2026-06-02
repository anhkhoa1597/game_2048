import fs from "fs";
import path from "path";

import { getValidMoves, simulateMove } from "./boardSimulator.js";

const modelPath = path.resolve(process.cwd(), "ml/value_mlp_v1.json");
const model = JSON.parse(fs.readFileSync(modelPath, "utf-8"));

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

function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
}

function forward(input) {
  const { linear1, linear2, linear3, linear4 } = model.layers;

  const h1 = relu(linear(input, linear1.weight, linear1.bias));
  const h2 = relu(linear(h1, linear2.weight, linear2.bias));
  const h3 = relu(linear(h2, linear3.weight, linear3.bias));
  const output = linear(h3, linear4.weight, linear4.bias);

  return sigmoid(output[0]);
}

function evaluateBoardValue(board) {
  const input = encodeBoardLog2(board);
  return forward(input);
}

export function getValueMlpMove(board) {
  const validMoves = getValidMoves(board);

  if (validMoves.length === 0) {
    return null;
  }

  let bestMove = null;
  let bestValue = -Infinity;

  for (const move of validMoves) {
    const result = simulateMove(board, move);
    const value = evaluateBoardValue(result.board);

    if (value > bestValue) {
      bestValue = value;
      bestMove = move;
    }
  }

  return bestMove;
}