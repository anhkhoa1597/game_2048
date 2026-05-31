import random


class RandomAgent:
    def __init__(self, seed=None):
        self.random = random.Random(seed)

    def choose_action(self, env):
        valid_actions = env.get_valid_actions()

        if len(valid_actions) == 0:
            return None

        return self.random.choice(valid_actions)