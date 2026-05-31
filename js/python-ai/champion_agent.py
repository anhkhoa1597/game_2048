import math

from champion_weights import CHAMPION_WEIGHTS


FUTURE_WEIGHT = 0.75


class ChampionAgent:
    def __init__(self, weights=None, depth=2):
        self.weights = weights if weights is not None else CHAMPION_WEIGHTS
        self.depth = depth

    def choose_action(self, env):
        board = env.get_state()
        valid_actions = env.get_valid_actions()

        if len(valid_actions) == 0:
            return None

        best_action = None
        best_score = float("-inf")

        for action in valid_actions:
            direction = env.action_to_direction(action)
            result = env.simulate_move(board, direction)

            score = self.evaluate_move_result(env, result, self.depth)

            if score > best_score:
                best_score = score
                best_action = action

        return best_action

    def evaluate_move_result(self, env, result, depth):
        current_score = self.evaluate_board(
            result["board"],
            result["score_gained"],
        )

        if depth <= 1:
            return current_score

        future_score = self.get_best_score_at_depth(
            env,
            result["board"],
            depth - 1,
        )

        return current_score + future_score * FUTURE_WEIGHT

    def get_best_score_at_depth(self, env, board, depth):
        

        valid_actions = self.get_valid_actions_for_board(env, board)

        if len(valid_actions) == 0:
            return -100000

        best_score = float("-inf")

        for action in valid_actions:
            direction = env.action_to_direction(action)
            result = env.simulate_move(board, direction)
            score = self.evaluate_move_result(env, result, depth)

            if score > best_score:
                best_score = score

        return best_score

    def get_valid_actions_for_board(self, env, board):
        valid_actions = []

        for action in [0, 1, 2, 3]:
            direction = env.action_to_direction(action)
            result = env.simulate_move(board, direction)

            if result["moved"]:
                valid_actions.append(action)

        return valid_actions

    def evaluate_board(self, board, score_gained=0):
        features = self.extract_board_features(board, score_gained)
        weights = self.weights

        board_score = 0

        board_score += features["emptyCells"] * weights["emptyCells"]
        board_score += features["scoreGained"] * weights["scoreGained"]
        board_score += features["maxTile"] * weights["maxTile"]
        board_score += features["maxTilePower"] * weights["maxTilePower"]
        board_score += features["cornerGradient"] * weights["cornerGradient"]
        board_score += features["smoothness"] * weights["smoothness"]
        board_score += features["monotonicity"] * weights["monotonicity"]
        board_score += features["mergePotential"] * weights["mergePotential"]
        board_score += features["snakeScore"] * weights["snakeScore"]

        if features["maxTileInCorner"]:
            board_score += features["maxTile"] * weights["maxTileInCorner"]
        else:
            board_score += features["maxTile"] * weights["maxTileNotInCorner"]

        return board_score

    def extract_board_features(self, board, score_gained=0):
        max_tile = self.get_max_tile(board)
        max_tile_power = 0 if max_tile == 0 else math.log2(max_tile)
        max_tile_in_corner = self.is_max_tile_in_corner(board)

        return {
            "emptyCells": self.count_empty_cells(board),
            "scoreGained": score_gained,
            "maxTile": max_tile,
            "maxTilePower": max_tile_power,
            "maxTileInCorner": 1 if max_tile_in_corner else 0,
            "maxTileNotInCorner": 0 if max_tile_in_corner else 1,
            "smoothness": self.calculate_smoothness(board),
            "monotonicity": self.calculate_monotonicity(board),
            "mergePotential": self.count_merge_potential(board),
            "cornerGradient": self.calculate_corner_gradient_score(board),
            "snakeScore": self.calculate_snake_score(board),
        }

    def count_empty_cells(self, board):
        count = 0

        for row in board:
            for value in row:
                if value == 0:
                    count += 1

        return count

    def get_max_tile(self, board):
        max_tile = 0

        for row in board:
            for value in row:
                max_tile = max(max_tile, value)

        return max_tile

    def is_max_tile_in_corner(self, board):
        max_tile = self.get_max_tile(board)
        last_index = len(board) - 1

        corners = [
            board[0][0],
            board[0][last_index],
            board[last_index][0],
            board[last_index][last_index],
        ]

        return max_tile in corners

    def calculate_smoothness(self, board):
        penalty = 0
        size = len(board)

        for row in range(size):
            for col in range(size):
                current = board[row][col]

                if current == 0:
                    continue

                right = board[row][col + 1] if col + 1 < size else 0
                down = board[row + 1][col] if row + 1 < size else 0

                if right != 0:
                    penalty += abs(math.log2(current) - math.log2(right))

                if down != 0:
                    penalty += abs(math.log2(current) - math.log2(down))

        return -penalty

    def calculate_monotonicity(self, board):
        size = len(board)
        row_score = 0
        col_score = 0

        for row in range(size):
            increasing = 0
            decreasing = 0

            for col in range(size - 1):
                current = 0 if board[row][col] == 0 else math.log2(board[row][col])
                next_value = (
                    0
                    if board[row][col + 1] == 0
                    else math.log2(board[row][col + 1])
                )

                if current > next_value:
                    decreasing += current - next_value
                else:
                    increasing += next_value - current

            row_score += max(increasing, decreasing)

        for col in range(size):
            increasing = 0
            decreasing = 0

            for row in range(size - 1):
                current = 0 if board[row][col] == 0 else math.log2(board[row][col])
                next_value = (
                    0
                    if board[row + 1][col] == 0
                    else math.log2(board[row + 1][col])
                )

                if current > next_value:
                    decreasing += current - next_value
                else:
                    increasing += next_value - current

            col_score += max(increasing, decreasing)

        return row_score + col_score

    def count_merge_potential(self, board):
        merge_count = 0
        size = len(board)

        for row in range(size):
            for col in range(size):
                current = board[row][col]

                if current == 0:
                    continue

                right = board[row][col + 1] if col + 1 < size else 0
                down = board[row + 1][col] if row + 1 < size else 0

                if current == right:
                    merge_count += 1

                if current == down:
                    merge_count += 1

        return merge_count

    def calculate_corner_gradient_score(self, board):
        size = len(board)
        max_tile = self.get_max_tile(board)

        if max_tile == 0:
            return 0

        corners = [
            {"row": 0, "col": 0},
            {"row": 0, "col": size - 1},
            {"row": size - 1, "col": 0},
            {"row": size - 1, "col": size - 1},
        ]

        best_score = float("-inf")

        for corner in corners:
            if board[corner["row"]][corner["col"]] != max_tile:
                continue

            score = 0

            for row in range(size):
                for col in range(size):
                    value = board[row][col]

                    if value == 0:
                        continue

                    distance_from_corner = abs(row - corner["row"]) + abs(
                        col - corner["col"]
                    )

                    tile_power = math.log2(value)
                    weight = math.pow(0.5, distance_from_corner)

                    score += tile_power * weight

            best_score = max(best_score, score)

        if best_score == float("-inf"):
            return 0

        return best_score

    def calculate_snake_score(self, board):
        size = len(board)
        patterns = self.build_snake_patterns(size)

        best_score = float("-inf")

        for pattern in patterns:
            score = 0

            for index, position in enumerate(pattern):
                row = position["row"]
                col = position["col"]
                value = board[row][col]

                if value == 0:
                    continue

                tile_power = math.log2(value)
                weight = len(pattern) - index

                score += tile_power * weight

            best_score = max(best_score, score)

        return best_score

    def build_snake_patterns(self, size):
        return [
            self.build_snake_pattern(size, "top-left"),
            self.build_snake_pattern(size, "top-right"),
            self.build_snake_pattern(size, "bottom-left"),
            self.build_snake_pattern(size, "bottom-right"),
        ]

    def build_snake_pattern(self, size, corner):
        rows = list(range(size))
        cols = list(range(size))

        if corner.startswith("bottom"):
            rows.reverse()

        pattern = []

        for row_index in range(size):
            row = rows[row_index]
            current_cols = cols[:]

            should_reverse = (
                (corner.endswith("left") and row_index % 2 == 1)
                or (corner.endswith("right") and row_index % 2 == 0)
            )

            if should_reverse:
                current_cols.reverse()

            for col in current_cols:
                pattern.append({"row": row, "col": col})

        return pattern