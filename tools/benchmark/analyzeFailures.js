import fs from "fs";
import path from "path";

const DEFAULT_REPORT_DIR = "benchmark-results";

function getMaxTile(board) {
  let maxTile = 0;

  for (const row of board) {
    for (const value of row) {
      if (value > maxTile) {
        maxTile = value;
      }
    }
  }

  return maxTile;
}

function getTilePositions(board, targetValue) {
  const positions = [];

  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      if (board[row][col] === targetValue) {
        positions.push({ row, col });
      }
    }
  }

  return positions;
}

function isCorner(board, position) {
  const lastIndex = board.length - 1;

  return (
    (position.row === 0 && position.col === 0) ||
    (position.row === 0 && position.col === lastIndex) ||
    (position.row === lastIndex && position.col === 0) ||
    (position.row === lastIndex && position.col === lastIndex)
  );
}

function getCornerName(board, position) {
  const lastIndex = board.length - 1;

  if (position.row === 0 && position.col === 0) {
    return "top-left";
  }

  if (position.row === 0 && position.col === lastIndex) {
    return "top-right";
  }

  if (position.row === lastIndex && position.col === 0) {
    return "bottom-left";
  }

  if (position.row === lastIndex && position.col === lastIndex) {
    return "bottom-right";
  }

  return "not-corner";
}

function getSecondMaxTile(board, maxTile) {
  let secondMax = 0;

  for (const row of board) {
    for (const value of row) {
      if (value !== maxTile && value > secondMax) {
        secondMax = value;
      }
    }
  }

  return secondMax;
}

function areAdjacent(a, b) {
  const rowDistance = Math.abs(a.row - b.row);
  const colDistance = Math.abs(a.col - b.col);

  return rowDistance + colDistance === 1;
}

function isSecondMaxNearMax(board, maxTile, secondMaxTile) {
  if (maxTile === 0 || secondMaxTile === 0) {
    return false;
  }

  const maxPositions = getTilePositions(board, maxTile);
  const secondPositions = getTilePositions(board, secondMaxTile);

  for (const maxPosition of maxPositions) {
    for (const secondPosition of secondPositions) {
      if (areAdjacent(maxPosition, secondPosition)) {
        return true;
      }
    }
  }

  return false;
}

function countEmptyCells(board) {
  let count = 0;

  for (const row of board) {
    for (const value of row) {
      if (value === 0) {
        count++;
      }
    }
  }

  return count;
}

function createEmptyStats(botName) {
  return {
    botName,
    totalGames: 0,
    winCount: 0,
    failCount: 0,
    failRate: 0,

    failByMaxTile: {},
    failMaxTileInCorner: 0,
    failMaxTileNotInCorner: 0,

    failCornerDistribution: {
      "top-left": 0,
      "top-right": 0,
      "bottom-left": 0,
      "bottom-right": 0,
      "not-corner": 0,
    },

    secondMaxNearMaxCount: 0,
    secondMaxNotNearMaxCount: 0,

    averageFailScore: 0,
    averageFailSteps: 0,
    averageFailEmptyCells: 0,

    worstFailures: [],
  };
}

function collectRawResults(botDetail) {
  const rawResults = [];

  if (Array.isArray(botDetail.rawResults)) {
    rawResults.push(...botDetail.rawResults);
  }

  if (Array.isArray(botDetail.seedResults)) {
    for (const seedResult of botDetail.seedResults) {
      if (Array.isArray(seedResult.rawResults)) {
        rawResults.push(...seedResult.rawResults);
      }
    }
  }

  return rawResults;
}

