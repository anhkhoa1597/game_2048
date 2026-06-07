# 2048 N-Tuple Bot

Current production bot:

```txt
ntupleTdBeam2
futureWeight = 0.49
weights = js/ai/ntuple/ntupleWeights.js
```

Quick benchmark:

```bash
node js/ai/ntuple/testNtupleQuickBenchmark.js
```

Benchmark another downloaded model:

```bash
node js/ai/ntuple/testNtupleQuickBenchmark.js --model path/to/ntupleWeights.js
```

## New Training Track

The old `paper17`, `early2048`, and `auto-mix` experiments are intentionally retired. To chase stronger 16k/32k play, train a larger snake tuple model instead:

```bash
EPISODES=10000 ./js/ai/ntuple/runSnakeLocal.sh
```

Default local output:

```txt
js/ai/ntuple/local-run/models/ntupleWeights-snake6-td.js
```

Long runs should use Colab with:

```txt
js/ai/colab/trainSnakeColab.sh
```

Upload the current trainer to Drive:

```txt
js/ai/ntuple/train_ntuple_td.py -> MyProjects/2048-ai/scripts/train_ntuple_td.py
js/ai/colab/trainSnakeColab.sh -> MyProjects/2048-ai/scripts/trainSnakeColab.sh
```
