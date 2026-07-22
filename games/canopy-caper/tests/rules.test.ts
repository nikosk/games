import { describe, expect, it } from 'vitest';
import { AUTHORED_CLIMB } from '../src/game/levels';
import {
  collectFruit,
  completeGame,
  createGameState,
  fruitCount,
  getRespawnPoint,
  isComplete,
  reachCheckpoint,
  type GameState,
} from '../src/game/rules';

function freshState(): GameState {
  return createGameState(AUTHORED_CLIMB);
}

describe('createGameState', () => {
  it('starts with no collected fruits, checkpoint -1 and not complete', () => {
    const state = freshState();
    expect(state.collectedFruits.size).toBe(0);
    expect(state.checkpointIndex).toBe(-1);
    expect(state.completed).toBe(false);
  });
});

describe('collectFruit', () => {
  it('returns a new state that marks the fruit collected', () => {
    const state = freshState();
    const next = collectFruit(state, 0);
    expect(next.collectedFruits.has(0)).toBe(true);
    expect(state.collectedFruits.has(0)).toBe(false);
  });

  it('does not mutate the original state', () => {
    const state = freshState();
    const snapshot = state.collectedFruits;
    const next = collectFruit(state, 1);
    expect(state.collectedFruits).toBe(snapshot);
    expect(next.collectedFruits).not.toBe(snapshot);
  });

  it('collecting the same fruit twice is a no-op', () => {
    const state = collectFruit(freshState(), 2);
    const next = collectFruit(state, 2);
    expect(next).toBe(state);
  });

  it('counts fruits with fruitCount', () => {
    let state = freshState();
    state = collectFruit(state, 0);
    state = collectFruit(state, 1);
    expect(fruitCount(state)).toBe(2);
  });
});

describe('reachCheckpoint', () => {
  it('advances the checkpoint index only forward', () => {
    let state = freshState();
    state = reachCheckpoint(state, 0);
    expect(state.checkpointIndex).toBe(0);
    state = reachCheckpoint(state, 1);
    expect(state.checkpointIndex).toBe(1);
    state = reachCheckpoint(state, 0);
    expect(state.checkpointIndex).toBe(1);
  });

  it('returns the same instance for a non-advancing checkpoint', () => {
    const state = reachCheckpoint(freshState(), 2);
    const next = reachCheckpoint(state, 1);
    expect(next).toBe(state);
  });
});

describe('isComplete', () => {
  it('returns false until completeGame is called', () => {
    let state = freshState();
    state = collectFruit(state, 0);
    state = reachCheckpoint(state, 1);
    expect(isComplete(state)).toBe(false);
    state = completeGame(state);
    expect(isComplete(state)).toBe(true);
  });
});

describe('getRespawnPoint', () => {
  it('returns the start position when no checkpoint is set', () => {
    const state = freshState();
    const spawn = getRespawnPoint(AUTHORED_CLIMB, state);
    expect(spawn.x).toBe(AUTHORED_CLIMB.startX);
    expect(spawn.y).toBe(AUTHORED_CLIMB.startY);
  });

  it('returns each checkpoint position once reached', () => {
    let state = reachCheckpoint(freshState(), 0);
    expect(getRespawnPoint(AUTHORED_CLIMB, state)).toEqual({
      x: AUTHORED_CLIMB.checkpoints[0]!.x,
      y: AUTHORED_CLIMB.checkpoints[0]!.y,
    });
    state = reachCheckpoint(state, 1);
    expect(getRespawnPoint(AUTHORED_CLIMB, state)).toEqual({
      x: AUTHORED_CLIMB.checkpoints[1]!.x,
      y: AUTHORED_CLIMB.checkpoints[1]!.y,
    });
  });

  it('falls back to start when checkpoint index is out of range', () => {
    const state = reachCheckpoint(freshState(), 99);
    expect(getRespawnPoint(AUTHORED_CLIMB, state)).toEqual({
      x: AUTHORED_CLIMB.startX,
      y: AUTHORED_CLIMB.startY,
    });
  });
});