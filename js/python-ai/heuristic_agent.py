import math


class HeuristicAgent:
    def choose_action(self, env):
        valid_actions = env.get_valid_actions()

        if len(valid_actions) == 0:
            return None

        best_action = None
        best_score = float("-inf")

        for action in valid_actions:
            direction = env.action_to_direction(action)
            result = env.simulate_move(env.get_state(), direction)

            score = self.evaluate_board(
                result["board"],
                result["score_gained"],
            )

            if score > best_score:
                best_score = score
                best_action = action

        return best_action

    def evaluate_board(self, board, score_gained=0):
        empty_cells = self.count_empty_cells(board)
        max_tile = self.get_max_tile(board)
        max_tile_in_corner = self.is_max_tile_in_corner(board)
        smoothness = self.calculate_smoothness(board)
        merge_potential = self.count_merge_potential(board)

        board_score = 0

        board_score += empty_cells * 100
        board_score += score_gained * 1.2
        board_score += max_tile * 0.2
        board_score += smoothness * 8
        board_score += merge_potential * 60

        if max_tile_in_corner:
            board_score += max_tile * 6
        else:
            board_score -= max_tile * 3

        return board_score

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