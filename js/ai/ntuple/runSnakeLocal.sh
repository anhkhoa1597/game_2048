#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../../.."

ROOT="js/ai/ntuple/local-run"
LOGS="$ROOT/logs"
MODELS="$ROOT/models"
OUTPUTS="$ROOT/outputs"

PATTERN_SET="${PATTERN_SET:-snake6}"
RUN_NAME="${RUN_NAME:-${PATTERN_SET}-td}"
OUTPUT_MODEL="$MODELS/ntupleWeights-${RUN_NAME}.js"
LOG_FILE="$LOGS/ntuple_${RUN_NAME}.log"
CHECKPOINT_DIR="$OUTPUTS/checkpoints-${RUN_NAME}"

EPISODES="${EPISODES:-100000}"
ALPHA_START="${ALPHA_START:-0.0003}"
ALPHA_END="${ALPHA_END:-0.00005}"
EPSILON_START="${EPSILON_START:-0.05}"
EPSILON_END="${EPSILON_END:-0.005}"
LOG_EVERY="${LOG_EVERY:-1000}"
SAVE_EVERY="${SAVE_EVERY:-1000}"
PRUNE_BELOW="${PRUNE_BELOW:-0.0001}"
PRETRAIN_EPISODES="${PRETRAIN_EPISODES:-0}"
MC_PRETRAIN_EPISODES="${MC_PRETRAIN_EPISODES:-0}"

mkdir -p "$LOGS" "$MODELS" "$CHECKPOINT_DIR"

ARGS=()

if [[ -f "$OUTPUT_MODEL" ]]; then
  ARGS+=(--input-model "$OUTPUT_MODEL")
  echo "Resuming from $OUTPUT_MODEL"
else
  echo "Starting new $PATTERN_SET model"
fi

echo "Output model: $OUTPUT_MODEL"
echo "Run name: $RUN_NAME"
echo "Pattern set: $PATTERN_SET"
echo "Episodes this run: $EPISODES"
echo "Alpha: $ALPHA_START -> $ALPHA_END"
echo "Epsilon: $EPSILON_START -> $EPSILON_END"

python3 -u js/ai/ntuple/train_ntuple_td.py \
  "${ARGS[@]}" \
  --pattern-set "$PATTERN_SET" \
  --episodes "$EPISODES" \
  --alpha-start "$ALPHA_START" \
  --alpha-end "$ALPHA_END" \
  --epsilon-start "$EPSILON_START" \
  --epsilon-end "$EPSILON_END" \
  --pretrain-episodes "$PRETRAIN_EPISODES" \
  --mc-pretrain-episodes "$MC_PRETRAIN_EPISODES" \
  --log-every "$LOG_EVERY" \
  --save-every "$SAVE_EVERY" \
  --checkpoint-dir "$CHECKPOINT_DIR" \
  --prune-below "$PRUNE_BELOW" \
  --output "$OUTPUT_MODEL" \
  2>&1 | tee -a "$LOG_FILE"
