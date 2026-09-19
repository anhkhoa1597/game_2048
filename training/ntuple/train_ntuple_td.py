#!/usr/bin/env python3
import argparse
import json
import math
import random
import time
from collections import defaultdict
from pathlib import Path


DIRECTIONS = ("up", "down", "left", "right")
BOARD_SIZE = 4
BOARD_CELLS = BOARD_SIZE * BOARD_SIZE
TILE_BUCKETS = 15
MAX_TILE_POWER = TILE_BUCKETS - 1
FUTURE_WEIGHT = 0.75
CHAMPION_WEIGHTS = {
    "emptyCells": 47.795637908719065,
    "scoreGained": 5.961067969203998,
    "maxTile": 0.13673886177088343,
    "maxTilePower": 0,
    "cornerGradient": 330.89236389589286,
    "smoothness": 10.099467807797696,
    "monotonicity": 2.364159537144779,
    "mergePotential": 62.78044443898324,
    "snakeScore": 1.3772789867359745,
    "maxTileInCorner": 13.819086388648634,
    "maxTileNotInCorner": -4.562083335061389,
}


def load_seed_pool(seed_file):
    if not seed_file:
        return []

    path = Path(seed_file)

    if not path.exists():
        return []

    seeds = []

    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()

        if not line:
            continue

        try:
            data = json.loads(line)
            seed = data.get("seed")
        except json.JSONDecodeError:
            seed = line

        try:
            seeds.append(int(seed))
        except (TypeError, ValueError):
            continue

    return seeds


def append_failed_seed(seed_file, record):
    if not seed_file:
        return

    path = Path(seed_file)
    path.parent.mkdir(parents=True, exist_ok=True)

    with path.open("a", encoding="utf-8") as file:
        file.write(json.dumps(record, separators=(",", ":")) + "\n")


def is_valid_board(board):
    return (
        isinstance(board, list)
        and len(board) == BOARD_SIZE
        and all(isinstance(row, list) and len(row) == BOARD_SIZE for row in board)
    )


def parse_int_list(raw):
    if not raw:
        return []

    return [
        int(value.strip())
        for value in raw.split(",")
        if value.strip().isdigit()
    ]


def load_state_pool(state_file):
    if not state_file:
        return []

    path = Path(state_file)

    if not path.exists():
        return []

    states = []

    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()

        if not line:
            continue

        try:
            data = json.loads(line)
        except json.JSONDecodeError:
            continue

        board = data.get("board")

        if is_valid_board(board):
            states.append(data)

    return states


def append_state_snapshot(prefix, tile, record):
    if not prefix:
        return

    path = Path(f"{prefix}-{tile}.jsonl")
    path.parent.mkdir(parents=True, exist_ok=True)

    with path.open("a", encoding="utf-8") as file:
        file.write(json.dumps(record, separators=(",", ":")) + "\n")


def get_state_pool_limit(tile, default_limit):
    limits = {
        2048: 30000,
        4096: 30000,
        8192: 15000,
        16384: 8000,
        32768: 4000,
    }

    return limits.get(tile, default_limit)


def compact_state_pool(prefix, tile, pool, rng, default_limit):
    if not prefix or not pool:
        return pool

    limit = get_state_pool_limit(tile, default_limit)

    if limit <= 0 or len(pool) <= limit:
        return pool

    selected = rng.sample(pool, limit)
    path = Path(f"{prefix}-{tile}.jsonl")
    temp_path = path.with_suffix(path.suffix + ".tmp")
    path.parent.mkdir(parents=True, exist_ok=True)

    with temp_path.open("w", encoding="utf-8") as file:
        for record in selected:
            file.write(json.dumps(record, separators=(",", ":")) + "\n")

    temp_path.replace(path)
    return selected


def parse_tile_ratio_map(raw):
    if not raw:
        return {}

    ratios = {}

    for item in raw.split(","):
        if not item.strip() or ":" not in item:
            continue

        tile_text, ratio_text = item.split(":", 1)

        try:
            tile = int(tile_text.strip())
            ratio = float(ratio_text.strip())
        except ValueError:
            continue

        if tile > 0 and ratio > 0:
            ratios[tile] = ratio

    return ratios


def weighted_choice(items, rng):
    total_weight = sum(weight for _, weight in items)

    if total_weight <= 0:
        return None

    threshold = rng.random() * total_weight
    cumulative = 0.0

    for item, weight in items:
        cumulative += weight

        if threshold <= cumulative:
            return item

    return items[-1][0]


def state_record_key(record):
    return json.dumps(record.get("board", []), separators=(",", ":"))


def choose_state_record(pool, rng, last_key=""):
    if not pool:
        return None

    if len(pool) == 1:
        return pool[0]

    for _ in range(8):
        record = rng.choice(pool)

        if state_record_key(record) != last_key:
            return record

    return rng.choice(pool)


def find_failure_bucket(max_tile, milestones):
    for milestone in milestones:
        if max_tile < milestone:
            return milestone

    return None


def create_empty_board():
    return [[0 for _ in range(BOARD_SIZE)] for _ in range(BOARD_SIZE)]


