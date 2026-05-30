import { trainWeights } from "./evolutionTrainer.js";
import { CHAMPION_WEIGHTS } from "./trainedWeights.js";

//v3
const best = trainWeights({
  generations: 25,
  populationSize: 24,
  eliteCount: 6,
  gamesPerCandidate: 30,

  size: 4,
  depth: 2,

  mutationRate: 0.18,
  mutationStrength: 0.08,

  baseWeights: CHAMPION_WEIGHTS,
});

// v2.2
// const best = trainWeights({
//   generations: 20,
//   populationSize: 20,
//   eliteCount: 5,
//   gamesPerCandidate: 30,
//   size: 4,
//   depth: 2,
//   mutationRate: 0.2,
//   mutationStrength: 0.1,

//   baseWeights: TRAINED_WEIGHTS_V1,
// });

//v2.1 failed
// const best = trainWeights({
//   generations: 20,
//   populationSize: 20,
//   eliteCount: 5,
//   gamesPerCandidate: 20,
//   size: 4,
//   depth: 2,
//   mutationRate: 0.25,
//   mutationStrength: 0.15,
//   baseWeights: TRAINED_WEIGHTS_V1,
// });

//v1
// const best = trainWeights({
//   generations: 20,
//   populationSize: 20,
//   eliteCount: 5,
//   gamesPerCandidate: 20,
//   size: 4,
//   depth: 2,
//   mutationRate: 0.3,
//   mutationStrength: 0.25,
//   baseWeights: TRAINED_WEIGHTS_V1,
// });

console.log("Training V3a finished.");
console.log("Best candidate:");
console.log(best);

console.log("Best weights JSON:");
console.log(JSON.stringify(best.weights, null, 2));
