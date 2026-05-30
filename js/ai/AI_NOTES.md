# AI Notes – 2048 AI Project

## 1. Current AI Status

The project currently has a working 2048 game with multiple AI approaches:

- Simple/random bot
- Smart greedy bot
- Depth search bot
- Expectimax bot
- Weighted depth bot
- Evolutionary-trained weighted depth bot

The current main bot is:

```txt
Champion Bot = Weighted Depth Bot + CHAMPION_WEIGHTS
```

This bot is used for real-time autoplay because it performs competitively with expectimax while being much faster.

---

## 2. Bot Types

### 2.1 Simple Bot

Chooses a random valid move.

Purpose:

```txt
Baseline only.
```

It is useful for comparison but not suitable as a serious AI.

---

### 2.2 Smart / Greedy Bot

Tests each valid move once and chooses the move with the best board evaluation.

Logic:

```txt
for each valid move:
  simulate move
  evaluate resulting board
choose best score
```

Limitation:

```txt
Only looks one move ahead.
```

---

### 2.3 Depth Bot

Searches multiple future moves, but does not model random tile spawning.

Logic:

```txt
for each valid move:
  simulate move
  evaluate current board
  recursively evaluate future moves up to depth
choose best score
```

Formula:

```txt
score = currentScore + futureScore * FUTURE_WEIGHT
```

Current design:

```txt
Pure depth search.
No hard-coded corner lock.
Corner strategy is handled by evaluator features.
```

---

### 2.4 Expectimax Bot

Models both AI moves and random tile spawning.

Logic:

```txt
AI node: choose the best move
Chance node: average over possible random tile outcomes
```

Strength:

```txt
More theoretically accurate for 2048.
```

Weakness:

```txt
Much slower than weighted depth bot.
```

Use case:

```txt
Research / benchmark reference.
Not the default autoplay bot.
```

---

### 2.5 Weighted Depth Bot

Similar to Depth Bot, but uses a weight-based evaluator.

Instead of using fixed handcrafted weights inside `evaluateBoard()`, it uses:

```js
evaluateBoardWithWeights(board, scoreGained, weights)
```

Current trained variants:

```txt
trainedV1 = weightedDepthBot + TRAINED_WEIGHTS_V1
trainedV2 = weightedDepthBot + TRAINED_WEIGHTS_V2
champion = weightedDepthBot + CHAMPION_WEIGHTS
```

---

## 3. Evaluator Features

The evaluator scores a board using these features:

```txt
emptyCells
scoreGained
maxTile
maxTilePower
cornerGradient
smoothness
monotonicity
mergePotential
snakeScore
maxTileInCorner
maxTileNotInCorner
```

### Meaning of key features

```txt
emptyCells:
  More empty cells means more survival space.

scoreGained:
  Rewards immediate merges.

maxTile:
  Rewards larger tiles.

cornerGradient:
  Rewards boards where high tiles stay near a corner.

smoothness:
  Rewards similar neighboring tile powers.

monotonicity:
  Rewards rows/columns that follow a consistent increasing/decreasing pattern.

mergePotential:
  Rewards adjacent equal tiles that can merge soon.

snakeScore:
  Rewards snake-like tile ordering.

maxTileInCorner:
  Rewards keeping the largest tile in a corner.

maxTileNotInCorner:
  Penalizes the largest tile leaving the corner.
```

---

## 4. Evolutionary Training

The project uses an evolutionary algorithm to optimize evaluator weights.

It is machine learning, but not deep learning.

It does not use:

```txt
neural networks
DQN
PyTorch
TensorFlow
```

It uses:

```txt
population
fitness
selection
elite survival
mutation
self-play
```

Training loop:

```txt
1. Create many candidate weight sets.
2. Each candidate plays several simulated games.
3. Evaluate each candidate using fitness.
4. Keep the best candidates.
5. Mutate the best candidates to create the next generation.
6. Repeat for multiple generations.
```

---

## 5. Important Training Parameters

Example config:

```js
const best = trainWeights({
  generations: 25,
  populationSize: 24,
  eliteCount: 5,
  gamesPerCandidate: 30,

  size: 4,
  depth: 2,

  mutationRate: 0.18,
  mutationStrength: 0.08,

  baseWeights: CHAMPION_WEIGHTS,
});
```

### Parameter meanings

```txt
generations:
  Number of evolutionary rounds.

populationSize:
  Number of candidate weight sets per generation.

eliteCount:
  Number of top candidates preserved into the next generation.

gamesPerCandidate:
  Number of games used to evaluate each candidate.

size:
  Board size used during training.

depth:
  Search depth used by weightedDepthBot.

mutationRate:
  Probability that each weight will be mutated.

mutationStrength:
  How strongly a mutated weight can change.

baseWeights:
  Starting weight set for the population.
```

---

## 6. Champion Selection Rule

New trained weights should not automatically replace the current champion.

The correct workflow is:

```txt
Current champion -> train challenger -> benchmark champion vs challenger
```

Promote challenger only if it wins a large benchmark.

Priority order:

```txt
1. winRate
2. averageScore
3. tile distribution
4. number of 2048 / 4096 games
5. low-tile failures
6. averageMoveMs
```

Rule:

```txt
If challenger wins clearly, promote it.
If challenger loses or is only equal, keep current champion.
```

---

## 7. Benchmarking

Main benchmark metrics:

```txt
averageScore
maxScore
averageSteps
maxTile
winCount
winRate
totalTimeMs
averageTimeMs
averageMoveMs
tileDistribution
```

Recommended benchmark types:

```txt
Fast benchmark:
  weightedDefault vs trainedV1 vs champion
  games: 1000–2000

Expectimax comparison:
  champion vs expectimax
  games: 100–200 because expectimax is slow
```

---

## 8. Current Conclusion

The evolutionary-trained weighted depth bot is the current best practical AI.

Reason:

```txt
It reaches strong win rates.
It performs competitively with expectimax.
It is much faster than expectimax.
It is suitable for real-time autoplay.
```

Current role of bots:

```txt
Champion:
  Main autoplay bot.

Expectimax:
  Research and benchmark reference.

WeightedDefault:
  Baseline for showing training improvement.

DepthBot:
  Search baseline.

Random/Smart:
  Educational baseline.
```

---

## 9. Future Roadmap

### Phase 1: Finish JS AI system

```txt
Clean AI modules.
Keep benchmark and training scripts.
Store champion weights.
Write final README/report.
```

### Phase 2: Improve research quality

```txt
Add seeded random generator.
Save training results to JSON.
Track generation history.
Plot fitness over generations.
Run multiple benchmark seeds.
```

### Phase 3: Move toward Deep Reinforcement Learning

```txt
Port Env2048 to Python.
Implement Python baseline bots.
Build a Gym-like environment.
Train DQN using PyTorch.
Compare DQN against champion weighted-depth bot.
```

---

## 10. Important Naming

Use these terms carefully:

```txt
Correct:
  Evolutionary-trained heuristic AI
  Genetic/evolutionary optimized weighted depth-search bot
  Weighted depth-search bot
  Self-play weight optimization

Not correct yet:
  Deep learning bot
  DQN bot
  Neural network bot
```

The current AI learns evaluator weights through evolutionary search, not through neural networks.
