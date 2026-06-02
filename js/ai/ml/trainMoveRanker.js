import fs from "fs";
import readline from "readline";

import { RANKER_INPUT_SIZE } from "./boardEncoding.js";
import { createSeededRandom } from "../random.js";

const DEFAULT_CONFIG = {
  inputFile: "js/ai/ml/move-ranking-v1.jsonl",
  outputFile: "js/ai/ml/rankerMlpWeights.js",
  epochs: 5,
  learningRate: 0.01,
  hidden1: 32,
  hidden2: 16,
  seed: 515151,
  validationRatio: 0.12,
  maxPairs: 100000,
};

function createMatrix(rows, cols, random) {
  const scale = Math.sqrt(2 / cols);

  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => (random() * 2 - 1) * scale),
  );
}

function createVector(size, value = 0) {
  return Array(size).fill(value);
}

function createLayer(outSize, inSize, random) {
  return {
    weight: createMatrix(outSize, inSize, random),
    bias: createVector(outSize),
  };
}

function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
}

function forward(model, x) {
  const z1 = [];
  const a1 = [];
  const z2 = [];
  const a2 = [];

  for (let i = 0; i < model.linear1.weight.length; i++) {
    let sum = model.linear1.bias[i];

    for (let j = 0; j < x.length; j++) {
      sum += model.linear1.weight[i][j] * x[j];
    }

    z1.push(sum);
    a1.push(sum > 0 ? sum : 0);
  }

  for (let i = 0; i < model.linear2.weight.length; i++) {
    let sum = model.linear2.bias[i];

    for (let j = 0; j < a1.length; j++) {
      sum += model.linear2.weight[i][j] * a1[j];
    }

    z2.push(sum);
    a2.push(sum > 0 ? sum : 0);
  }

  let score = model.linear3.bias[0];

  for (let j = 0; j < a2.length; j++) {
    score += model.linear3.weight[0][j] * a2[j];
  }

  return { z1, a1, z2, a2, score };
}

function clipGradient(value, limit = 3) {
  if (value > limit) return limit;
  if (value < -limit) return -limit;
  return value;
}

function backward(model, x, cache, outputGradient, learningRate) {
  const clippedOutputGradient = clipGradient(outputGradient);
  const dA2 = model.linear3.weight[0].map(
    (weight) => weight * clippedOutputGradient,
  );

  for (let j = 0; j < model.linear3.weight[0].length; j++) {
    model.linear3.weight[0][j] -=
      learningRate * clippedOutputGradient * cache.a2[j];
  }

  model.linear3.bias[0] -= learningRate * clippedOutputGradient;

  const dZ2 = dA2.map((value, index) =>
    cache.z2[index] > 0 ? clipGradient(value) : 0,
  );
  const dA1 = createVector(model.linear1.weight.length);

  for (let i = 0; i < model.linear2.weight.length; i++) {
    for (let j = 0; j < model.linear2.weight[i].length; j++) {
      dA1[j] += model.linear2.weight[i][j] * dZ2[i];
      model.linear2.weight[i][j] -= learningRate * dZ2[i] * cache.a1[j];
    }

    model.linear2.bias[i] -= learningRate * dZ2[i];
  }

  const dZ1 = dA1.map((value, index) =>
    cache.z1[index] > 0 ? clipGradient(value) : 0,
  );

  for (let i = 0; i < model.linear1.weight.length; i++) {
    for (let j = 0; j < model.linear1.weight[i].length; j++) {
      model.linear1.weight[i][j] -= learningRate * dZ1[i] * x[j];
    }

    model.linear1.bias[i] -= learningRate * dZ1[i];
  }
}

function trainPair(model, pair, learningRate) {
  const winnerCache = forward(model, pair.winner);
  const loserCache = forward(model, pair.loser);
  const margin = winnerCache.score - loserCache.score;
  const probability = sigmoid(margin);
  const loss = -Math.log(Math.max(probability, 1e-8));
  const dMargin = probability - 1;

  backward(model, pair.winner, winnerCache, dMargin, learningRate);
  backward(model, pair.loser, loserCache, -dMargin, learningRate);

  return {
    loss,
    correct: winnerCache.score > loserCache.score ? 1 : 0,
  };
}

