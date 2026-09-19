# 2048

## Project Layout

```text
index.html, style.css    Game page and styles
js/                     Game, UI, storage and entry point
  ai/
    botRegistry.js      Bot IDs and dispatch
    bots/               Active search implementations
    core/               Simulator, environment, evaluators and RNG
    models/             Active weights
tools/benchmark/        Benchmarks, sweep and reporting
training/ntuple/        Python trainer and local launcher
training/colab/         Notebook and Drive launcher
runs/ntuple/           Local models, logs and checkpoints (gitignored)
experiments/legacy/    Previous bots and evolutionary trainer
docs/history/          Historical notes and original README
```

## Bot Versions

| ID | Registry key | Algorithm |
| --- | --- | --- |
| 00-legacy-beam3 | BOT_00 | Champion weights, depth 3, beam width 2 |
| 01-ntuple-greedy | BOT_01 | N-tuple afterstate value, one move |
| 02-ntuple-beam2 | BOT_02 | N-tuple, depth 2, beam width 2, future weight 0.49 |

01 and 02 share `js/ai/models/ntupleWeights.js` and support 4x4.
Other sizes fall back to 00. Secret mode and M select 02 for 4x4 and 00 otherwise.
F selects 01 for 4x4. The aliases champion, autoStrong and autoFast remain for UI compatibility.
Version numbers identify algorithms, not the strength of every trained checkpoint.

## Run Game

Serve this directory with a static HTTP server and open index.html:

```bash
python3 -m http.server 8000
```

## Benchmark

Run from the repository root:

```bash
node tools/benchmark/testNtupleQuickBenchmark.js
node tools/benchmark/testNtupleBenchmark.js
node tools/benchmark/sweepNtupleBeamParams.js
```

The `--model path/to/model.js` option loads the chosen model in memory only.
It does not overwrite `js/ai/models/ntupleWeights.js` used by the game.

## Training

Recommended new research baseline: **03 - TDL2048+ (C++ CPU, 4x4)**.
See [setup, resume and checkpoint instructions](training/tdl2048/README.md).
Colab notebook: `training/colab/train_tdl2048.ipynb`.
This is first-stage training, not yet the full paper configuration or a game bot.
Existing paper17 weights remain unchanged.

Legacy experimental Snake6 training (not the recommended new run):

```bash
EPISODES=1000 ./training/ntuple/runSnakeLocal.sh
```

Resumes `runs/ntuple/models/ntupleWeights-snake6-td.js` when present.
Existing local-run files were moved to runs/ntuple with their contents preserved.
Snake6 remains experimental, not a validated reproduction of a research paper.
This reorganization does not change its learning algorithm or parameters.

Colab: `training/colab/train_2048_ai.ipynb`.
Upload `training/ntuple/train_ntuple_td.py` and
`training/colab/trainSnakeColab.sh` to the existing Drive scripts folder.
Drive paths and model formats remain unchanged.
