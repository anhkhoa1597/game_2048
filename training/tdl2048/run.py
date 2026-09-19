#!/usr/bin/env python3
"""Pinned upstream trainer; Python only manages processes and checkpoints."""
import argparse
import fcntl
import hashlib
import json
import math
import os
from pathlib import Path
import shutil
import struct
import subprocess
import sys
import tempfile
import time
import uuid

REVISION = "a99f620aec0d30a75943a4c9646743f1f53b0197"
REPOSITORY = "https://github.com/moporgic/TDL2048.git"
NETWORKS = {"8x6patt": (8, 6), "4x6patt": (4, 6), "2x4patt": (2, 4)}


def digest(path):
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(4 * 1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def validate_weights(path, network, tc):
    """Validate the pinned engine's binary layout, including TC accumulators."""
    tables, cells = NETWORKS[network]
    size = path.stat().st_size
    with path.open("rb") as stream:
        def read(fmt):
            return struct.unpack("<" + fmt, stream.read(struct.calcsize("<" + fmt)))[0]
        if read("B") != 0 or read("I") != tables:
            raise ValueError("Invalid weight header/table count")
        for _ in range(tables):
            if read("B") != 4:
                raise ValueError("Unsupported weight serialization")
            stream.read(8)  # upstream table signature
            if read("H") != 4 or read("Q") != 16 ** cells:
                raise ValueError("Invalid weight table shape")
            stream.seek(4 * 16 ** cells, 1)
            if tc:
                if read("H") != 4 or read("Q") != 2 * 16 ** cells:
                    raise ValueError("Missing TC accumulators; cannot safely resume")
                stream.seek(8 * 16 ** cells, 1)
            if read("H") != 0:
                raise ValueError("Invalid weight trailer")
        if stream.tell() != size:
            raise ValueError("Truncated or unexpected weight data")


def phase(done, total):
    for fraction, alpha, method in [(0.5, 0.1, "fixed"), (0.75, 0.01, "fixed"),
                                     (0.9, 0.001, "fixed"), (1, 1.0, "coherence")]:
        end = int(total * fraction)
        if done < end:
            return end, alpha, method
    raise ValueError("Training plan already complete")


def setup(work):
    compiler = os.environ.get("CXX")
    candidates = [compiler] if compiler else [f"g++-{v}" for v in range(16, 10, -1)] + ["g++"]
    compiler = next((c for c in candidates if shutil.which(c) and
                     "clang" not in subprocess.check_output([c, "--version"], text=True).lower()), None)
    if not compiler:
        raise RuntimeError("GNU GCC required (Apple Clang is unsupported). On Mac: brew install gcc; then rerun setup.")
    source = work / "upstream"
    if not source.exists():
        subprocess.run(["git", "clone", REPOSITORY, str(source)], check=True)
        subprocess.run(["git", "-C", str(source), "checkout", "--detach", REVISION], check=True)
    head = subprocess.check_output(["git", "-C", str(source), "rev-parse", "HEAD"], text=True).strip()
    dirty = subprocess.check_output(["git", "-C", str(source), "diff", "HEAD", "--"], text=True)
    if head != REVISION or dirty:
        raise RuntimeError("Upstream checkout differs from pinned revision; use a new --work directory")
    subprocess.run(["make", f"CXX={compiler}"], cwd=source, check=True)
    print(f"Built {source / '2048'}", flush=True)


def execute(command, log):
    print("Command:", " ".join(map(str, command)), flush=True)
    with log.open("a", buffering=1) as output:
        output.write("\nCommand: " + " ".join(map(str, command)) + "\n")
        process = subprocess.Popen(list(map(str, command)), stdout=subprocess.PIPE,
                                   stderr=subprocess.STDOUT, text=True, bufsize=1)
        try:
            for line in process.stdout:
                print(line, end="", flush=True)
                output.write(line)
            if process.wait():
                raise RuntimeError(f"Engine failed; see {log}")
        finally:
            if process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()


def latest(run):
    for folder in sorted(run.glob("checkpoint-*"), reverse=True):
        manifest = folder / "state.json"
        if not manifest.exists():
            continue
        state = json.loads(manifest.read_text())
        model = folder / "model.w"
        if state["revision"] != REVISION or digest(model) != state["sha256"]:
            raise ValueError(f"Checkpoint verification failed: {folder}. Keep files and investigate before resuming.")
        validate_weights(model, state["network"], state["method"] == "coherence")
        return state, model
    return None, None


def publish(run, model, state):
    # Never overwrite the last complete checkpoint. A manifest commits this bundle.
    pending = run / (".pending-" + uuid.uuid4().hex)
    pending.mkdir()
    shutil.copyfile(model, pending / "model.w")
    with (pending / "model.w").open("rb") as stream:
        os.fsync(stream.fileno())
    state = dict(state, sha256=digest(model))
    if digest(pending / "model.w") != state["sha256"]:
        raise IOError("Checkpoint copy checksum mismatch")
    with (pending / "state.json").open("w") as stream:
        json.dump(state, stream, indent=2)
        stream.flush()
        os.fsync(stream.fileno())
    destination = run / f"checkpoint-{state['completed']:012d}"
    pending.rename(destination)
    # Only our complete, older bundles are pruned; retain current and previous.
    complete = sorted(p for p in run.glob("checkpoint-*") if (p / "state.json").exists())
    for old in complete[:-2]:
        shutil.rmtree(old)
    return state, destination / "model.w"


def train(args, engine, run):
    state, source = latest(run)
    config = {"revision": REVISION, "network": args.network,
              "plan_episodes": args.plan_episodes, "seed": args.seed}
    if state and any(state[k] != value for k, value in config.items()):
        raise ValueError("Network/plan/seed differs from checkpoint. Reuse original options or choose another --run.")
    done = state["completed"] if state else 0
    stop = min(done + args.episodes, args.plan_episodes)
    print(f"Resume={bool(state)} completed={done} requested_stop={stop}; checkpoints: {run}", flush=True)
    while done < stop:
        boundary, alpha, method = phase(done, args.plan_episodes)
        count = min(args.chunk, stop - done, boundary - done)
        # Start single-threaded, as recommended upstream for fresh optimistic tables.
        threads = 1 if done < 100000 else args.threads
        unit = math.gcd(count, 1000)
        while count // unit < threads and unit > 1:
            unit = math.gcd(count, unit - 1)
        threads = min(threads, count // unit)
        with tempfile.TemporaryDirectory(prefix="batch-", dir=args.work) as temporary:
            temporary = Path(temporary)
            model = temporary / "model.w"
            network = args.network if source else args.network + "=320000/norm"
            command = [engine, "-n", network, "-a", str(alpha), method,
                       "-t", f"{count // unit}x{unit}", "-p", str(threads), "noshm",
                       "-s", f"{args.seed}:train:{done}", "-w", "2048", "-%", "-o", model]
            if source:
                local_input = temporary / "input.w"
                shutil.copyfile(source, local_input)
                command += ["-i", local_input]
            print(f"TRAIN {done} -> {done + count}/{args.plan_episodes} alpha={alpha} {method} threads={threads}", flush=True)
            start = time.monotonic()
            execute(command, run / "train.log")
            validate_weights(model, args.network, method == "coherence")
            state, source = publish(run, model, dict(config, completed=done + count, method=method))
            done += count
            seconds = time.monotonic() - start
            print(f"CHECKPOINT completed={done} seconds={seconds:.1f} episodes/hour={count * 3600 / seconds:.1f} path={source}", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["setup", "train", "eval", "status"])
    parser.add_argument("--work", type=Path, default=Path("runs/tdl2048/build"))
    parser.add_argument("--run", type=Path, default=Path("runs/tdl2048/03-otd-8x6"))
    parser.add_argument("--network", choices=NETWORKS, default="8x6patt")
    parser.add_argument("--plan-episodes", type=int, default=100000000)
    parser.add_argument("--episodes", type=int, default=1000, help="Additional episodes this invocation")
    parser.add_argument("--chunk", type=int, default=10000, help="Save after at most this many episodes")
    parser.add_argument("--threads", type=int, default=2)
    parser.add_argument("--seed", default="tdl2048-v1")
    parser.add_argument("--games", type=int, default=100)
    parser.add_argument("--depth", type=int, choices=range(1, 7), default=1)
    args = parser.parse_args()
    if min(args.episodes, args.chunk, args.threads, args.games) < 1 or args.plan_episodes < 10:
        parser.error("Counts must be positive; plan must have at least 10 episodes")
    args.work = args.work.resolve()
    run = args.run.resolve()
    args.work.mkdir(parents=True, exist_ok=True)
    if args.command == "setup":
        setup(args.work)
        return
    run.mkdir(parents=True, exist_ok=True)
    # Advisory lock protects local invocations; do not share one run across runtimes.
    with (run / ".lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        if args.command == "status":
            state, model = latest(run)
            print(json.dumps(state, indent=2), "\nModel:", model)
            return
        engine = args.work / "upstream" / "2048"
        if not engine.is_file():
            raise RuntimeError("Engine missing. Run setup first.")
        if args.command == "train":
            train(args, engine, run)
        else:
            state, model = latest(run)
            if not state:
                raise RuntimeError("No complete checkpoint to evaluate")
            with tempfile.TemporaryDirectory(prefix="eval-", dir=args.work) as temp:
                local = Path(temp) / "model.w"
                shutil.copyfile(model, local)
                execute([engine, "-n", state["network"], "-i", local,
                         "-a", "0", "fixed", "-e", f"{args.games}x1",
                         "-d", f"{args.depth}p", "-h", "32768", "-p", "1",
                         "-s", args.seed + ":heldout", "-w", "2048"],
                        run / f"eval-{state['completed']}-{args.depth}ply.log")


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, ValueError, OSError, struct.error, subprocess.CalledProcessError) as error:
        sys.exit(str(error))
    except KeyboardInterrupt:
        sys.exit("Stopped. Last complete checkpoint retained; unfinished batch is not committed.")