async function loadPairs(config) {
  const stream = fs.createReadStream(config.inputFile);
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  const pairs = [];

  for await (const line of rl) {
    if (!line.trim()) continue;

    const pair = JSON.parse(line);

    if (
      Array.isArray(pair.winner) &&
      pair.winner.length === RANKER_INPUT_SIZE &&
      Array.isArray(pair.loser) &&
      pair.loser.length === RANKER_INPUT_SIZE
    ) {
      pairs.push({
        winner: pair.winner,
        loser: pair.loser,
      });
    }

    if (pairs.length >= config.maxPairs) {
      break;
    }
  }

  return pairs;
}

function shuffle(values, random) {
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const temp = values[i];
    values[i] = values[j];
    values[j] = temp;
  }
}

function evaluatePairs(model, pairs) {
  let totalLoss = 0;
  let correct = 0;

  for (const pair of pairs) {
    const winnerScore = forward(model, pair.winner).score;
    const loserScore = forward(model, pair.loser).score;
    const probability = sigmoid(winnerScore - loserScore);

    totalLoss += -Math.log(Math.max(probability, 1e-8));

    if (winnerScore > loserScore) {
      correct++;
    }
  }

  return {
    loss: totalLoss / Math.max(pairs.length, 1),
    accuracy: correct / Math.max(pairs.length, 1),
  };
}

function buildModule(model, metadata) {
  return `export const RANKER_MLP_V1 = ${JSON.stringify(
    {
      type: "mlp-afterstate-ranker",
      inputSize: RANKER_INPUT_SIZE,
      metadata,
      layers: model,
    },
    null,
    2,
  )};\n`;
}

export async function trainMoveRanker(options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };
  const random = createSeededRandom(config.seed);
  const pairs = await loadPairs(config);

  if (pairs.length === 0) {
    throw new Error(`No valid ranking pairs found: ${config.inputFile}`);
  }

  shuffle(pairs, random);

  const validationCount = Math.max(
    1,
    Math.floor(pairs.length * config.validationRatio),
  );
  const validationPairs = pairs.slice(0, validationCount);
  const trainPairs = pairs.slice(validationCount);

  const model = {
    linear1: createLayer(config.hidden1, RANKER_INPUT_SIZE, random),
    linear2: createLayer(config.hidden2, config.hidden1, random),
    linear3: createLayer(1, config.hidden2, random),
  };

  for (let epoch = 1; epoch <= config.epochs; epoch++) {
    shuffle(trainPairs, random);
    let trainLoss = 0;
    let trainCorrect = 0;

    for (const pair of trainPairs) {
      const result = trainPair(model, pair, config.learningRate);
      trainLoss += result.loss;
      trainCorrect += result.correct;
    }

    const validation = evaluatePairs(model, validationPairs);

    console.log(
      `Epoch ${epoch}/${config.epochs} | trainLoss=${(
        trainLoss / trainPairs.length
      ).toFixed(5)} | trainAcc=${(trainCorrect / trainPairs.length).toFixed(
        3,
      )} | validationLoss=${validation.loss.toFixed(
        5,
      )} | validationAcc=${validation.accuracy.toFixed(3)}`,
    );
  }

  const metadata = {
    trainedAt: new Date().toISOString(),
    inputFile: config.inputFile,
    pairs: pairs.length,
    trainPairs: trainPairs.length,
    validationPairs: validationPairs.length,
    epochs: config.epochs,
    learningRate: config.learningRate,
    hidden1: config.hidden1,
    hidden2: config.hidden2,
  };

  fs.writeFileSync(config.outputFile, buildModule(model, metadata), "utf-8");
  console.log(`Saved ranker MLP model: ${config.outputFile}`);

  return { model, metadata };
}

trainMoveRanker();
