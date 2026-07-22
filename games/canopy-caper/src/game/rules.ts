import type { LevelData } from './levels';

export interface GameState {
  readonly collectedFruits: ReadonlySet<number>;
  readonly checkpointIndex: number;
  readonly completed: boolean;
}

export type FruitState = GameState;

/**
 * Create a fresh game state for the given level.
 * Checkpoint -1 means "start position"; indices ≥0 use the level's
 * checkpoints array.
 */
export function createGameState(_level: LevelData): GameState {
  return {
    collectedFruits: new Set<number>(),
    checkpointIndex: -1,
    completed: false,
  };
}

/**
 * Return a new state with the given fruit index marked collected.
 * Collecting the same fruit twice is a no-op (returns an equivalent state).
 * Does not mutate the original state.
 */
export function collectFruit(state: GameState, index: number): GameState {
  if (state.collectedFruits.has(index)) return state;
  return {
    ...state,
    collectedFruits: new Set(state.collectedFruits).add(index),
  };
}

/**
 * Return a new state with the latest checkpoint set to the given index.
 * Only moves the checkpoint forward (higher index) so the player can't
 * accidentally regress by touching an earlier checkpoint.
 */
export function reachCheckpoint(state: GameState, index: number): GameState {
  if (index <= state.checkpointIndex) return state;
  return { ...state, checkpointIndex: index };
}

/** Mark the game as completed. */
export function completeGame(state: GameState): GameState {
  if (state.completed) return state;
  return { ...state, completed: true };
}

export function isComplete(state: GameState): boolean {
  return state.completed;
}

/**
 * Return the respawn position for the current checkpoint.
 * Index -1 → level start. Otherwise the corresponding checkpoint.
 */
export function getRespawnPoint(level: LevelData, state: GameState): { x: number; y: number } {
  if (state.checkpointIndex < 0) {
    return { x: level.startX, y: level.startY };
  }
  const checkpoint = level.checkpoints[state.checkpointIndex];
  if (checkpoint === undefined) {
    return { x: level.startX, y: level.startY };
  }
  return { x: checkpoint.x, y: checkpoint.y };
}

/** Total fruit collected so far. */
export function fruitCount(state: GameState): number {
  return state.collectedFruits.size;
}