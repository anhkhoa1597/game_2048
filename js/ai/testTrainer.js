import { trainWeights } from "./evolutionTrainer.js";
import { CHAMPION_WEIGHTS } from "./trainedWeights.js";

const best = trainWeights({
  generations: 80,
  populationSize: 24,
  eliteCount: 6,
  gamesPerCandidate: 30,

  size: 4,
  depth: 3,
  searchMode: "beam",
  beamWidth: 2,

  mutationRate: 0.1,
  mutationStrength: 0.05,

  strongMutationChance: 0.12,
  strongMutationRate: 0.25,
  strongMutationStrength: 0.12,

  baseWeights: CHAMPION_WEIGHTS,
});

console.log("Training beam3-V2 finished.");
console.log("Best candidate:");
console.log(best);

console.log("Best weights JSON:");
console.log(JSON.stringify(best.weights, null, 2));