def clone_board(board):
    return [row[:] for row in board]


def board_equal(a, b):
    for row in range(BOARD_SIZE):
        for col in range(BOARD_SIZE):
            if a[row][col] != b[row][col]:
                return False
    return True


def slide_line_left(line):
    values = [value for value in line if value != 0]
    values.extend([0] * (len(line) - len(values)))
    return values


def merge_line_left(line):
    result = []
    score_gained = 0
    i = 0

    while i < len(line):
        current = line[i]
        next_value = line[i + 1] if i + 1 < len(line) else None

        if current != 0 and current == next_value:
            merged = current * 2
            result.append(merged)
            score_gained += merged
            i += 2
        else:
            result.append(current)
            i += 1

    result.extend([0] * (len(line) - len(result)))
    return result, score_gained


def move_line_left(line):
    return merge_line_left(slide_line_left(line))


def get_column(board, col):
    return [board[row][col] for row in range(BOARD_SIZE)]


def set_column(board, col, values):
    for row in range(BOARD_SIZE):
        board[row][col] = values[row]


def simulate_move(board, direction):
    score_gained = 0

    if direction == "left":
        new_board = []
        for row in board:
            moved_line, gained = move_line_left(row)
            new_board.append(moved_line)
            score_gained += gained
    elif direction == "right":
        new_board = []
        for row in board:
            moved_line, gained = move_line_left(list(reversed(row)))
            new_board.append(list(reversed(moved_line)))
            score_gained += gained
    elif direction == "up":
        new_board = clone_board(board)
        for col in range(BOARD_SIZE):
            moved_line, gained = move_line_left(get_column(new_board, col))
            set_column(new_board, col, moved_line)
            score_gained += gained
    elif direction == "down":
        new_board = clone_board(board)
        for col in range(BOARD_SIZE):
            column = list(reversed(get_column(new_board, col)))
            moved_line, gained = move_line_left(column)
            set_column(new_board, col, list(reversed(moved_line)))
            score_gained += gained
    else:
        raise ValueError(f"Invalid direction: {direction}")

    return {
        "board": new_board,
        "score_gained": score_gained,
        "moved": not board_equal(board, new_board),
    }


def get_valid_moves(board):
    return [
        direction
        for direction in DIRECTIONS
        if simulate_move(board, direction)["moved"]
    ]


def get_empty_cells(board):
    cells = []
    for row in range(BOARD_SIZE):
        for col in range(BOARD_SIZE):
            if board[row][col] == 0:
                cells.append((row, col))
    return cells


def add_random_tile(board, rng):
    empty_cells = get_empty_cells(board)
    if not empty_cells:
        return False

    row, col = rng.choice(empty_cells)
    board[row][col] = 2 if rng.random() < 0.9 else 4
    return True


def reset_board(rng):
    board = create_empty_board()
    add_random_tile(board, rng)
    add_random_tile(board, rng)
    return board


def get_max_tile(board):
    return max(max(row) for row in board)


def tile_power(value):
    if value == 0:
        return 0
    return min(int(math.log2(value)), MAX_TILE_POWER)


def flatten_powers(board):
    return [tile_power(board[row][col]) for row in range(4) for col in range(4)]


def count_empty_cells(board):
    return sum(1 for row in board for value in row if value == 0)


def is_max_tile_in_corner(board):
    max_tile = get_max_tile(board)
    return max_tile in (
        board[0][0],
        board[0][3],
        board[3][0],
        board[3][3],
    )


def calculate_smoothness(board):
    penalty = 0
    for row in range(BOARD_SIZE):
        for col in range(BOARD_SIZE):
            current = board[row][col]
            if current == 0:
                continue

            right = board[row][col + 1] if col + 1 < BOARD_SIZE else 0
            down = board[row + 1][col] if row + 1 < BOARD_SIZE else 0

            if right != 0:
                penalty += abs(tile_power(current) - tile_power(right))
            if down != 0:
                penalty += abs(tile_power(current) - tile_power(down))

    return -penalty


def calculate_monotonicity(board):
    row_score = 0
    col_score = 0

    for row in range(BOARD_SIZE):
        increasing = 0
        decreasing = 0

        for col in range(BOARD_SIZE - 1):
            current = tile_power(board[row][col])
            next_value = tile_power(board[row][col + 1])

            if current > next_value:
                decreasing += current - next_value
            else:
                increasing += next_value - current

        row_score += max(increasing, decreasing)

    for col in range(BOARD_SIZE):
        increasing = 0
        decreasing = 0

        for row in range(BOARD_SIZE - 1):
            current = tile_power(board[row][col])
            next_value = tile_power(board[row + 1][col])

            if current > next_value:
                decreasing += current - next_value
            else:
                increasing += next_value - current

        col_score += max(increasing, decreasing)

    return row_score + col_score


def count_merge_potential(board):
    merges = 0

    for row in range(BOARD_SIZE):
        for col in range(BOARD_SIZE):
            current = board[row][col]

            if current == 0:
                continue

            right = board[row][col + 1] if col + 1 < BOARD_SIZE else 0
            down = board[row + 1][col] if row + 1 < BOARD_SIZE else 0

            if current == right:
                merges += 1
            if current == down:
                merges += 1

    return merges


