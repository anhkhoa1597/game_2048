# 2048 N-Tuple Bot

Current production bot:

```txt
ntupleTdBeam2
futureWeight = 0.49
weights = js/ai/models/ntupleWeights.js
```

Quick benchmark:

```bash
node tools/benchmark/testNtupleQuickBenchmark.js
```

Benchmark another downloaded model:

```bash
node tools/benchmark/testNtupleQuickBenchmark.js --model path/to/ntupleWeights.js
```

## New Training Track

The old `paper17`, `early2048`, and `auto-mix` experiments are intentionally retired. To chase stronger 16k/32k play, train a larger snake tuple model instead:

```bash
EPISODES=10000 ./training/ntuple/runSnakeLocal.sh
```

Default local output:

```txt
runs/ntuple/models/ntupleWeights-snake6-td.js
```

Long runs should use Colab with:

```txt
training/colab/trainSnakeColab.sh
```

Upload the current trainer to Drive:

```txt
training/ntuple/train_ntuple_td.py -> MyProjects/2048-ai/scripts/train_ntuple_td.py
training/colab/trainSnakeColab.sh -> MyProjects/2048-ai/scripts/trainSnakeColab.sh
```
