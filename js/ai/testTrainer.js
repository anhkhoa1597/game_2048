import { trainWeights } from "./evolutionTrainer.js";
import { TRAINED_WEIGHTS_V2 } from "./trainedWeights.js";

const best = trainWeights({
  generations: 20,
  populationSize: 20,
  eliteCount: 5,
  gamesPerCandidate: 20,

  size: 4,
  depth: 2,

  mutationRate: 0.22,
  mutationStrength: 0.12,

  baseWeights: TRAINED_WEIGHTS_V2,
});

console.log("Training V2 finished.");
console.log("Best candidate:");
console.log(best);

console.log("Best weights JSON:");
console.log(JSON.stringify(best.weights, null, 2));