def calculate_corner_gradient_score(board):
    max_tile = get_max_tile(board)

    if max_tile == 0:
        return 0

    corners = ((0, 0), (0, 3), (3, 0), (3, 3))
    best_score = -float("inf")

    for corner_row, corner_col in corners:
        if board[corner_row][corner_col] != max_tile:
            continue

        score = 0
        for row in range(BOARD_SIZE):
            for col in range(BOARD_SIZE):
                value = board[row][col]
                if value == 0:
                    continue
                distance = abs(row - corner_row) + abs(col - corner_col)
                score += tile_power(value) * (0.5 ** distance)

        best_score = max(best_score, score)

    return 0 if best_score == -float("inf") else best_score


def build_snake_patterns():
    patterns = []
    corner_configs = (
        ("top", "left"),
        ("top", "right"),
        ("bottom", "left"),
        ("bottom", "right"),
    )

    for vertical, horizontal in corner_configs:
        rows = list(range(BOARD_SIZE))
        cols = list(range(BOARD_SIZE))

        if vertical == "bottom":
            rows.reverse()

        pattern = []
        for row_index, row in enumerate(rows):
            current_cols = cols[:]
            should_reverse = (
                (horizontal == "left" and row_index % 2 == 1)
                or (horizontal == "right" and row_index % 2 == 0)
            )

            if should_reverse:
                current_cols.reverse()

            for col in current_cols:
                pattern.append((row, col))

        patterns.append(pattern)

    return patterns


SNAKE_PATTERNS = build_snake_patterns()


def build_snake_window_patterns(window_size):
    patterns = []
    seen = set()

    for snake in SNAKE_PATTERNS:
        snake_indexes = [row_col_to_index(row, col) for row, col in snake]

        for start in range(0, len(snake_indexes) - window_size + 1):
            pattern = tuple(snake_indexes[start : start + window_size])

            if pattern not in seen:
                seen.add(pattern)
                patterns.append(pattern)

    return patterns


def calculate_snake_score(board):
    best_score = -float("inf")

    for pattern in SNAKE_PATTERNS:
        score = 0

        for index, (row, col) in enumerate(pattern):
            value = board[row][col]

            if value == 0:
                continue

            score += tile_power(value) * (len(pattern) - index)

        best_score = max(best_score, score)

    return best_score


def evaluate_board_with_champion_weights(board, score_gained):
    max_tile = get_max_tile(board)
    max_tile_power = tile_power(max_tile)
    max_tile_in_corner = is_max_tile_in_corner(board)
    score = 0

    score += count_empty_cells(board) * CHAMPION_WEIGHTS["emptyCells"]
    score += score_gained * CHAMPION_WEIGHTS["scoreGained"]
    score += max_tile * CHAMPION_WEIGHTS["maxTile"]
    score += max_tile_power * CHAMPION_WEIGHTS["maxTilePower"]
    score += calculate_corner_gradient_score(board) * CHAMPION_WEIGHTS["cornerGradient"]
    score += calculate_smoothness(board) * CHAMPION_WEIGHTS["smoothness"]
    score += calculate_monotonicity(board) * CHAMPION_WEIGHTS["monotonicity"]
    score += count_merge_potential(board) * CHAMPION_WEIGHTS["mergePotential"]
    score += calculate_snake_score(board) * CHAMPION_WEIGHTS["snakeScore"]

    if max_tile_in_corner:
        score += max_tile * CHAMPION_WEIGHTS["maxTileInCorner"]
    else:
        score += max_tile * CHAMPION_WEIGHTS["maxTileNotInCorner"]

    return score


def index_to_row_col(index):
    return index // 4, index % 4


def row_col_to_index(row, col):
    return row * 4 + col


def transform_index(index, transform):
    row, col = index_to_row_col(index)

    if transform == 0:
        return row_col_to_index(row, col)
    if transform == 1:
        return row_col_to_index(col, 3 - row)
    if transform == 2:
        return row_col_to_index(3 - row, 3 - col)
    if transform == 3:
        return row_col_to_index(3 - col, row)
    if transform == 4:
        return row_col_to_index(row, 3 - col)
    if transform == 5:
        return row_col_to_index(3 - row, col)
    if transform == 6:
        return row_col_to_index(col, row)
    if transform == 7:
        return row_col_to_index(3 - col, 3 - row)

    raise ValueError(f"Invalid transform: {transform}")