function analyzeBotDetail(botDetail) {
  const rawResults = collectRawResults(botDetail);
  const stats = createEmptyStats(botDetail.botName);

  stats.totalGames = rawResults.length;

  let totalFailScore = 0;
  let totalFailSteps = 0;
  let totalFailEmptyCells = 0;

  for (const game of rawResults) {
    if (game.win) {
      stats.winCount++;
      continue;
    }

    stats.failCount++;

    const board = game.board;
    const maxTile = game.maxTile ?? getMaxTile(board);
    const maxPositions = getTilePositions(board, maxTile);
    const maxPosition = maxPositions[0];

    const secondMaxTile = getSecondMaxTile(board, maxTile);
    const secondNearMax = isSecondMaxNearMax(board, maxTile, secondMaxTile);

    const maxInCorner = maxPosition ? isCorner(board, maxPosition) : false;
    const cornerName = maxPosition
      ? getCornerName(board, maxPosition)
      : "not-corner";

    stats.failByMaxTile[maxTile] = (stats.failByMaxTile[maxTile] || 0) + 1;

    if (maxInCorner) {
      stats.failMaxTileInCorner++;
    } else {
      stats.failMaxTileNotInCorner++;
    }

    stats.failCornerDistribution[cornerName]++;

    if (secondNearMax) {
      stats.secondMaxNearMaxCount++;
    } else {
      stats.secondMaxNotNearMaxCount++;
    }

    totalFailScore += game.score;
    totalFailSteps += game.steps;
    totalFailEmptyCells += countEmptyCells(board);

    stats.worstFailures.push({
      score: game.score,
      steps: game.steps,
      maxTile,
      secondMaxTile,
      secondNearMax,
      maxInCorner,
      cornerName,
      board,
    });
  }

  stats.failRate =
    stats.totalGames > 0 ? (stats.failCount / stats.totalGames) * 100 : 0;

  stats.averageFailScore =
    stats.failCount > 0 ? totalFailScore / stats.failCount : 0;

  stats.averageFailSteps =
    stats.failCount > 0 ? totalFailSteps / stats.failCount : 0;

  stats.averageFailEmptyCells =
    stats.failCount > 0 ? totalFailEmptyCells / stats.failCount : 0;

  stats.worstFailures.sort((a, b) => {
    if (a.maxTile !== b.maxTile) {
      return a.maxTile - b.maxTile;
    }

    return a.score - b.score;
  });

  stats.worstFailures = stats.worstFailures.slice(0, 10);

  return stats;
}

function findLatestJsonReport(reportDir = DEFAULT_REPORT_DIR) {
  if (!fs.existsSync(reportDir)) {
    return null;
  }

  const files = fs
    .readdirSync(reportDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => path.join(reportDir, file))
    .sort((a, b) => {
      const aTime = fs.statSync(a).mtimeMs;
      const bTime = fs.statSync(b).mtimeMs;

      return bTime - aTime;
    });

  return files[0] ?? null;
}

function loadReport(filePath) {
  const rawData = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(rawData);
}

function printSummary(statsList) {
  console.log("\nFailure Summary");
  console.log("----------------------------------------");

  const tableRows = statsList.map((stats) => ({
    bot: stats.botName,
    games: stats.totalGames,
    wins: stats.winCount,
    fails: stats.failCount,
    failRate: `${stats.failRate.toFixed(2)}%`,
    avgFailScore: Math.round(stats.averageFailScore),
    avgFailSteps: Math.round(stats.averageFailSteps),
    avgFailEmpty: Number(stats.averageFailEmptyCells.toFixed(2)),
    maxInCornerFails: stats.failMaxTileInCorner,
    maxNotCornerFails: stats.failMaxTileNotInCorner,
    secondNearMax: stats.secondMaxNearMaxCount,
    secondNotNearMax: stats.secondMaxNotNearMaxCount,
  }));

  console.table(tableRows);
}

function printDetailedStats(statsList) {
  for (const stats of statsList) {
    console.log(`\n${stats.botName} failure by max tile`);
    console.table(stats.failByMaxTile);

    console.log(`${stats.botName} failed max tile corner distribution`);
    console.table(stats.failCornerDistribution);

    console.log(`${stats.botName} worst 10 failures`);
    for (const failure of stats.worstFailures) {
      console.log("----------------------------------------");
      console.log({
        score: failure.score,
        steps: failure.steps,
        maxTile: failure.maxTile,
        secondMaxTile: failure.secondMaxTile,
        secondNearMax: failure.secondNearMax,
        maxInCorner: failure.maxInCorner,
        cornerName: failure.cornerName,
      });

      for (const row of failure.board) {
        console.log(row);
      }
    }
  }
}

function main() {
  const inputPath = process.argv[2];
  const reportPath = inputPath || findLatestJsonReport();

  if (!reportPath) {
    console.error("No benchmark JSON report found.");
    console.error("Usage:");
    console.error(
      "  node analyzeFailures.js benchmark-results/your-report.json",
    );
    process.exit(1);
  }

  console.log(`Reading benchmark report: ${reportPath}`);

  const report = loadReport(reportPath);

  if (!Array.isArray(report.details)) {
    console.error("Invalid report format: missing details array.");
    process.exit(1);
  }

  const statsList = report.details.map((botDetail) =>
    analyzeBotDetail(botDetail),
  );

  printSummary(statsList);
  printDetailedStats(statsList);
}

main();
