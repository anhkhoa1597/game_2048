# 2048 AI Web Game

A web-based 2048 game built with HTML, CSS, and JavaScript, extended with multiple AI bots, board simulation, benchmarking tools, and an evolutionary-trained heuristic AI.

This project started as a playable 2048 game, then gradually evolved into an AI learning playground. The main goal is not only to build the game, but also to study how different AI strategies perform in 2048.

---

## Features

### Game Features

- Classic 2048 gameplay
- Smooth tile movement animation
- Merge animation and new tile animation
- Score and best score tracking
- LocalStorage support
- Multiple board sizes: 4x4, 5x5, 6x6, 8x8
- Multiple themes: classic, green, dark
- Responsive board layout
- Menu system
- Power features:
  - Undo
  - Swap
  - Teleport
- Auto play mode using AI bot

### AI Features

The project includes several AI approaches:

- Simple random bot
- Greedy smart bot
- Lookahead bot
- Depth search bot
- Expectimax bot
- Weighted depth bot
- Evolutionary-trained bot
- Benchmark system for comparing bots
- UI-free 2048 environment for training and testing

---

## Project Structure

```txt
js/
├── game.js
├── ui.js
├── storage.js
├── main.js
└── ai/
    ├── boardSimulator.js
    ├── env2048.js
    ├── evaluator.js
    ├── weightedEvaluator.js
    ├── simpleBot.js
    ├── smartBot.js
    ├── lookaheadBot.js
    ├── depthBot.js
    ├── weightedDepthBot.js
    ├── expectimaxBot.js
    ├── botRegistry.js
    ├── trainedWeights.js
    ├── benchmarkBot.js
    ├── benchmarkBots.js
    ├── evolutionTrainer.js
    ├── testEnv.js
    └── testTrainer.js
```

---

## Core AI Architecture

### 1. Board Simulator

`boardSimulator.js` contains the pure logic for simulating 2048 moves without touching the DOM.

Main responsibilities:

- Clone board state
- Simulate moves in four directions
- Check valid moves
- Find empty cells
- Generate random tile outcomes for expectimax

This file allows AI bots to evaluate future states without affecting the real game board.

---

### 2. Environment

`env2048.js` provides a UI-free game environment.

It exposes methods such as:

```js
reset()
step(action)
getState()
getScore()
isDone()
getValidActions()
```

This environment is used for:

- Benchmarking bots
- Running automated games
- Evolutionary training
- Future reinforcement learning experiments

---

## AI Bots

### Simple Bot

The simplest baseline bot. It randomly selects one valid move.

Purpose:

- Baseline comparison
- Confirm that smarter bots perform better than random movement

---

### Smart Bot

A greedy bot that evaluates all valid moves and picks the move with the best immediate board score.

It only looks one move ahead.

---

### Depth Bot

A search-based bot that looks ahead multiple moves.

It evaluates possible move sequences using:

```txt
score = currentScore + futureScore * FUTURE_WEIGHT
```

This bot does not model random tile spawning. It simply searches through possible AI moves.

---

### Expectimax Bot

An AI bot that models the random tile spawning mechanism in 2048.

It uses:

```txt
Max node    = AI chooses the best move
Chance node = random tile 2 or 4 appears
```

Expectimax is theoretically more accurate than simple depth search because 2048 includes randomness after every valid move.

However, expectimax is computationally much heavier.

---

### Weighted Depth Bot

The weighted depth bot uses the same depth-search logic as the normal depth bot, but it evaluates boards with a configurable set of weights.

Instead of hard-coding evaluator weights, it uses:

```js
evaluateBoardWithWeights(board, scoreGained, weights)
```

This makes it possible to train and improve the bot by optimizing the evaluator weights.

---

## Board Evaluation

The evaluator scores a board using multiple features:

- Empty cells
- Score gained from the move
- Maximum tile
- Maximum tile in corner
- Smoothness
- Monotonicity
- Merge potential
- Corner gradient
- Snake pattern score

The original evaluator used manually selected weights.

Later, these weights were optimized using an evolutionary training process.

---

## Evolutionary Training

The project uses an evolutionary algorithm to optimize the evaluator weights.

The training process:

```txt
1. Create a population of candidate weight sets
2. Let each candidate play multiple simulated games
3. Score each candidate using a fitness function
4. Keep the best candidates as elites
5. Generate new candidates by mutating elite weights
6. Repeat for multiple generations
```

This allows the bot to improve through self-play without using neural networks.

This is not Deep Learning or DQN. It is an evolutionary-trained heuristic AI.

---

## Benchmark Results

### 4x4 Benchmark: Default vs Trained Bots

Each bot was tested for 1000 games on a 4x4 board.