def build_patterns(pattern_set):
    if pattern_set == "paper17":
        patterns = []

        for row in range(BOARD_SIZE):
            patterns.append(tuple(row_col_to_index(row, col) for col in range(BOARD_SIZE)))

        for col in range(BOARD_SIZE):
            patterns.append(tuple(row_col_to_index(row, col) for row in range(BOARD_SIZE)))

        for row in range(BOARD_SIZE - 1):
            for col in range(BOARD_SIZE - 1):
                patterns.append(
                    (
                        row_col_to_index(row, col),
                        row_col_to_index(row, col + 1),
                        row_col_to_index(row + 1, col),
                        row_col_to_index(row + 1, col + 1),
                    )
                )

        return patterns

    if pattern_set == "snake6":
        return build_snake_window_patterns(6)

    if pattern_set == "snake7":
        return build_snake_window_patterns(7)

    if pattern_set == "small":
        base_patterns = [
            (0, 1, 2, 3),
            (0, 4, 8, 12),
            (0, 1, 4, 5),
        ]
    elif pattern_set == "medium":
        base_patterns = [
            (0, 1, 2, 3),
            (0, 4, 8, 12),
            (0, 1, 4, 5),
            (0, 1, 2, 4, 5, 6),
            (0, 1, 4, 5, 8, 9),
        ]
    elif pattern_set == "full":
        base_patterns = [
            (0, 1, 2, 3),
            (0, 4, 8, 12),
            (0, 1, 4, 5),
            (0, 1, 2, 4, 5, 6),
            (0, 1, 4, 5, 8, 9),
            (0, 1, 2, 3, 4, 5),
            (0, 1, 4, 5, 6, 7),
        ]
    else:
        raise ValueError(f"Invalid pattern set: {pattern_set}")

    patterns = []
    seen = set()

    for pattern in base_patterns:
        for transform in range(8):
            transformed = tuple(transform_index(index, transform) for index in pattern)

            if transformed not in seen:
                seen.add(transformed)
                patterns.append(transformed)

    return patterns


def tuple_key(values, pattern):
    key = 0
    for index in pattern:
        key = key * TILE_BUCKETS + values[index]
    return key


class NtupleValue:
    def __init__(self, patterns):
        self.patterns = patterns
        self.weights = [defaultdict(float) for _ in patterns]

    def features(self, board):
        values = flatten_powers(board)
        return [tuple_key(values, pattern) for pattern in self.patterns]

    def evaluate_features(self, features):
        total = 0.0
        for pattern_index, key in enumerate(features):
            total += self.weights[pattern_index][key]
        return total

    def evaluate(self, board):
        return self.evaluate_features(self.features(board))

    def update(self, features, delta, alpha):
        step = alpha * delta
        for pattern_index, key in enumerate(features):
            self.weights[pattern_index][key] += step

    def non_zero_weights(self):
        return sum(len(table) for table in self.weights)


def choose_afterstate(value_fn, board, rng, epsilon):
    valid_moves = get_valid_moves(board)

    if not valid_moves:
        return None

    if rng.random() < epsilon:
        direction = rng.choice(valid_moves)
        result = simulate_move(board, direction)
        return direction, result

    best = None
    best_score = -float("inf")

    for direction in valid_moves:
        result = simulate_move(board, direction)
        score = result["score_gained"] + value_fn.evaluate(result["board"])

        if score > best_score:
            best_score = score
            best = (direction, result)

    return best


def get_champion_depth_score(board, depth):
    valid_moves = get_valid_moves(board)

    if not valid_moves:
        return -100000

    best_score = -float("inf")

    for direction in valid_moves:
        result = simulate_move(board, direction)
        current_score = evaluate_board_with_champion_weights(
            result["board"],
            result["score_gained"],
        )

        if depth <= 1:
            score = current_score
        else:
            score = current_score + get_champion_depth_score(
                result["board"],
                depth - 1,
            ) * FUTURE_WEIGHT

        best_score = max(best_score, score)

    return best_score


def choose_champion_afterstate(board, depth):
    valid_moves = get_valid_moves(board)

    if not valid_moves:
        return None

    best = None
    best_score = -float("inf")

    for direction in valid_moves:
        result = simulate_move(board, direction)
        current_score = evaluate_board_with_champion_weights(
            result["board"],
            result["score_gained"],
        )

        if depth <= 1:
            score = current_score
        else:
            score = current_score + get_champion_depth_score(
                result["board"],
                depth - 1,
            ) * FUTURE_WEIGHT

        if score > best_score:
            best_score = score
            best = (direction, result)

    return best


def pretrain_from_champion(value_fn, args, rng):
    if args.pretrain_episodes <= 0:
        return

    print(
        f"Pretraining from champion depth={args.pretrain_depth} "
        f"episodes={args.pretrain_episodes}",
        flush=True,
    )

    total_pairs = 0

    for episode in range(1, args.pretrain_episodes + 1):
        board = reset_board(rng)
        steps = 0

        while steps < args.max_steps:
            valid_moves = get_valid_moves(board)
            expert = choose_champion_afterstate(board, args.pretrain_depth)

            if expert is None:
                break

            expert_move, expert_result = expert
            expert_features = value_fn.features(expert_result["board"])

            for direction in valid_moves:
                if direction == expert_move:
                    continue

                other_result = simulate_move(board, direction)
                other_features = value_fn.features(other_result["board"])
                expert_score = (
                    expert_result["score_gained"]
                    + value_fn.evaluate_features(expert_features)
                )
                other_score = (
                    other_result["score_gained"]
                    + value_fn.evaluate_features(other_features)
                )
                margin_error = args.pretrain_margin - (expert_score - other_score)

                if margin_error > 0:
                    value_fn.update(
                        expert_features,
                        margin_error,
                        args.pretrain_alpha,
                    )
                    value_fn.update(
                        other_features,
                        -margin_error,
                        args.pretrain_alpha,
                    )

                total_pairs += 1

            board = clone_board(expert_result["board"])
            add_random_tile(board, rng)
            steps += 1

        if episode % args.log_every == 0:
            print(
                f"pretrain={episode}/{args.pretrain_episodes} "
                f"pairs={total_pairs} weights={value_fn.non_zero_weights()}",
                flush=True,
            )


