import fs from "fs";
import readline from "readline";

import { VALUE_INPUT_SIZE } from "./boardEncoding.js";
import { createSeededRandom } from "../random.js";

const DEFAULT_CONFIG = {
  inputFile: "js/ai/ml/afterstate-value-v1.jsonl",
  outputFile: "js/ai/ml/valueMlpWeights.js",
  epochs: 4,
  learningRate: 0.003,
  hidden1: 32,
  hidden2: 16,
  seed: 424242,
  validationRatio: 0.12,
  maxSamples: 40000,
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

function createAdamLayer(layer) {
  return {
    weightM: layer.weight.map((row) => row.map(() => 0)),
    weightV: layer.weight.map((row) => row.map(() => 0)),
    biasM: layer.bias.map(() => 0),
    biasV: layer.bias.map(() => 0),
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

  let outputLogit = model.linear3.bias[0];

  for (let j = 0; j < a2.length; j++) {
    outputLogit += model.linear3.weight[0][j] * a2[j];
  }

  return {
    z1,
    a1,
    z2,
    a2,
    output: sigmoid(outputLogit),
  };
}

function updateParam(container, key, gradient, state, stateKeyM, stateKeyV, step, lr) {
  const beta1 = 0.9;
  const beta2 = 0.999;
  const epsilon = 1e-8;

  state[stateKeyM] = beta1 * state[stateKeyM] + (1 - beta1) * gradient;
  state[stateKeyV] = beta2 * state[stateKeyV] + (1 - beta2) * gradient * gradient;

  const mHat = state[stateKeyM] / (1 - Math.pow(beta1, step));
  const vHat = state[stateKeyV] / (1 - Math.pow(beta2, step));

  container[key] -= (lr * mHat) / (Math.sqrt(vHat) + epsilon);
}

function trainOneSample(model, adam, sample, step, learningRate) {
  const { x, y } = sample;
  const cache = forward(model, x);
  const error = cache.output - y;
  const dOutputLogit = error * cache.output * (1 - cache.output);

  for (let j = 0; j < model.linear3.weight[0].length; j++) {
    const gradient = dOutputLogit * cache.a2[j];
    updateParam(
      model.linear3.weight[0],
      j,
      gradient,
      {
        get weightM() {
          return adam.linear3.weightM[0][j];
        },
        set weightM(value) {
          adam.linear3.weightM[0][j] = value;
        },
        get weightV() {
          return adam.linear3.weightV[0][j];
        },
        set weightV(value) {
          adam.linear3.weightV[0][j] = value;
        },
      },
      "weightM",
      "weightV",
      step,
      learningRate,
    );
  }

  updateParam(
    model.linear3.bias,
    0,
    dOutputLogit,
    {
      get biasM() {
        return adam.linear3.biasM[0];
      },
      set biasM(value) {
        adam.linear3.biasM[0] = value;
      },
      get biasV() {
        return adam.linear3.biasV[0];
      },
      set biasV(value) {
        adam.linear3.biasV[0] = value;
      },
    },
    "biasM",
    "biasV",
    step,
    learningRate,
  );

  const dA2 = model.linear3.weight[0].map((weight) => dOutputLogit * weight);
  const dZ2 = dA2.map((value, index) => (cache.z2[index] > 0 ? value : 0));

  for (let i = 0; i < model.linear2.weight.length; i++) {
    for (let j = 0; j < model.linear2.weight[i].length; j++) {
      const gradient = dZ2[i] * cache.a1[j];
      updateParam(
        model.linear2.weight[i],
        j,
        gradient,
        {
          get weightM() {
            return adam.linear2.weightM[i][j];
          },
          set weightM(value) {
            adam.linear2.weightM[i][j] = value;
          },
          get weightV() {
            return adam.linear2.weightV[i][j];
          },
          set weightV(value) {
            adam.linear2.weightV[i][j] = value;
          },
        },
        "weightM",
        "weightV",
        step,
        learningRate,
      );
    }

    updateParam(
      model.linear2.bias,
      i,
      dZ2[i],
      {
        get biasM() {
          return adam.linear2.biasM[i];
        },
        set biasM(value) {
          adam.linear2.biasM[i] = value;
        },
        get biasV() {
          return adam.linear2.biasV[i];
        },
        set biasV(value) {
          adam.linear2.biasV[i] = value;
        },
      },
      "biasM",
      "biasV",
      step,
      learningRate,
    );
  }

  const dA1 = createVector(model.linear1.weight.length);

  for (let i = 0; i < model.linear2.weight.length; i++) {
    for (let j = 0; j < model.linear2.weight[i].length; j++) {
      dA1[j] += dZ2[i] * model.linear2.weight[i][j];
    }
  }

  const dZ1 = dA1.map((value, index) => (cache.z1[index] > 0 ? value : 0));

  for (let i = 0; i < model.linear1.weight.length; i++) {
    for (let j = 0; j < model.linear1.weight[i].length; j++) {
      const gradient = dZ1[i] * x[j];
      updateParam(
        model.linear1.weight[i],
        j,
        gradient,
        {
          get weightM() {
            return adam.linear1.weightM[i][j];
          },
          set weightM(value) {
            adam.linear1.weightM[i][j] = value;
          },
          get weightV() {
            return adam.linear1.weightV[i][j];
          },
          set weightV(value) {
            adam.linear1.weightV[i][j] = value;
          },
        },
        "weightM",
        "weightV",
        step,
        learningRate,
      );
    }

    updateParam(
      model.linear1.bias,
      i,
      dZ1[i],
      {
        get biasM() {
          return adam.linear1.biasM[i];
        },
        set biasM(value) {
          adam.linear1.biasM[i] = value;
        },
        get biasV() {
          return adam.linear1.biasV[i];
        },
        set biasV(value) {
          adam.linear1.biasV[i] = value;
        },
      },
      "biasM",
      "biasV",
      step,
      learningRate,
    );
  }

  return error * error;
}

async function loadSamples(config) {
  const stream = fs.createReadStream(config.inputFile);
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  const samples = [];

  for await (const line of rl) {
    if (!line.trim()) continue;

    const sample = JSON.parse(line);

    if (
      Array.isArray(sample.x) &&
      sample.x.length === VALUE_INPUT_SIZE &&
      typeof sample.y === "number"
    ) {
      samples.push({ x: sample.x, y: sample.y });
    }

    if (samples.length >= config.maxSamples) {
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

function evaluateLoss(model, samples) {
  let totalLoss = 0;

  for (const sample of samples) {
    const prediction = forward(model, sample.x).output;
    const error = prediction - sample.y;
    totalLoss += error * error;
  }

  return totalLoss / Math.max(samples.length, 1);
}

function buildModule(model, metadata) {
  return `export const VALUE_MLP_V1 = ${JSON.stringify(
    {
      type: "mlp-value",
      inputSize: VALUE_INPUT_SIZE,
      metadata,
      layers: model,
    },
    null,
    2,
  )};\n`;
}

export async function trainValueMlp(options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };
  const random = createSeededRandom(config.seed);
  const samples = await loadSamples(config);

  if (samples.length === 0) {
    throw new Error(`No valid samples found: ${config.inputFile}`);
  }

  shuffle(samples, random);

  const validationCount = Math.max(
    1,
    Math.floor(samples.length * config.validationRatio),
  );
  const validationSamples = samples.slice(0, validationCount);
  const trainSamples = samples.slice(validationCount);

  const model = {
    linear1: createLayer(config.hidden1, VALUE_INPUT_SIZE, random),
    linear2: createLayer(config.hidden2, config.hidden1, random),
    linear3: createLayer(1, config.hidden2, random),
  };
  const adam = {
    linear1: createAdamLayer(model.linear1),
    linear2: createAdamLayer(model.linear2),
    linear3: createAdamLayer(model.linear3),
  };

  let step = 0;

  for (let epoch = 1; epoch <= config.epochs; epoch++) {
    shuffle(trainSamples, random);
    let trainLoss = 0;

    for (const sample of trainSamples) {
      step++;
      trainLoss += trainOneSample(
        model,
        adam,
        sample,
        step,
        config.learningRate,
      );
    }

    trainLoss /= trainSamples.length;
    const validationLoss = evaluateLoss(model, validationSamples);

    console.log(
      `Epoch ${epoch}/${config.epochs} | trainLoss=${trainLoss.toFixed(
        5,
      )} | validationLoss=${validationLoss.toFixed(5)}`,
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
  console.log(`Saved value MLP model: ${config.outputFile}`);

  return { model, metadata };
}

trainValueMlp();
