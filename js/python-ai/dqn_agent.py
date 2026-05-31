import torch

from dqn_model import DQN


class DQNAgent:
    def __init__(self, model_path, board_size=4, action_size=4, device=None):
        if device is None:
            device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        self.device = device
        self.model = DQN(board_size=board_size, action_size=action_size).to(self.device)

        state_dict = torch.load(model_path, map_location=self.device)
        self.model.load_state_dict(state_dict)
        self.model.eval()

    def choose_action(self, env):
        valid_actions = env.get_valid_actions()

        if len(valid_actions) == 0:
            return None

        state = env.encode_state()
        state_tensor = torch.tensor(
            state,
            dtype=torch.float32,
            device=self.device,
        ).unsqueeze(0)

        with torch.no_grad():
            q_values = self.model(state_tensor)[0]

        best_action = None
        best_q_value = float("-inf")

        for action in valid_actions:
            q_value = q_values[action].item()

            if q_value > best_q_value:
                best_q_value = q_value
                best_action = action

        return best_action