def mc_pretrain_from_champion(value_fn, args, rng):
    if args.mc_pretrain_episodes <= 0:
        return

    print(
        f"MC pretraining from champion depth={args.mc_pretrain_depth} "
        f"episodes={args.mc_pretrain_episodes}",
        flush=True,
    )

    total_score = 0
    best_score = 0
    best_tile = 0
    win_count = 0

    for episode in range(1, args.mc_pretrain_episodes + 1):
        board = reset_board(rng)
        trajectory = []
        score = 0
        steps = 0

        while steps < args.max_steps:
            expert = choose_champion_afterstate(board, args.mc_pretrain_depth)

            if expert is None:
                break

            _, result = expert
            afterstate = result["board"]
            reward = result["score_gained"]
            trajectory.append((value_fn.features(afterstate), reward))

            board = clone_board(afterstate)
            add_random_tile(board, rng)
            score += reward
            steps += 1

        future_return = 0.0

        for features, reward in reversed(trajectory):
            current_value = value_fn.evaluate_features(features)
            value_fn.update(
                features,
                future_return - current_value,
                args.mc_pretrain_alpha,
            )
            future_return = reward + args.gamma * future_return

        max_tile = get_max_tile(board)
        total_score += score
        best_score = max(best_score, score)
        best_tile = max(best_tile, max_tile)

        if max_tile >= 2048:
            win_count += 1

        if episode % args.log_every == 0:
            print(
                f"mcPretrain={episode}/{args.mc_pretrain_episodes} "
                f"avgScore={total_score / episode:.1f} bestScore={best_score} "
                f"bestTile={best_tile} winRate={win_count / episode * 100:.2f}% "
                f"weights={value_fn.non_zero_weights()}",
                flush=True,
            )


