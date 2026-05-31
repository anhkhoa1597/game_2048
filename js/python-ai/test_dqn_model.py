import torch
from dqn_model import DQN


model = DQN(board_size=4, action_size=4)

dummy_state = torch.zeros((1, 4, 4), dtype=torch.float32)

q_values = model(dummy_state)

print("Q-values:", q_values)
print("Shape:", q_values.shape)