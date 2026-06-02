export const MOVE_TO_LABEL = {
  up: 0,
  right: 1,
  down: 2,
  left: 3,
};

export const LABEL_TO_MOVE = {
  0: "up",
  1: "right",
  2: "down",
  3: "left",
};

export function moveToLabel(move) {
  if (!(move in MOVE_TO_LABEL)) {
    throw new Error(`Unknown move: ${move}`);
  }

  return MOVE_TO_LABEL[move];
}

export function labelToMove(label) {
  if (!(label in LABEL_TO_MOVE)) {
    throw new Error(`Unknown label: ${label}`);
  }

  return LABEL_TO_MOVE[label];
}