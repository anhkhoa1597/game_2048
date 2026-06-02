import fs from "fs";
import readline from "readline";

const CONFIG = {
  inputFile: "expert_championBeam3_100games_v1.jsonl",
};

const LABEL_TO_MOVE = {
  0: "up",
  1: "right",
  2: "down",
  3: "left",
};

function getGamePhase(maxTile) {
  if (maxTile < 256) return "early";
  if (maxTile < 1024) return "mid";
  return "late";
}

function getDangerLevel(emptyCells) {
  if (emptyCells <= 2) return "critical";
  if (emptyCells <= 4) return "danger";
  if (emptyCells <= 7) return "normal";
  return "safe";
}

function createEmptyMoveCounts() {
  return {
    up: 0,
    right: 0,
    down: 0,
    left: 0,
  };
}

async function analyzeExpertDataset(config = CONFIG) {
  const stream = fs.createReadStream(config.inputFile);

  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  });

  const stats = {
    totalSamples: 0,
    invalidSamples: 0,

    moveCounts: createEmptyMoveCounts(),

    phaseCounts: {
      early: 0,
      mid: 0,
      late: 0,
    },

    dangerCounts: {
      critical: 0,
      danger: 0,
      normal: 0,
      safe: 0,
    },

    phaseMoveCounts: {
      early: createEmptyMoveCounts(),
      mid: createEmptyMoveCounts(),
      late: createEmptyMoveCounts(),
    },

    dangerMoveCounts: {
      critical: createEmptyMoveCounts(),
      danger: createEmptyMoveCounts(),
      normal: createEmptyMoveCounts(),
      safe: createEmptyMoveCounts(),
    },

    maxTileCounts: {},
    emptyCellCounts: {},
  };

  for await (const line of rl) {
    if (!line.trim()) continue;

    let sample;

    try {
      sample = JSON.parse(line);
    } catch {
      stats.invalidSamples++;
      continue;
    }

    stats.totalSamples++;

    const { x, y, meta } = sample;

    const isValidX = Array.isArray(x) && x.length === 16;
    const isValidY = Number.isInteger(y) && y >= 0 && y <= 3;
    const hasMeta = meta && typeof meta === "object";

    if (!isValidX || !isValidY || !hasMeta) {
      stats.invalidSamples++;
      continue;
    }

    const move = LABEL_TO_MOVE[y];
    const maxTile = meta.maxTile;
    const emptyCells = meta.emptyCells;

    const phase = getGamePhase(maxTile);
    const dangerLevel = getDangerLevel(emptyCells);

    stats.moveCounts[move]++;

    stats.phaseCounts[phase]++;
    stats.dangerCounts[dangerLevel]++;

    stats.phaseMoveCounts[phase][move]++;
    stats.dangerMoveCounts[dangerLevel][move]++;

    stats.maxTileCounts[maxTile] = (stats.maxTileCounts[maxTile] || 0) + 1;
    stats.emptyCellCounts[emptyCells] =
      (stats.emptyCellCounts[emptyCells] || 0) + 1;
  }

  printStats(stats);

  return stats;
}

function toPercent(value, total) {
  if (total === 0) return "0.00%";
  return `${((value / total) * 100).toFixed(2)}%`;
}

function printMoveCounts(title, moveCounts, total) {
  console.log(`\n${title}`);

  for (const move of ["up", "right", "down", "left"]) {
    console.log(
      `${move.padEnd(5)} ${String(moveCounts[move]).padStart(8)}  ${toPercent(
        moveCounts[move],
        total,
      )}`,
    );
  }
}

function printStats(stats) {
  console.log("\nDataset analysis");
  console.log("----------------------------------------");
  console.log(`Total samples : ${stats.totalSamples}`);
  console.log(`Invalid       : ${stats.invalidSamples}`);

  printMoveCounts("Move distribution", stats.moveCounts, stats.totalSamples);

  console.log("\nPhase distribution");
  for (const phase of ["early", "mid", "late"]) {
    console.log(
      `${phase.padEnd(8)} ${String(stats.phaseCounts[phase]).padStart(
        8,
      )}  ${toPercent(stats.phaseCounts[phase], stats.totalSamples)}`,
    );
  }

  console.log("\nDanger distribution");
  for (const danger of ["critical", "danger", "normal", "safe"]) {
    console.log(
      `${danger.padEnd(8)} ${String(stats.dangerCounts[danger]).padStart(
        8,
      )}  ${toPercent(stats.dangerCounts[danger], stats.totalSamples)}`,
    );
  }

  console.log("\nMove by phase");
  for (const phase of ["early", "mid", "late"]) {
    printMoveCounts(
      `Phase: ${phase}`,
      stats.phaseMoveCounts[phase],
      stats.phaseCounts[phase],
    );
  }

  console.log("\nMove by danger level");
  for (const danger of ["critical", "danger", "normal", "safe"]) {
    printMoveCounts(
      `Danger: ${danger}`,
      stats.dangerMoveCounts[danger],
      stats.dangerCounts[danger],
    );
  }

  console.log("\nMax tile counts");
  console.table(stats.maxTileCounts);

  console.log("\nEmpty cell counts");
  console.table(stats.emptyCellCounts);
}

analyzeExpertDataset();