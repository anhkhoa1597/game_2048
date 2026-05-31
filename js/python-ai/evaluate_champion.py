from champion_agent import ChampionAgent
from evaluate_agent import evaluate_agent, print_summary


if __name__ == "__main__":
    summary = evaluate_agent(
        agent_factory=lambda seed: ChampionAgent(depth=2),
        games=100,
        size=4,
        base_seed=20260530,
    )

    print_summary("ChampionAgent", summary)