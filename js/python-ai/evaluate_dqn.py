from pathlib import Path

from dqn_agent import DQNAgent
from random_agent import RandomAgent
from heuristic_agent import HeuristicAgent
from evaluate_agent import evaluate_agent, print_summary


if __name__ == "__main__":
    model_path = Path("models/best_dqn.pt")

    random_summary = evaluate_agent(
        agent_factory=lambda seed: RandomAgent(seed=seed),
        games=100,
        size=4,
        base_seed=20260530,
    )

    print_summary("RandomAgent", random_summary)

    heuristic_summary = evaluate_agent(
        agent_factory=lambda seed: HeuristicAgent(),
        games=100,
        size=4,
        base_seed=20260530,
    )

    print_summary("HeuristicAgent", heuristic_summary)

    if model_path.exists():
        dqn_summary = evaluate_agent(
            agent_factory=lambda seed: DQNAgent(
                model_path=model_path,
                board_size=4,
                action_size=4,
            ),
            games=100,
            size=4,
            base_seed=20260530,
        )

        print_summary("DQNAgent", dqn_summary)
    else:
        print("DQN model not found. Run train_dqn.py first.")