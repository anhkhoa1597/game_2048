import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ACTIVE_MODEL_PATH = path.join(CURRENT_DIR, "ntupleWeights.js");

function parseModelPathArg() {
  const modelFlagIndex = process.argv.indexOf("--model");

  if (modelFlagIndex !== -1) {
    return process.argv[modelFlagIndex + 1] || "";
  }

  return process.argv.find((arg) => arg.endsWith(".js") && arg !== process.argv[1]);
}

export function prepareNtupleBenchmarkModel() {
  const modelPathArg = parseModelPathArg();

  if (!modelPathArg) {
    return {
      activeModelPath: ACTIVE_MODEL_PATH,
      copiedModelPath: "",
    };
  }

  const sourcePath = path.resolve(modelPathArg);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Model file not found: ${sourcePath}`);
  }

  const copiedModelPath = sourcePath === ACTIVE_MODEL_PATH ? "" : sourcePath;

  if (copiedModelPath) {
    fs.copyFileSync(sourcePath, ACTIVE_MODEL_PATH);
  }

  return {
    activeModelPath: ACTIVE_MODEL_PATH,
    copiedModelPath,
  };
}

export async function printNtupleModelInfo(activeModelPath, copiedModelPath = "") {
  const modelUrl = `${pathToFileURL(activeModelPath).href}?t=${Date.now()}`;
  const { NTUPLE_TD_V1 } = await import(modelUrl);
  const metadata = NTUPLE_TD_V1.metadata || {};

  if (copiedModelPath) {
    console.log(`Using model file: ${copiedModelPath}`);
    console.log(`Copied to active model: ${activeModelPath}`);
  } else {
    console.log(`Using active model: ${activeModelPath}`);
  }

  console.log("N-tuple model metadata:");
  console.table({
    patternSet: metadata.patternSet,
    patterns: metadata.patterns,
    encodingBase: metadata.encodingBase,
    maxTilePower: metadata.maxTilePower,
    completedEpisodes: metadata.completedEpisodes,
    averageScore: Math.round(metadata.averageScore || 0),
    averageSteps: Math.round(metadata.averageSteps || 0),
    bestScore: metadata.bestScore,
    bestTile: metadata.bestTile,
    winRate: `${Number(metadata.winRate || 0).toFixed(2)}%`,
    stopAtTile: metadata.stopAtTile || 0,
    keptWeights: metadata.keptWeights,
    savedAt: metadata.savedAt,
  });
}