def export_js_module(value_fn, output_file, metadata, prune_below):
    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    exported_weights = []
    kept_weights = 0

    for table in value_fn.weights:
        entries = [
            [key, round(weight, 6)]
            for key, weight in table.items()
            if abs(weight) >= prune_below
        ]
        entries.sort(key=lambda item: item[0])
        kept_weights += len(entries)
        exported_weights.append(entries)

    data = {
        "type": "sparse-ntuple-td-afterstate",
        "metadata": {
            **metadata,
            "patterns": len(value_fn.patterns),
            "keptWeights": kept_weights,
            "pruneBelow": prune_below,
        },
        "patterns": [list(pattern) for pattern in value_fn.patterns],
        "weights": exported_weights,
    }

    output_path.write_text(
        "export const NTUPLE_TD_V1 = "
        + json.dumps(data, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )

    print(f"Saved model: {output_path}", flush=True)
    print(f"Exported non-zero weights: {kept_weights}", flush=True)


def load_js_module_model(input_file):
    input_path = Path(input_file)

    if not input_path.exists():
        raise FileNotFoundError(f"Input model not found: {input_path}")

    raw = input_path.read_text(encoding="utf-8").strip()
    prefix = "export const NTUPLE_TD_V1 = "

    if not raw.startswith(prefix):
        raise ValueError(f"Unsupported model file: {input_path}")

    if raw.endswith(";"):
        raw = raw[:-1]

    return json.loads(raw[len(prefix) :])


def load_value_function_from_model(input_file):
    data = load_js_module_model(input_file)
    metadata = data.get("metadata", {})
    encoding_base = metadata.get("encodingBase")

    if encoding_base is None:
        raise ValueError(
            "Input model has no encodingBase metadata. It is likely a legacy model; "
            "train the corrected paper17 model from scratch instead of resuming it."
        )

    if encoding_base != TILE_BUCKETS:
        raise ValueError(
            f"Input model encodingBase={encoding_base} is incompatible "
            f"with trainer encodingBase={TILE_BUCKETS}. Train this pattern from scratch."
        )

    patterns = [tuple(pattern) for pattern in data["patterns"]]
    value_fn = NtupleValue(patterns)

    for pattern_index, entries in enumerate(data["weights"]):
        for key, value in entries:
            value_fn.weights[pattern_index][int(key)] = float(value)

    print(
        f"Loaded model: {input_file} "
        f"patterns={len(patterns)} weights={value_fn.non_zero_weights()}",
        flush=True,
    )

    return value_fn


def build_metadata(
    args,
    episode=None,
    total_score=0,
    total_steps=0,
    best_score=0,
    best_tile=0,
    win_count=0,
):
    completed = args.episodes if episode is None else episode

    return {
        "episodes": args.episodes,
        "completedEpisodes": completed,
        "averageScore": total_score / completed if completed else 0,
        "averageSteps": total_steps / completed if completed else 0,
        "bestScore": best_score,
        "bestTile": best_tile,
        "winRate": win_count / completed * 100 if completed else 0,
        "pretrainEpisodes": args.pretrain_episodes,
        "pretrainDepth": args.pretrain_depth,
        "pretrainAlpha": args.pretrain_alpha,
        "pretrainMargin": args.pretrain_margin,
        "mcPretrainEpisodes": args.mc_pretrain_episodes,
        "mcPretrainDepth": args.mc_pretrain_depth,
        "mcPretrainAlpha": args.mc_pretrain_alpha,
        "patternSet": args.pattern_set,
        "stopAtTile": args.stop_at_tile,
        "failureTile": args.failure_tile,
        "failedSeedRatio": args.failed_seed_ratio,
        "replayFailedSeedsFile": args.replay_failed_seeds_file,
        "saveFailedSeedsFile": args.save_failed_seeds_file,
        "stateReplayRatio": args.state_replay_ratio,
        "replayStatesFile": args.replay_states_file,
        "saveStateThresholds": args.save_state_thresholds,
        "saveStatePrefix": args.save_state_prefix,
        "autoMilestones": args.auto_milestones,
        "autoStatePrefix": args.auto_state_prefix,
        "autoStateReplayRatios": args.auto_state_replay_ratios,
        "autoFailedSeedPrefix": args.auto_failed_seed_prefix,
        "compactStateEvery": args.compact_state_every,
        "maxStatesPerTile": args.max_states_per_tile,
        "encodingBase": TILE_BUCKETS,
        "maxTilePower": MAX_TILE_POWER,
        "inputModel": args.input_model,
        "seed": args.seed,
        "alphaStart": args.alpha_start,
        "alphaEnd": args.alpha_end,
        "epsilonStart": args.epsilon_start,
        "epsilonEnd": args.epsilon_end,
        "gamma": args.gamma,
        "savedAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }


def save_checkpoint(
    value_fn,
    args,
    episode,
    total_score,
    total_steps,
    best_score,
    best_tile,
    win_count,
):
    if args.save_every <= 0:
        return

    metadata = build_metadata(
        args,
        episode=episode,
        total_score=total_score,
        total_steps=total_steps,
        best_score=best_score,
        best_tile=best_tile,
        win_count=win_count,
    )

    export_js_module(value_fn, args.output, metadata, args.prune_below)

    if args.checkpoint_dir:
        checkpoint_dir = Path(args.checkpoint_dir)
        checkpoint_dir.mkdir(parents=True, exist_ok=True)
        checkpoint_path = checkpoint_dir / f"ntupleWeights-episode-{episode}.js"
        export_js_module(value_fn, checkpoint_path, metadata, args.prune_below)


def train(args):
    rng = random.Random(args.seed)
    failed_seed_pool = load_seed_pool(args.replay_failed_seeds_file)
    replay_state_pool = load_state_pool(args.replay_states_file)
    save_state_thresholds = parse_int_list(args.save_state_thresholds)
    auto_replay_ratios = parse_tile_ratio_map(args.auto_state_replay_ratios)
    auto_replay_pools = {
        tile: load_state_pool(f"{args.auto_state_prefix}-{tile}.jsonl")
        for tile in auto_replay_ratios
    }
    auto_replay_target_ratio = min(sum(auto_replay_ratios.values()), 1.0)
    auto_milestones = parse_int_list(args.auto_milestones)
    failed_seed_target = args.failure_tile or args.stop_at_tile or 2048
    replay_count = 0
    state_replay_count = 0
    auto_state_replay_count = 0
    failed_count = 0
    saved_state_count = 0
    compact_count = 0
    last_replay_state_key = ""

    if failed_seed_pool:
        print(
            f"Loaded failed seed pool: {len(failed_seed_pool)} "
            f"from {args.replay_failed_seeds_file}",
            flush=True,
        )

    if replay_state_pool:
        print(
            f"Loaded replay state pool: {len(replay_state_pool)} "
            f"from {args.replay_states_file}",
            flush=True,
        )

    if auto_replay_ratios:
        loaded = ", ".join(
            f"{tile}:{len(pool)}" for tile, pool in sorted(auto_replay_pools.items())
        )
        print(
            f"Loaded auto state pools: {loaded or 'none'} "
            f"targetReplayRatio={auto_replay_target_ratio:.2f}",
            flush=True,
        )

    if args.input_model:
        value_fn = load_value_function_from_model(args.input_model)
    else:
        patterns = build_patterns(args.pattern_set)
        value_fn = NtupleValue(patterns)
    total_score = 0
    total_steps = 0
    best_score = 0
    best_tile = 0
    win_count = 0

    pretrain_from_champion(value_fn, args, rng)
    mc_pretrain_from_champion(value_fn, args, rng)

    for episode in range(1, args.episodes + 1):
        auto_replay_choices = [
            ((tile, pool), auto_replay_ratios[tile])
            for tile, pool in auto_replay_pools.items()
            if pool
        ]
        auto_replay_probability = min(
            auto_replay_target_ratio,
            1.0,
        )
        auto_replay_choice = (
            weighted_choice(auto_replay_choices, rng)
            if auto_replay_choices and rng.random() < auto_replay_probability
            else None
        )
        use_auto_replay_state = auto_replay_choice is not None
        use_replay_state = (
            not use_auto_replay_state
            and replay_state_pool
            and args.state_replay_ratio > 0
            and rng.random() < args.state_replay_ratio
        )
        use_replay_seed = (
            not use_auto_replay_state
            and not use_replay_state
            and failed_seed_pool
            and args.failed_seed_ratio > 0
            and rng.random() < args.failed_seed_ratio
        )
        episode_seed = (
            rng.choice(failed_seed_pool)
            if use_replay_seed
            else rng.randrange(1, 2**32)
        )
        episode_rng = random.Random(episode_seed)
        auto_replay_tile = None
        replay_state_record = None

        if use_auto_replay_state:
            auto_replay_tile, auto_replay_pool = auto_replay_choice
            replay_state_record = choose_state_record(
                auto_replay_pool,
                rng,
                last_replay_state_key,
            )
        elif use_replay_state:
            replay_state_record = choose_state_record(
                replay_state_pool,
                rng,
                last_replay_state_key,
            )

        if replay_state_record:
            last_replay_state_key = state_record_key(replay_state_record)

        board = (
            clone_board(replay_state_record["board"])
            if replay_state_record
            else reset_board(episode_rng)
        )
        score = 0
        steps = 0
        saved_tiles_this_episode = set()

        if use_replay_state:
            state_replay_count += 1

        if use_auto_replay_state:
            auto_state_replay_count += 1

        if use_replay_seed:
            replay_count += 1
        epsilon = max(
            args.epsilon_end,
            args.epsilon_start
            - (args.epsilon_start - args.epsilon_end) * episode / args.episodes,
        )
        alpha = max(
            args.alpha_end,
            args.alpha_start
            - (args.alpha_start - args.alpha_end) * episode / args.episodes,
        )

        while steps < args.max_steps:
            choice = choose_afterstate(value_fn, board, rng, epsilon)

            if choice is None:
                break

            _, result = choice
            afterstate = result["board"]
            reward = result["score_gained"]
            features = value_fn.features(afterstate)
            current_value = value_fn.evaluate_features(features)

            next_board = clone_board(afterstate)
            add_random_tile(next_board, episode_rng)

            if not get_valid_moves(next_board):
                target = 0.0
            else:
                next_choice = choose_afterstate(value_fn, next_board, rng, 0.0)
                next_afterstate = next_choice[1]["board"]
                next_reward = next_choice[1]["score_gained"]
                target = next_reward + args.gamma * value_fn.evaluate(next_afterstate)

            value_fn.update(features, target - current_value, alpha)

            board = next_board
            score += reward
            steps += 1
            current_max_tile = get_max_tile(board)

            thresholds_to_save = sorted(set(save_state_thresholds + auto_milestones))

            for threshold in thresholds_to_save:
                if (
                    current_max_tile >= threshold
                    and threshold not in saved_tiles_this_episode
                ):
                    saved_tiles_this_episode.add(threshold)
                    saved_state_count += 1
                    state_snapshot_prefix = args.save_state_prefix or args.auto_state_prefix
                    state_record = {
                        "board": board,
                        "tile": threshold,
                        "maxTile": current_max_tile,
                        "episode": episode,
                        "score": score,
                        "steps": steps,
                        "seed": episode_seed,
                        "source": (
                            f"state-{auto_replay_tile}"
                            if use_auto_replay_state
                            else "state"
                            if use_replay_state
                            else "seed"
                            if use_replay_seed
                            else "fresh"
                        ),
                    }
                    append_state_snapshot(
                        state_snapshot_prefix,
                        threshold,
                        state_record,
                    )

                    if threshold in auto_replay_pools:
                        auto_replay_pools[threshold].append(state_record)

            if args.stop_at_tile > 0 and current_max_tile >= args.stop_at_tile:
                break

        max_tile = get_max_tile(board)
        total_score += score
        total_steps += steps
        best_score = max(best_score, score)
        best_tile = max(best_tile, max_tile)

        if max_tile >= 2048:
            win_count += 1

        if args.save_failed_seeds_file and max_tile < failed_seed_target:
            failed_count += 1
            append_failed_seed(
                args.save_failed_seeds_file,
                {
                    "seed": episode_seed,
                    "episode": episode,
                    "score": score,
                    "steps": steps,
                    "maxTile": max_tile,
                    "targetTile": failed_seed_target,
                    "source": "replay" if use_replay_seed else "fresh",
                },
            )

        if args.auto_failed_seed_prefix and auto_milestones:
            failure_bucket = find_failure_bucket(max_tile, auto_milestones)

            if failure_bucket is not None:
                append_failed_seed(
                    f"{args.auto_failed_seed_prefix}-{failure_bucket}.jsonl",
                    {
                        "seed": episode_seed,
                        "episode": episode,
                        "score": score,
                        "steps": steps,
                        "maxTile": max_tile,
                        "targetTile": failure_bucket,
                        "source": (
                            f"state-{auto_replay_tile}"
                            if use_auto_replay_state
                            else "state"
                            if use_replay_state
                            else "seed"
                            if use_replay_seed
                            else "fresh"
                        ),
                    },
                )

        if episode % args.log_every == 0:
            avg_score = total_score / episode
            win_rate = win_count / episode * 100
            print(
                f"episode={episode}/{args.episodes} "
                f"avgScore={avg_score:.1f} bestScore={best_score} "
                f"bestTile={best_tile} winRate={win_rate:.2f}% "
                f"avgSteps={total_steps / episode:.1f} "
                f"seedReplay={replay_count} stateReplay={state_replay_count} "
                f"autoStateReplay={auto_state_replay_count} "
                f"failed<{failed_seed_target}={failed_count} "
                f"savedStates={saved_state_count} "
                f"compactions={compact_count} "
                f"weights={value_fn.non_zero_weights()}",
                flush=True,
            )

        if (
            args.compact_state_every > 0
            and args.auto_state_prefix
            and episode % args.compact_state_every == 0
        ):
            for tile in sorted(auto_replay_pools):
                before = len(auto_replay_pools[tile])
                auto_replay_pools[tile] = compact_state_pool(
                    args.auto_state_prefix,
                    tile,
                    auto_replay_pools[tile],
                    rng,
                    args.max_states_per_tile,
                )
                after = len(auto_replay_pools[tile])

                if after != before:
                    print(
                        f"Compacted states-at-{tile}: {before} -> {after}",
                        flush=True,
                    )

            compact_count += 1

        if args.save_every > 0 and episode % args.save_every == 0:
            save_checkpoint(
                value_fn,
                args,
                episode,
                total_score,
                total_steps,
                best_score,
                best_tile,
                win_count,
            )

    export_js_module(
        value_fn,
        args.output,
        build_metadata(
            args,
            episode=args.episodes,
            total_score=total_score,
            total_steps=total_steps,
            best_score=best_score,
            best_tile=best_tile,
            win_count=win_count,
        ),
        args.prune_below,
    )


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--episodes", type=int, default=50000)
    parser.add_argument("--seed", type=int, default=20260605)
    parser.add_argument("--max-steps", type=int, default=10000)
    parser.add_argument("--alpha-start", type=float, default=0.03)
    parser.add_argument("--alpha-end", type=float, default=0.003)
    parser.add_argument("--epsilon-start", type=float, default=0.08)
    parser.add_argument("--epsilon-end", type=float, default=0.005)
    parser.add_argument("--gamma", type=float, default=1.0)
    parser.add_argument("--log-every", type=int, default=1000)
    parser.add_argument("--save-every", type=int, default=0)
    parser.add_argument("--checkpoint-dir", default="")
    parser.add_argument("--stop-at-tile", type=int, default=0)
    parser.add_argument("--failure-tile", type=int, default=0)
    parser.add_argument("--save-failed-seeds-file", default="")
    parser.add_argument("--replay-failed-seeds-file", default="")
    parser.add_argument("--failed-seed-ratio", type=float, default=0.0)
    parser.add_argument("--replay-states-file", default="")
    parser.add_argument("--state-replay-ratio", type=float, default=0.0)
    parser.add_argument("--save-state-thresholds", default="")
    parser.add_argument("--save-state-prefix", default="")
    parser.add_argument("--auto-milestones", default="")
    parser.add_argument("--auto-state-prefix", default="")
    parser.add_argument("--auto-state-replay-ratios", default="")
    parser.add_argument("--auto-failed-seed-prefix", default="")
    parser.add_argument("--compact-state-every", type=int, default=2000)
    parser.add_argument("--max-states-per-tile", type=int, default=20000)
    parser.add_argument("--prune-below", type=float, default=0.0001)
    parser.add_argument("--pretrain-episodes", type=int, default=0)
    parser.add_argument("--pretrain-depth", type=int, default=2)
    parser.add_argument("--pretrain-alpha", type=float, default=0.01)
    parser.add_argument("--pretrain-margin", type=float, default=1.0)
    parser.add_argument("--mc-pretrain-episodes", type=int, default=0)
    parser.add_argument("--mc-pretrain-depth", type=int, default=2)
    parser.add_argument("--mc-pretrain-alpha", type=float, default=0.01)
    parser.add_argument(
        "--pattern-set",
        choices=("paper17", "snake6", "snake7", "small", "medium", "full"),
        default="paper17",
    )
    parser.add_argument(
        "--output",
        default="js/ai/models/ntupleWeights.js",
    )
    parser.add_argument("--input-model", default="")
    return parser.parse_args()


if __name__ == "__main__":
    train(parse_args())
