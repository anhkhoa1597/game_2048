import random
import math
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim

from env2048 import Env2048
from dqn_model import DQN
from replay_buffer import ReplayBuffer


DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def state_to_tensor(state):
    return torch.tensor(state, dtype=torch.float32, device=DEVICE).unsqueeze(0)


def count_empty_cells(board):
    count = 0

    for row in board:
        for value in row:
            if value == 0:
                count += 1

    return count


def get_max_tile(board):
    max_tile = 0

    for row in board:
        for value in row:
            max_tile = max(max_tile, value)

    return max_tile


def calculate_shaped_reward(previous_board, next_board, score_gained, done):
    reward = 0

    if score_gained > 0:
        reward += math.log2(score_gained)

    previous_empty = count_empty_cells(previous_board)
    next_empty = count_empty_cells(next_board)

    reward += (next_empty - previous_empty) * 0.2

    previous_max_tile = get_max_tile(previous_board)
    next_max_tile = get_max_tile(next_board)

    if next_max_tile > previous_max_tile:
        reward += math.log2(next_max_tile) * 0.5

    if done:
        reward -= 2

    return reward

def encode_board(board):
    encoded = []

    for row in board:
        encoded_row = []

        for value in row:
            if value == 0:
                encoded_row.append(0.0)
            else:
                encoded_row.append(math.log2(value) / 16)

        encoded.append(encoded_row)

    return encoded


def choose_action(env, policy_net, epsilon):
    valid_actions = env.get_valid_actions()

    if len(valid_actions) == 0:
        return None

    if random.random() < epsilon:
        return random.choice(valid_actions)

    state = encode_board(env.get_state())
    state_tensor = state_to_tensor(state)

    with torch.no_grad():
        q_values = policy_net(state_tensor)[0]

    best_action = None
    best_q_value = float("-inf")

    for action in valid_actions:
        q_value = q_values[action].item()

        if q_value > best_q_value:
            best_q_value = q_value
            best_action = action

    return best_action


def optimize_model(policy_net, target_net, replay_buffer, optimizer, batch_size, gamma):
    if len(replay_buffer) < batch_size:
        return None

    transitions = replay_buffer.sample(batch_size)

    states, actions, rewards, next_states, dones, next_valid_actions_list = zip(*transitions)

    states = torch.tensor(np.array(states), dtype=torch.float32, device=DEVICE)
    actions = torch.tensor(actions, dtype=torch.long, device=DEVICE).unsqueeze(1)
    rewards = torch.tensor(rewards, dtype=torch.float32, device=DEVICE).unsqueeze(1)
    next_states = torch.tensor(np.array(next_states), dtype=torch.float32, device=DEVICE)
    dones = torch.tensor(dones, dtype=torch.float32, device=DEVICE).unsqueeze(1)

    current_q_values = policy_net(states).gather(1, actions)

    with torch.no_grad():
        next_policy_q_values = policy_net(next_states)
        next_target_q_values = target_net(next_states)

        selected_next_q_values = []

        for i, valid_actions in enumerate(next_valid_actions_list):
            if len(valid_actions) == 0:
                selected_next_q_values.append(torch.tensor(0.0, device=DEVICE))
            else:
                valid_policy_q_values = next_policy_q_values[i, valid_actions]
                best_valid_index = valid_policy_q_values.argmax().item()
                best_action = valid_actions[best_valid_index]

                selected_q_value = next_target_q_values[i, best_action]
                selected_next_q_values.append(selected_q_value)

        next_q_values = torch.stack(selected_next_q_values).unsqueeze(1)

        target_q_values = rewards + gamma * next_q_values * (1 - dones)

    loss_fn = nn.SmoothL1Loss()
    loss = loss_fn(current_q_values, target_q_values)

    optimizer.zero_grad()
    loss.backward()

    torch.nn.utils.clip_grad_norm_(policy_net.parameters(), 1.0)

    optimizer.step()

    return loss.item()


def train_dqn():
    board_size = 4
    action_size = 4

    episodes = 1000
    max_steps = 10000

    batch_size = 64
    gamma = 0.99
    learning_rate = 1e-4

    replay_capacity = 50000
    min_replay_size = 1000

    epsilon_start = 1.0
    epsilon_end = 0.05
    epsilon_decay = 50000

    target_update_every = 1000
    save_every = 100

    output_dir = Path("models")
    output_dir.mkdir(exist_ok=True)

    policy_net = DQN(board_size=board_size, action_size=action_size).to(DEVICE)
    target_net = DQN(board_size=board_size, action_size=action_size).to(DEVICE)

    target_net.load_state_dict(policy_net.state_dict())
    target_net.eval()

    optimizer = optim.Adam(policy_net.parameters(), lr=learning_rate)
    replay_buffer = ReplayBuffer(capacity=replay_capacity, seed=42)

    global_step = 0
    best_score = 0

    for episode in range(1, episodes + 1):
        env = Env2048(size=board_size, seed=episode)
        state = env.reset()
        encoded_state = encode_board(state)

        episode_score = 0
        episode_loss = []
        max_tile = 0

        for step in range(max_steps):
            epsilon = epsilon_end + (epsilon_start - epsilon_end) * math.exp(
                -global_step / epsilon_decay
            )

            action = choose_action(env, policy_net, epsilon)

            if action is None:
                break

            previous_board = env.get_state()

            next_state, reward, done, info = env.step(action)
            encoded_next_state = encode_board(next_state)

            scaled_reward = calculate_shaped_reward(
                previous_board=previous_board,
                next_board=next_state,
                score_gained=reward,
                done=done,
            )

            replay_buffer.push(
                encoded_state,
                action,
                scaled_reward,
                encoded_next_state,
                done,
                info["valid_actions"],
            )

            encoded_state = encoded_next_state
            episode_score = info["score"]
            max_tile = info["max_tile"]

            if len(replay_buffer) >= min_replay_size:
                loss = optimize_model(
                    policy_net=policy_net,
                    target_net=target_net,
                    replay_buffer=replay_buffer,
                    optimizer=optimizer,
                    batch_size=batch_size,
                    gamma=gamma,
                )

                if loss is not None:
                    episode_loss.append(loss)

            global_step += 1

            if global_step % target_update_every == 0:
                target_net.load_state_dict(policy_net.state_dict())

            if done:
                break

        average_loss = (
            sum(episode_loss) / len(episode_loss)
            if len(episode_loss) > 0
            else 0
        )

        if episode_score > best_score:
            best_score = episode_score
            torch.save(policy_net.state_dict(), output_dir / "best_dqn.pt")

        if episode % save_every == 0:
            torch.save(policy_net.state_dict(), output_dir / f"dqn_episode_{episode}.pt")

        print(
            f"Episode {episode}/{episodes} | "
            f"score={episode_score} | "
            f"maxTile={max_tile} | "
            f"epsilon={epsilon:.3f} | "
            f"loss={average_loss:.4f} | "
            f"buffer={len(replay_buffer)}"
        )

    torch.save(policy_net.state_dict(), output_dir / "final_dqn.pt")

    print("Training finished.")
    print(f"Best score: {best_score}")
    print(f"Model saved to: {output_dir}")


if __name__ == "__main__":
    train_dqn()