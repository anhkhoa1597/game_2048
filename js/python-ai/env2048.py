import math
import random
from copy import deepcopy


ACTIONS = {
    0: "up",
    1: "down",
    2: "left",
    3: "right",
}

DIRECTIONS = ["up", "down", "left", "right"]


class Env2048:
    def __init__(self, size=4, seed=None):
        self.size = size
        self.random = random.Random(seed)
        self.board = self.create_empty_board()
        self.score = 0
        self.done = False

    def create_empty_board(self):
        return [[0 for _ in range(self.size)] for _ in range(self.size)]

    def reset(self):
        self.board = self.create_empty_board()
        self.score = 0
        self.done = False

        self.add_random_tile()
        self.add_random_tile()

        return self.get_state()

    def get_state(self):
        return deepcopy(self.board)

    def get_score(self):
        return self.score

    def is_done(self):
        return self.done

    def step(self, action):
        direction = self.action_to_direction(action)

        if self.done:
            return self.get_state(), 0, True, {
                "score": self.score,
                "moved": False,
                "max_tile": self.get_max_tile(),
                "valid_actions": [],
            }

        valid_actions = self.get_valid_actions()

        if action not in valid_actions:
            return self.get_state(), -10, self.done, {
                "score": self.score,
                "moved": False,
                "max_tile": self.get_max_tile(),
                "valid_actions": valid_actions,
            }

        result = self.simulate_move(self.board, direction)

        self.board = result["board"]
        self.score += result["score_gained"]

        self.add_random_tile()

        if len(self.get_valid_actions()) == 0:
            self.done = True

        reward = result["score_gained"]

        return self.get_state(), reward, self.done, {
            "score": self.score,
            "moved": result["moved"],
            "max_tile": self.get_max_tile(),
            "valid_actions": self.get_valid_actions(),
        }

    def action_to_direction(self, action):
        if isinstance(action, str):
            if action not in DIRECTIONS:
                raise ValueError(f"Invalid direction: {action}")
            return action

        if action not in ACTIONS:
            raise ValueError(f"Invalid action: {action}")

        return ACTIONS[action]

    def direction_to_action(self, direction):
        for action, action_direction in ACTIONS.items():
            if action_direction == direction:
                return action

        raise ValueError(f"Invalid direction: {direction}")

    def get_valid_actions(self):
        valid_actions = []

        for action, direction in ACTIONS.items():
            result = self.simulate_move(self.board, direction)

            if result["moved"]:
                valid_actions.append(action)

        return valid_actions

    def add_random_tile(self):
        empty_cells = self.get_empty_cells(self.board)

        if len(empty_cells) == 0:
            return

        row, col = self.random.choice(empty_cells)
        self.board[row][col] = 2 if self.random.random() < 0.9 else 4

    def get_empty_cells(self, board):
        empty_cells = []

        for row in range(len(board)):
            for col in range(len(board[row])):
                if board[row][col] == 0:
                    empty_cells.append((row, col))

        return empty_cells

    def get_max_tile(self):
        max_tile = 0

        for row in self.board:
            for value in row:
                max_tile = max(max_tile, value)

        return max_tile

    def encode_state(self):
        encoded = []

        for row in self.board:
            encoded_row = []

            for value in row:
                if value == 0:
                    encoded_row.append(0.0)
                else:
                    encoded_row.append(math.log2(value) / 16)

            encoded.append(encoded_row)

        return encoded

    def clone_board(self, board):
        return [row[:] for row in board]

    def boards_are_equal(self, board_a, board_b):
        if len(board_a) != len(board_b):
            return False

        for row in range(len(board_a)):
            for col in range(len(board_a[row])):
                if board_a[row][col] != board_b[row][col]:
                    return False

        return True

    def slide_line_left(self, line):
        numbers = [value for value in line if value != 0]

        while len(numbers) < len(line):
            numbers.append(0)

        return numbers

    def merge_line_left(self, line):
        result = []
        score_gained = 0

        i = 0
        while i < len(line):
            current = line[i]
            next_value = line[i + 1] if i + 1 < len(line) else None

            if current != 0 and current == next_value:
                merged_value = current * 2
                result.append(merged_value)
                score_gained += merged_value
                i += 2
            else:
                result.append(current)
                i += 1

        while len(result) < len(line):
            result.append(0)

        return {
            "line": result,
            "score_gained": score_gained,
        }

    def move_line_left(self, line):
        slided_line = self.slide_line_left(line)
        return self.merge_line_left(slided_line)

    def move_line_right(self, line):
        reversed_line = list(reversed(line))
        result = self.move_line_left(reversed_line)

        return {
            "line": list(reversed(result["line"])),
            "score_gained": result["score_gained"],
        }

    def get_column(self, board, col):
        return [board[row][col] for row in range(len(board))]

    def set_column(self, board, col, column):
        for row in range(len(board)):
            board[row][col] = column[row]

    def move_board_left(self, board):
        new_board = []
        total_score_gained = 0

        for row in board:
            result = self.move_line_left(row)
            new_board.append(result["line"])
            total_score_gained += result["score_gained"]

        return {
            "board": new_board,
            "score_gained": total_score_gained,
        }

    def move_board_right(self, board):
        new_board = []
        total_score_gained = 0

        for row in board:
            result = self.move_line_right(row)
            new_board.append(result["line"])
            total_score_gained += result["score_gained"]

        return {
            "board": new_board,
            "score_gained": total_score_gained,
        }

    def move_board_up(self, board):
        new_board = self.clone_board(board)
        total_score_gained = 0

        for col in range(len(board)):
            column = self.get_column(new_board, col)
            result = self.move_line_left(column)

            self.set_column(new_board, col, result["line"])
            total_score_gained += result["score_gained"]

        return {
            "board": new_board,
            "score_gained": total_score_gained,
        }

    def move_board_down(self, board):
        new_board = self.clone_board(board)
        total_score_gained = 0

        for col in range(len(board)):
            column = self.get_column(new_board, col)
            reversed_column = list(reversed(column))

            result = self.move_line_left(reversed_column)
            final_column = list(reversed(result["line"]))

            self.set_column(new_board, col, final_column)
            total_score_gained += result["score_gained"]

        return {
            "board": new_board,
            "score_gained": total_score_gained,
        }

    def simulate_move(self, board, direction):
        if direction == "left":
            result = self.move_board_left(board)
        elif direction == "right":
            result = self.move_board_right(board)
        elif direction == "up":
            result = self.move_board_up(board)
        elif direction == "down":
            result = self.move_board_down(board)
        else:
            raise ValueError(f"Invalid direction: {direction}")

        return {
            "board": result["board"],
            "score_gained": result["score_gained"],
            "moved": not self.boards_are_equal(board, result["board"]),
        }


if __name__ == "__main__":
    env = Env2048(size=4, seed=42)
    state = env.reset()

    print("Initial board:")
    for row in state:
        print(row)

    print("Valid actions:", env.get_valid_actions())

    next_state, reward, done, info = env.step(2)

    print("After action left:")
    for row in next_state:
        print(row)

    print("Reward:", reward)
    print("Done:", done)
    print("Info:", info)