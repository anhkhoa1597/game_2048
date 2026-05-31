import torch
import torch.nn as nn


class DQN(nn.Module):
    def __init__(self, board_size=4, action_size=4):
        super().__init__()

        input_size = board_size * board_size

        self.feature_layer = nn.Sequential(
            nn.Linear(input_size, 256),
            nn.ReLU(),

            nn.Linear(256, 256),
            nn.ReLU(),
        )

        self.value_stream = nn.Sequential(
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Linear(128, 1),
        )

        self.advantage_stream = nn.Sequential(
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Linear(128, action_size),
        )

    def forward(self, x):
        x = x.view(x.size(0), -1)

        features = self.feature_layer(x)

        value = self.value_stream(features)
        advantage = self.advantage_stream(features)

        q_values = value + advantage - advantage.mean(dim=1, keepdim=True)

        return q_values