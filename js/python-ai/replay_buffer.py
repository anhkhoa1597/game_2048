import random
from collections import deque


class ReplayBuffer:
    def __init__(self, capacity=50000, seed=None):
        self.buffer = deque(maxlen=capacity)
        self.random = random.Random(seed)

    def push(self, state, action, reward, next_state, done, next_valid_actions):
        self.buffer.append(
            (state, action, reward, next_state, done, next_valid_actions)
        )

    def sample(self, batch_size):
        return self.random.sample(self.buffer, batch_size)

    def __len__(self):
        return len(self.buffer)