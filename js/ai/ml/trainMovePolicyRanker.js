import fs from "fs";
import readline from "readline";

import { RANKER_INPUT_SIZE } from "./boardEncoding.js";
import { createSeededRandom } from "../random.js";

const DEFAULT_CONFIG = {
  inputFile: "js/ai/ml/move-policy-v1.jsonl",
  outputFile: "js/ai/ml/rankerMlpWeights.js",
  epochs: 6,
  learningRate: 0.008,
  hidden1: 48,
  hidden2: 24,
  seed: 616161,
  validationRatio: 0.12,
  maxStates: 120000,
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

function softmax(scores) {
  const maxScore = Math.max(...scores);
  const expScores = scores.map((score) => Math.exp(score - maxScore));
  const sum = expScores.reduce((total, value) => total + value, 0);

  return expScores.map((value) => value / sum);
}

function clipGradient(value, limit = 3) {
  if (value > limit) return limit;
  if (value < -limit) return -limit;
  return value;
}

function createZeroGradients(model) {
  return {
    linear1Weight: model.linear1.weight.map((row) => row.map(() => 0)),
    linear1Bias: model.linear1.bias.map(() => 0),
    linear2Weight: model.linear2.weight.map((row) => row.map(() => 0)),
    linear2Bias: model.linear2.bias.map(() => 0),
    linear3Weight: model.linear3.weight.map((row) => row.map(() => 0)),
    linear3Bias: model.linear3.bias.map(() => 0),
  };
}

function addBackwardGradients(model, gradients, x, cache, outputGradient) {
  const dScore = clipGradient(outputGradient);

  for (let j = 0; j < model.linear3.weight[0].length; j++) {
    gradients.linear3Weight[0][j] += dScore * cache.a2[j];
  }

  gradients.linear3Bias[0] += dScore;

  const dA2 = model.linear3.weight[0].map((weight) => weight * dScore);
  const dZ2 = dA2.map((value, index) =>
    cache.z2[index] > 0 ? clipGradient(value) : 0,
  );
  const dA1 = createVector(model.linear1.weight.length);

  for (let i = 0; i < model.linear2.weight.length; i++) {
    for (let j = 0; j < model.linear2.weight[i].length; j++) {
      dA1[j] += model.linear2.weight[i][j] * dZ2[i];
      gradients.linear2Weight[i][j] += dZ2[i] * cache.a1[j];
    }

    gradients.linear2Bias[i] += dZ2[i];
  }

  const dZ1 = dA1.map((value, index) =>
    cache.z1[index] > 0 ? clipGradient(value) : 0,
  );

  for (let i = 0; i < model.linear1.weight.length; i++) {
    for (let j = 0; j < model.linear1.weight[i].length; j++) {
      gradients.linear1Weight[i][j] += dZ1[i] * x[j];
    }

    gradients.linear1Bias[i] += dZ1[i];
  }
}

function applyGradients(model, gradients, learningRate) {
  for (let i = 0; i < model.linear1.weight.length; i++) {
    for (let j = 0; j < model.linear1.weight[i].length; j++) {
      model.linear1.weight[i][j] -= learningRate * gradients.linear1Weight[i][j];
    }

    model.linear1.bias[i] -= learningRate * gradients.linear1Bias[i];
  }

  for (let i = 0; i < model.linear2.weight.length; i++) {
    for (let j = 0; j < model.linear2.weight[i].length; j++) {
      model.linear2.weight[i][j] -= learningRate * gradients.linear2Weight[i][j];
    }

    model.linear2.bias[i] -= learningRate * gradients.linear2Bias[i];
  }

  for (let j = 0; j < model.linear3.weight[0].length; j++) {
    model.linear3.weight[0][j] -= learningRate * gradients.linear3Weight[0][j];
  }

  model.linear3.bias[0] -= learningRate * gradients.linear3Bias[0];
}

function trainSample(model, sample, learningRate) {
  const caches = sample.candidates.map((candidate) => forward(model, candidate.x));
  const scores = caches.map((cache) => cache.score);
  const probabilities = softmax(scores);
  const loss = -Math.log(Math.max(probabilities[sample.y], 1e-8));
  const predictedIndex = probabilities.indexOf(Math.max(...probabilities));
  const gradients = createZeroGradients(model);

  for (let i = 0; i < sample.candidates.length; i++) {
    const outputGradient = probabilities[i] - (i === sample.y ? 1 : 0);
    addBackwardGradients(
      model,
      gradients,
      sample.candidates[i].x,
      caches[i],
      outputGradient,
    );
  }

  applyGradients(model, gradients, learningRate);

  return {
    loss,
    correct: predictedIndex === sample.y ? 1 : 0,
  };
}

async function loadSamples(config) {
  const stream = fs.createReadStream(config.inputFile);
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  const samples = [];

  for await (const line of rl) {
    if (!line.trim()) continue;

    const sample = JSON.parse(line);

    if (
      Number.isInteger(sample.y) &&
      Array.isArray(sample.candidates) &&
      sample.candidates.length >= 2 &&
      sample.candidates.every(
        (candidate) =>
          Array.isArray(candidate.x) && candidate.x.length === RANKER_INPUT_SIZE,
      )
    ) {
      samples.push({
        y: sample.y,
        candidates: sample.candidates.map((candidate) => ({ x: candidate.x })),
      });
    }

    if (samples.length >= config.maxStates) {
      break;
    }
  }

  return samples;
}

function shuffle(values, random) {
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const temp = values[i];
    values[i] = values[j];
    values[j] = temp;
  }
}

