import { Env2048 } from "./env2048.js";
import {
  getWeightedDepthMove,
  getWeightedBeamDepthMove,
} from "./weightedDepthBot.js";
import {
  DEFAULT_WEIGHTS,
  createRandomWeights,
  mutateWeights,
  cloneWeights,
} from "./weightedEvaluator.js";
import { getMaxTile } from "./evaluator.js";
import fs from "fs";
function ensureDirectoryExists(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
}

function saveTrainingCheckpoint(globalBest, metadata = {}) {
  if (!globalBest) return;

  const outputDir = "training-checkpoints";
  ensureDirectoryExists(outputDir);

  const latestPath = `${outputDir}/latest-best.json`;

  const data = {
    savedAt: new Date().toISOString(),
    metadata,
    best: globalBest,
  };

  fs.writeFileSync(latestPath, JSON.stringify(data, null, 2), "utf-8");
}

function playGameWithWeights(weights, options = {}) {
  const {
    size = 4,
    depth = 2,
    maxSteps = 10000,
    searchMode = "depth",
    beamWidth = 2,
  } = options;

  const env = new Env2048(size);
  let state = env.reset();

  let steps = 0;

  while (!env.isDone() && steps < maxSteps) {
    const action =
      searchMode === "beam"
        ? getWeightedBeamDepthMove(state, weights, depth, beamWidth)
        : getWeightedDepthMove(state, weights, depth);

    if (!action) {
      break;
    }

    const result = env.step(action);

    if (!result.moved) {
      break;
    }

    state = result.state;
    steps++;
  }

  const finalBoard = env.getState();
  const score = env.getScore();
  const maxTile = getMaxTile(finalBoard);

  return {
    score,
    steps,
    maxTile,
    win: maxTile >= 2048,
  };
}

function evaluateWeights(weights, options = {}) {
  const {
    gamesPerCandidate = 5,
    size = 4,
    depth = 2,
    searchMode = "depth",
    beamWidth = 2,
  } = options;

  const results = [];

  for (let i = 0; i < gamesPerCandidate; i++) {
    const result = playGameWithWeights(weights, {
      size,
      depth,
      searchMode,
      beamWidth,
    });

    results.push(result);
  }

  const totalScore = results.reduce((sum, game) => sum + game.score, 0);
  const totalSteps = results.reduce((sum, game) => sum + game.steps, 0);
  const winCount = results.filter((game) => game.win).length;
  const maxTile = Math.max(...results.map((game) => game.maxTile));
  const count2048 = results.filter((game) => game.maxTile >= 2048).length;
  const count4096 = results.filter((game) => game.maxTile >= 4096).length;

  const rate2048 = count2048 / gamesPerCandidate;
  const rate4096 = count4096 / gamesPerCandidate;

  const averageScore = totalScore / gamesPerCandidate;
  const averageSteps = totalSteps / gamesPerCandidate;
  const winRate = winCount / gamesPerCandidate;

  const fitness =
    averageScore +
    rate2048 * 30000 +
    rate4096 * 60000 +
    Math.log2(maxTile) * 1000 +
    averageSteps * 0.6;

  return {
    weights: cloneWeights(weights),
    fitness,
    averageScore,
    averageSteps,
    maxTile,
    winCount,
    winRate,
    results,
  };
}

function createInitialPopulation(
  populationSize,
  baseWeights = DEFAULT_WEIGHTS,
) {
  const population = [];

  population.push(cloneWeights(baseWeights));

  while (population.length < populationSize) {
    const weights = createRandomWeights(baseWeights, 0.35);
    population.push(weights);
  }

  return population;
}

function createNextGeneration(evaluatedPopulation, options = {}) {
  const {
    populationSize = 20,
    eliteCount = 4,
    mutationRate = 0.3,
    mutationStrength = 0.25,
    strongMutationChance = 0.2,
    strongMutationRate = 0.45,
    strongMutationStrength = 0.3,
  } = options;

  const sorted = [...evaluatedPopulation].sort((a, b) => b.fitness - a.fitness);

  const elites = sorted.slice(0, eliteCount);
  const nextPopulation = elites.map((candidate) =>
    cloneWeights(candidate.weights),
  );

  while (nextPopulation.length < populationSize) {
    const parentIndex = Math.floor(Math.random() * elites.length);
    const parent = elites[parentIndex];

    const useStrongMutation = Math.random() < strongMutationChance;

    const child = useStrongMutation
      ? mutateWeights(
          parent.weights,
          strongMutationRate,
          strongMutationStrength,
        )
      : mutateWeights(parent.weights, mutationRate, mutationStrength);

    nextPopulation.push(child);
  }

  return {
    nextPopulation,
    bestCandidate: sorted[0],
    elites,
  };
}