| Bot | Games | Average Score | Max Score | Average Steps | Max Tile | Win Rate | Average Move Time |
|---|---:|---:|---:|---:|---:|---:|---:|
| weightedDefault | 1000 | 10,728 | 31,868 | 674 | 2048 | 3.70% | 0.142 ms |
| trainedV1 | 1000 | 20,317 | 66,220 | 1,107 | 4096 | 40.90% | 0.134 ms |
| champion | 1000 | 21,097 | 71,560 | 1,145 | 4096 | 43.30% | 0.133 ms |

### 4x4 Tile Distribution

#### weightedDefault

| Max Tile | Games |
|---:|---:|
| 64 | 3 |
| 128 | 29 |
| 256 | 99 |
| 512 | 369 |
| 1024 | 463 |
| 2048 | 37 |

#### trainedV1

| Max Tile | Games |
|---:|---:|
| 128 | 9 |
| 256 | 43 |
| 512 | 126 |
| 1024 | 413 |
| 2048 | 378 |
| 4096 | 31 |

#### champion

| Max Tile | Games |
|---:|---:|
| 128 | 3 |
| 256 | 19 |
| 512 | 125 |
| 1024 | 420 |
| 2048 | 404 |
| 4096 | 29 |

### 4x4 Result Summary

The champion bot significantly improves over the manually weighted baseline.

```txt
weightedDefault win rate: 3.70%
champion win rate:        43.30%
```

The champion bot also reaches 4096 in some games, while the default weighted bot only reaches up to 2048.

---

## 5x5 Benchmark

Each bot was tested for 1000 games on a 5x5 board.

| Bot | Games | Average Score | Max Score | Average Steps | Max Tile | Win Rate | Average Move Time |
|---|---:|---:|---:|---:|---:|---:|---:|
| weightedDefault | 1000 | 114,231 | 537,240 | 5,017 | 32768 | 87.50% | 0.188 ms |
| trainedV1 | 1000 | 272,398 | 1,133,392 | 10,676 | 65536 | 99.60% | 0.187 ms |
| champion | 1000 | 262,005 | 709,220 | 10,331 | 32768 | 99.20% | 0.189 ms |

### 5x5 Result Summary

On 5x5 boards, both trained bots perform extremely well. The trainedV1 bot achieved the highest average score and reached a 65536 tile once.

The champion bot remains highly stable, with a 99.20% win rate.

---

## Expectimax Comparison

A separate 100-game benchmark was run to compare the trained bots with expectimax on a 4x4 board.

| Bot | Games | Average Score | Max Score | Average Steps | Max Tile | Win Rate | Average Move Time |
|---|---:|---:|---:|---:|---:|---:|---:|
| expectimax | 100 | 21,596 | 57,312 | 1,188 | 4096 | 41.00% | 7.157 ms |
| trainedV1 | 100 | 20,995 | 56,004 | 1,133 | 4096 | 45.00% | 0.138 ms |
| champion | 100 | 19,646 | 36,616 | 1,081 | 2048 | 42.00% | 0.137 ms |

### Expectimax Comparison Summary

Expectimax is strong but much slower.

The trained weighted-depth bots perform competitively with expectimax while being dramatically faster.

Approximate speed comparison:

```txt
expectimax average move time: 7.157 ms
trainedV1 average move time:  0.138 ms
champion average move time:   0.137 ms
```

This means the trained bots are over 50 times faster per move than expectimax in this benchmark.

---

## Final AI Conclusion

The final champion bot is an evolutionary-trained weighted depth-search bot.

It uses:

```txt
Depth search + learned evaluator weights
```

It does not use a neural network, deep learning, or DQN.

The evolutionary training process successfully improved the evaluator weights. On the 4x4 board, the champion bot increased win rate from 3.70% with default weights to 43.30% after training.

Compared to expectimax, the trained bot achieves competitive performance while running much faster, making it more suitable for real-time autoplay in the browser.

---

## Current Best Bot

The current practical bot for autoplay is:

```txt
Champion Weighted Depth Bot
```

Reason:

- Strong 4x4 win rate
- Very fast move calculation
- Suitable for real-time browser gameplay
- Trained through self-play using evolutionary optimization

---

## Future Improvements

Possible next steps:

1. Add seeded random generator for fairer benchmark comparisons
2. Save training results automatically as JSON
3. Track training history per generation
4. Visualize training progress with charts
5. Improve fitness function for better 2048/4096 consistency
6. Port Env2048 to Python
7. Implement Deep Q-Learning / DQN with PyTorch
8. Compare DQN against the champion evolutionary bot

---

## Learning Roadmap Reflected in This Project

This project demonstrates a gradual AI learning path:

```txt
Rule-based bot
→ Greedy heuristic bot
→ Depth search bot
→ Expectimax bot
→ Weighted evaluator bot
→ Evolutionary-trained bot
→ Future: Deep Reinforcement Learning
```

This makes the project useful not only as a game, but also as a practical AI learning playground.
