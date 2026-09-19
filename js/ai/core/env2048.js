import {
  cloneBoard,
  getEmptyCells,
  getValidMoves,
  simulateMove,
} from "./boardSimulator.js";

const DEFAULT_SIZE = 4;

export class Env2048 {
  constructor(size = DEFAULT_SIZE, options = {}) {
    this.size = size;
    this.random = options.random || Math.random;
    this.board = this.createEmptyBoard();
    this.score = 0;
    this.done = false;
  }

  createEmptyBoard() {
    return Array.from({ length: this.size }, () => Array(this.size).fill(0));
  }

  reset() {
    this.board = this.createEmptyBoard();
    this.score = 0;
    this.done = false;

    this.addRandomTile();
    this.addRandomTile();

    return this.getState();
  }

  getState() {
    return cloneBoard(this.board);
  }

  getScore() {
    return this.score;
  }

  isDone() {
    return this.done;
  }

  getValidActions() {
    return getValidMoves(this.board);
  }

  step(action) {
    if (this.done) {
      return {
        state: this.getState(),
        reward: 0,
        done: true,
        score: this.score,
        moved: false,
      };
    }

    const validActions = this.getValidActions();

    if (!validActions.includes(action)) {
      return {
        state: this.getState(),
        reward: -10,
        done: this.done,
        score: this.score,
        moved: false,
      };
    }

    const result = simulateMove(this.board, action);

    this.board = result.board;
    this.score += result.scoreGained;

    this.addRandomTile();

    if (this.getValidActions().length === 0) {
      this.done = true;
    }

    return {
      state: this.getState(),
      reward: result.scoreGained,
      done: this.done,
      score: this.score,
      moved: result.moved,
    };
  }

  addRandomTile() {
    const emptyCells = getEmptyCells(this.board);

    if (emptyCells.length === 0) return;

    const randomIndex = Math.floor(this.random() * emptyCells.length);
    const cell = emptyCells[randomIndex];

    this.board[cell.row][cell.col] = this.random() < 0.9 ? 2 : 4;
  }
}