export function trainWeights(options = {}) {
  const {
    generations = 10,
    populationSize = 20,
    eliteCount = 4,
    gamesPerCandidate = 5,
    size = 4,
    depth = 2,
    mutationRate = 0.3,
    mutationStrength = 0.25,
    baseWeights = DEFAULT_WEIGHTS,
    searchMode = "depth",
    beamWidth = 2,
    strongMutationChance = 0.2,
    strongMutationRate = 0.45,
    strongMutationStrength = 0.3,
  } = options;
  let population = createInitialPopulation(populationSize, baseWeights);
  let globalBest = null;
  const handleExit = () => {
    saveTrainingCheckpoint(globalBest, {
      reason: "manual-exit-or-interrupt",
      generations,
      populationSize,
      eliteCount,
      gamesPerCandidate,
      size,
      depth,
      searchMode,
      beamWidth,
      mutationRate,
      mutationStrength,
      strongMutationChance,
      strongMutationRate,
      strongMutationStrength,
    });

    console.log("Checkpoint saved before exit.");
    process.exit();
  };

  process.once("SIGINT", handleExit);
  process.once("SIGTERM", handleExit);

  for (let generation = 1; generation <= generations; generation++) {
    console.log(`Generation ${generation}/${generations}`);

    const evaluatedPopulation = population.map((weights, index) => {
      const evaluated = evaluateWeights(weights, {
        gamesPerCandidate,
        size,
        depth,
        searchMode,
        beamWidth,
      });

      console.log(
        `Candidate ${index + 1}/${populationSize} | fitness=${Math.round(
          evaluated.fitness,
        )} | avgScore=${Math.round(evaluated.averageScore)} | maxTile=${
          evaluated.maxTile
        } | winRate=${(evaluated.winRate * 100).toFixed(1)}%`,
      );

      return evaluated;
    });

    const { nextPopulation, bestCandidate } = createNextGeneration(
      evaluatedPopulation,
      {
        populationSize,
        eliteCount,
        mutationRate,
        mutationStrength,
        strongMutationChance,
        strongMutationRate,
        strongMutationStrength,
      },
    );

    if (!globalBest || bestCandidate.fitness > globalBest.fitness) {
      globalBest = bestCandidate;
      saveTrainingCheckpoint(globalBest, {
        reason: "new-global-best",
        generation,
        generations,
        populationSize,
        eliteCount,
        gamesPerCandidate,
        size,
        depth,
        searchMode,
        beamWidth,
        mutationRate,
        mutationStrength,
        strongMutationChance,
        strongMutationRate,
        strongMutationStrength,
      });
    }

    console.log("Best of generation:");
    console.log({
      generation,
      fitness: Math.round(bestCandidate.fitness),
      averageScore: Math.round(bestCandidate.averageScore),
      averageSteps: Math.round(bestCandidate.averageSteps),
      maxTile: bestCandidate.maxTile,
      winRate: `${(bestCandidate.winRate * 100).toFixed(1)}%`,
      weights: bestCandidate.weights,
      searchMode,
      beamWidth,
    });

    console.log("Global best so far:");
    console.log({
      fitness: Math.round(globalBest.fitness),
      averageScore: Math.round(globalBest.averageScore),
      maxTile: globalBest.maxTile,
      winRate: `${(globalBest.winRate * 100).toFixed(1)}%`,
      weights: globalBest.weights,
    });
    if (generation % 10 === 0) {
      saveTrainingCheckpoint(globalBest, {
        reason: "periodic-save",
        generation,
        generations,
        populationSize,
        eliteCount,
        gamesPerCandidate,
        size,
        depth,
        searchMode,
        beamWidth,
        mutationRate,
        mutationStrength,
        strongMutationChance,
        strongMutationRate,
        strongMutationStrength,
      });

      console.log(`Checkpoint saved at generation ${generation}`);
    }

    population = nextPopulation;
  }

  process.once("SIGINT", handleExit);
  process.once("SIGTERM", handleExit);
  return globalBest;
}
