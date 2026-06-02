import fs from "fs";
import readline from "readline";

const CONFIG = {
  inputFile: "expert_championBeam3_value_1000games_v1.jsonl",

  trainFile: "expert_championBeam3_value_train_v1.jsonl",
  valFile: "expert_championBeam3_value_val_v1.jsonl",
  testFile: "expert_championBeam3_value_test_v1.jsonl",

  trainRatio: 0.8,
  valRatio: 0.1,
  testRatio: 0.1,
};

function getSplitByGameIndex(gameIndex, config) {
  const bucket = gameIndex % 10;

  if (bucket < config.trainRatio * 10) {
    return "train";
  }

  if (bucket < (config.trainRatio + config.valRatio) * 10) {
    return "val";
  }

  return "test";
}

function isValidSample(sample) {
  return (
    sample &&
    Array.isArray(sample.x) &&
    sample.x.length === 16 &&
    typeof sample.value === "number" &&
    sample.value >= 0 &&
    sample.value <= 1 &&
    sample.meta &&
    Number.isInteger(sample.meta.gameIndex)
  );
}

async function prepareValueDataset(config = CONFIG) {
  const inputStream = fs.createReadStream(config.inputFile);

  const rl = readline.createInterface({
    input: inputStream,
    crlfDelay: Infinity,
  });

  const trainStream = fs.createWriteStream(config.trainFile, { flags: "w" });
  const valStream = fs.createWriteStream(config.valFile, { flags: "w" });
  const testStream = fs.createWriteStream(config.testFile, { flags: "w" });

  const stats = {
    total: 0,
    invalid: 0,
    train: 0,
    val: 0,
    test: 0,
    minValue: Infinity,
    maxValue: -Infinity,
  };

  for await (const line of rl) {
    if (!line.trim()) continue;

    let sample;

    try {
      sample = JSON.parse(line);
    } catch {
      stats.invalid++;
      continue;
    }

    stats.total++;

    if (!isValidSample(sample)) {
      stats.invalid++;
      continue;
    }

    const cleanSample = {
      x: sample.x,
      value: sample.value,
    };

    stats.minValue = Math.min(stats.minValue, sample.value);
    stats.maxValue = Math.max(stats.maxValue, sample.value);

    const outputLine = JSON.stringify(cleanSample) + "\n";
    const split = getSplitByGameIndex(sample.meta.gameIndex, config);

    if (split === "train") {
      trainStream.write(outputLine);
      stats.train++;
    } else if (split === "val") {
      valStream.write(outputLine);
      stats.val++;
    } else {
      testStream.write(outputLine);
      stats.test++;
    }
  }

  trainStream.end();
  valStream.end();
  testStream.end();

  console.log("\nPrepared value dataset");
  console.log("----------------------------------------");
  console.log(`Input : ${config.inputFile}`);
  console.log(`Train : ${config.trainFile}`);
  console.log(`Val   : ${config.valFile}`);
  console.log(`Test  : ${config.testFile}`);

  console.log("\nStats:");
  console.log(JSON.stringify(stats, null, 2));
}

prepareValueDataset();