import { trainWeights } from "./evolutionTrainer.js";
import { CHAMPION_WEIGHTS } from "./trainedWeights.js";

const best = trainWeights({
  generations: 60,
  populationSize: 18,
  eliteCount: 5,
  gamesPerCandidate: 20,

  size: 4,
  depth: 3,
  searchMode: "beam",
  beamWidth: 2,

  mutationRate: 0.18,
  mutationStrength: 0.1,

  strongMutationChance: 0.25,
  strongMutationRate: 0.45,
  strongMutationStrength: 0.28,

  baseWeights: CHAMPION_WEIGHTS,
});

console.log("Training beam2 finished.");
console.log("Best candidate:");
console.log(best);

console.log("Best weights JSON:");
console.log(JSON.stringify(best.weights, null, 2));
