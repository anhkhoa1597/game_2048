# 03 - TDL2048+ training (4x4 only)

Uses upstream https://github.com/moporgic/TDL2048 at commit
`a99f620aec0d30a75943a4c9646743f1f53b0197` (MIT).
No PyTorch or NumPy is required. Python's standard library launches the C++ engine.
Existing game bots and `js/ai/models/ntupleWeights.js` are not modified.

## Scope

This is the **first-stage** 8x6 network, with optimistic initialization
V=320000, TD followed by TC. It is NOT yet the paper's complete two-stage
system, and no 72% reaching rate is promised. Late-stage training and game
integration are intentionally deferred until this baseline is measured.
The binary `.w` files cannot replace the game's current JavaScript weights.

The default global plan is 100 million episodes: alpha 0.1 until 50%, 0.01
until 75%, 0.001 until 90%, then TC with alpha 1.0. These boundaries are
preserved on resume. `--episodes` means additional games THIS invocation,
not thousands and not a new total. Do not change `--plan-episodes` mid-run.
Weights are initialized optimistically only once.

## Local

Run from the project root. GNU GCC, Make, Git and Python 3 are required.
On macOS, `/usr/bin/g++` is usually Apple Clang, not GNU GCC. Install GNU GCC
with `brew install gcc` if needed. The launcher detects versioned g++ binaries;
`CXX=g++-15` can select one explicitly. No packages are installed automatically.

```bash
bash training/tdl2048/runLocal.sh setup
bash training/tdl2048/runLocal.sh train --episodes 1000
bash training/tdl2048/runLocal.sh eval --games 100 --depth 1
bash training/tdl2048/runLocal.sh status
```

Continue the same run (do not reinitialize or copy paper17 weights):

```bash
bash training/tdl2048/runLocal.sh train --episodes 100000 --chunk 10000 --threads 2
```

First 100k episodes use one thread, following upstream's warning about
concurrent updates to freshly initialized tables. Subsequent batches use the
requested thread count. Model RAM is approximately 512 MiB for TD, 1.5 GiB
for TC, plus program/loading overhead. Allow several GiB of spare RAM and
at least 6 GiB free disk space for copies/checkpoints. There is no GPU use.

## Colab

Open `training/colab/train_tdl2048.ipynb` with a **hosted CPU runtime**.
Manually upload only `training/tdl2048/run.py` to Drive:
`MyDrive/MyProjects/2048-ai/scripts/tdl2048/run.py`.
Run the notebook cells in order. Setup compiles upstream on the runtime;
training and evaluation use `/content` temporary files, not Drive for hot IO.
Completed checkpoints/logs live in
`MyDrive/MyProjects/2048-ai/models/03-otd-8x6/`.
The notebook never deletes old paper17/snake models.

After a Colab disconnect, reconnect, run mount/config/setup again, and run
train. It finds the last committed checkpoint automatically. Colab is not a
guaranteed always-on service. A local kernel still computes on your Mac.

## Checkpoints and logs

- Each batch writes a new binary, validates its structure (including TC
  accumulators), then copies it with a SHA-256 checksum and JSON manifest.
- Only the newest two complete checkpoint bundles are retained. This bounds
  model storage; logs keep growing. Failed `.pending-*` copies are ignored
  and may be manually removed when no training is running.
- Stop with Ctrl+C. At most the unfinished batch is lost. Use `--chunk 1000`
  for more frequent saves, with more IO overhead, particularly on Drive.
- Resume retains weights, TC tables, global episode count and schedule.
  RNG uses a distinct seed per batch; this is not bit-for-bit continuous
  execution and multi-thread training is nondeterministic.
- Never train on the same Drive run from two runtimes simultaneously. The
  file lock is reliable locally, but not a cross-machine Drive lock.
- `train.log` contains engine progress (`ops` means moves/s); the console
  reports completed episodes and wall time including checkpoint IO.
- `eval-*.log` contains fresh-game evaluation, score and tile distribution.
  Training winrate is not a substitute for held-out evaluation. Keep a final
  untouched seed set for final comparisons; repeated tuning on the same
  evaluation seed turns that seed into validation data.

Change `--run` to start an independent experiment. Copy an entire checkpoint
folder (model AND state.json) to move between machines. A checksum mismatch
stops resume instead of silently training a fresh model.

## Tests

```bash
python3 -m unittest discover -s training/tdl2048 -p 'test_*.py'
```

Tests exercise orchestration using a small synthetic engine, not AI strength.
For a real lightweight engine smoke test after setup:

```bash
bash training/tdl2048/runLocal.sh train --network 2x4patt --run runs/tdl2048/smoke --plan-episodes 20 --episodes 10 --chunk 5
bash training/tdl2048/runLocal.sh train --network 2x4patt --run runs/tdl2048/smoke --plan-episodes 20 --episodes 10 --chunk 5
bash training/tdl2048/runLocal.sh eval --run runs/tdl2048/smoke --games 2
```

The tiny network is only a plumbing test, not a candidate playing model.
