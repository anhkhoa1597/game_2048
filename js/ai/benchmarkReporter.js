import fs from "fs";
import path from "path";

function ensureDirectoryExists(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
}

function getTimestamp() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  const second = String(now.getSeconds()).padStart(2, "0");

  return `${year}${month}${day}-${hour}${minute}${second}`;
}

function buildSummaryRows(summaries) {
  return summaries.map((summary) => ({
    bot: summary.botName,
    seeds: summary.seeds ?? "",
    games: summary.games,
    size: `${summary.size}x${summary.size}`,
    averageScore: Math.round(summary.averageScore),
    maxScore: summary.maxScore,
    averageSteps: Math.round(summary.averageSteps),
    maxTile: summary.maxTile,
    winCount: summary.winCount,
    winRate: Number(summary.winRate.toFixed(2)),
    totalTimeMs: Math.round(summary.totalTimeMs),
    averageTimeMs: Math.round(summary.averageTimeMs),
    averageMoveMs: Number(summary.averageMoveMs.toFixed(3)),
  }));
}

function convertRowsToCsv(rows) {
  if (rows.length === 0) {
    return "";
  }

  const headers = Object.keys(rows[0]);

  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header];

          if (typeof value === "string" && value.includes(",")) {
            return `"${value}"`;
          }

          return value;
        })
        .join(",")
    ),
  ];

  return lines.join("\n");
}

export function saveBenchmarkReport(summaries, options = {}) {
  const {
    outputDir = "benchmark-results",
    filePrefix = "benchmark",
    includeRaw = true,
  } = options;

  ensureDirectoryExists(outputDir);

  const timestamp = getTimestamp();
  const summaryRows = buildSummaryRows(summaries);

  const jsonPath = path.join(outputDir, `${filePrefix}-${timestamp}.json`);
  const csvPath = path.join(outputDir, `${filePrefix}-${timestamp}.csv`);

  const jsonData = {
    createdAt: new Date().toISOString(),
    summary: summaryRows,
    details: includeRaw ? summaries : undefined,
  };

  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), "utf-8");
  fs.writeFileSync(csvPath, convertRowsToCsv(summaryRows), "utf-8");

  console.log(`Saved benchmark JSON: ${jsonPath}`);
  console.log(`Saved benchmark CSV: ${csvPath}`);

  return {
    jsonPath,
    csvPath,
  };
}