function evaluateSamples(model, samples) {
  let totalLoss = 0;
  let correct = 0;

  for (const sample of samples) {
    const scores = sample.candidates.map(
      (candidate) => forward(model, candidate.x).score,
    );
    const probabilities = softmax(scores);
    const predictedIndex = probabilities.indexOf(Math.max(...probabilities));

    totalLoss += -Math.log(Math.max(probabilities[sample.y], 1e-8));

    if (predictedIndex === sample.y) {
      correct++;
    }
  }

  return {
    loss: totalLoss / Math.max(samples.length, 1),
    accuracy: correct / Math.max(samples.length, 1),
  };
}

function buildModule(model, metadata) {
  return `export const RANKER_MLP_V1 = ${JSON.stringify(
    {
      type: "mlp-move-policy-ranker",
      inputSize: RANKER_INPUT_SIZE,
      metadata,
      layers: model,
    },
    null,
    2,
  )};\n`;
}

export async function trainMovePolicyRanker(options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };
  const random = createSeededRandom(config.seed);
  const samples = await loadSamples(config);

  if (samples.length === 0) {
    throw new Error(`No valid policy samples found: ${config.inputFile}`);
  }

  shuffle(samples, random);

  const validationCount = Math.max(
    1,
    Math.floor(samples.length * config.validationRatio),
  );
  const validationSamples = samples.slice(0, validationCount);
  const trainSamples = samples.slice(validationCount);

  const model = {
    linear1: createLayer(config.hidden1, RANKER_INPUT_SIZE, random),
    linear2: createLayer(config.hidden2, config.hidden1, random),
    linear3: createLayer(1, config.hidden2, random),
  };

  for (let epoch = 1; epoch <= config.epochs; epoch++) {
    shuffle(trainSamples, random);
    let trainLoss = 0;
    let trainCorrect = 0;

    for (const sample of trainSamples) {
      const result = trainSample(model, sample, config.learningRate);
      trainLoss += result.loss;
      trainCorrect += result.correct;
    }

    const validation = evaluateSamples(model, validationSamples);

    console.log(
      `Epoch ${epoch}/${config.epochs} | trainLoss=${(
        trainLoss / trainSamples.length
      ).toFixed(5)} | trainAcc=${(trainCorrect / trainSamples.length).toFixed(
        3,
      )} | validationLoss=${validation.loss.toFixed(
        5,
      )} | validationAcc=${validation.accuracy.toFixed(3)}`,
    );
  }

  const metadata = {
    trainedAt: new Date().toISOString(),
    inputFile: config.inputFile,
    samples: samples.length,
    trainSamples: trainSamples.length,
    validationSamples: validationSamples.length,
    epochs: config.epochs,
    learningRate: config.learningRate,
    hidden1: config.hidden1,
    hidden2: config.hidden2,
  };

  fs.writeFileSync(config.outputFile, buildModule(model, metadata), "utf-8");
  console.log(`Saved policy ranker MLP model: ${config.outputFile}`);

  return { model, metadata };
}

trainMovePolicyRanker();
