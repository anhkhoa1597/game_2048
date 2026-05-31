from env2048 import Env2048
from random_agent import RandomAgent
from heuristic_agent import HeuristicAgent


def play_one_game(agent, size=4, seed=None, max_steps=10000, log=False):
    env = Env2048(size=size, seed=seed)
    state = env.reset()

    steps = 0

    while not env.is_done() and steps < max_steps:
        action = agent.choose_action(env)

        if action is None:
            break

        state, reward, done, info = env.step(action)
        steps += 1

        if log:
            print(f"Step {steps} | action={action} | reward={reward} | score={info['score']} | maxTile={info['max_tile']}")

    return {
        "score": env.get_score(),
        "steps": steps,
        "max_tile": env.get_max_tile(),
        "win": env.get_max_tile() >= 2048,
        "final_board": env.get_state(),
    }


def evaluate_agent(agent_factory, games=100, size=4, base_seed=12345):
    results = []

    for game_index in range(games):
        seed = base_seed + game_index
        agent = agent_factory(seed)

        result = play_one_game(
            agent=agent,
            size=size,
            seed=seed,
            max_steps=10000,
            log=False,
        )

        results.append(result)

    total_score = sum(result["score"] for result in results)
    total_steps = sum(result["steps"] for result in results)
    win_count = sum(1 for result in results if result["win"])

    average_score = total_score / games
    average_steps = total_steps / games
    max_score = max(result["score"] for result in results)
    max_tile = max(result["max_tile"] for result in results)
    win_rate = win_count / games * 100

    tile_distribution = {}

    for result in results:
        tile = result["max_tile"]
        tile_distribution[tile] = tile_distribution.get(tile, 0) + 1

    return {
        "games": games,
        "size": size,
        "average_score": average_score,
        "max_score": max_score,
        "average_steps": average_steps,
        "max_tile": max_tile,
        "win_count": win_count,
        "win_rate": win_rate,
        "tile_distribution": tile_distribution,
        "raw_results": results,
    }


def print_summary(name, summary):
    print(f"\n{name} summary")
    print("-" * 40)
    print(f"Games: {summary['games']}")
    print(f"Board size: {summary['size']}x{summary['size']}")
    print(f"Average score: {summary['average_score']:.2f}")
    print(f"Max score: {summary['max_score']}")
    print(f"Average steps: {summary['average_steps']:.2f}")
    print(f"Max tile: {summary['max_tile']}")
    print(f"Win count: {summary['win_count']}")
    print(f"Win rate: {summary['win_rate']:.2f}%")
    print("Tile distribution:")

    for tile in sorted(summary["tile_distribution"].keys()):
        print(f"  {tile}: {summary['tile_distribution'][tile]}")


if __name__ == "__main__":
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