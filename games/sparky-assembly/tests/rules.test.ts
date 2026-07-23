import { describe, expect, it } from 'vitest';
import { executeStep, isSolved, facingCell, type FloorState } from '../src/game/rules';
import { turnLeft, turnRight, type Direction } from '../src/game/direction';
import { FIRST_LEVEL, initialState } from '../src/game/level';

const COLS = FIRST_LEVEL.cols;
const ROWS = FIRST_LEVEL.rows;

function at(x: number, y: number, direction: 0 | 1 | 2 | 3 = 1): FloorState {
  return { robot: { x, y, direction }, crate: { ...FIRST_LEVEL.crate }, holding: false };
}

describe('turn helpers', () => {
  it('turns left and right through all four directions', () => {
    expect(turnLeft(1)).toBe(0);
    expect(turnLeft(0)).toBe(3);
    expect(turnRight(1)).toBe(2);
    expect(turnRight(3)).toBe(0);
    let d: Direction = 0;
    for (let i = 0; i < 4; i += 1) d = turnLeft(d);
    expect(d).toBe(0);
    d = 0;
    for (let i = 0; i < 4; i += 1) d = turnRight(d);
    expect(d).toBe(0);
  });
});

describe('facingCell', () => {
  it('returns the next cell in the facing direction', () => {
    expect(facingCell({ x: 2, y: 2, direction: 1 }, COLS, ROWS)).toEqual({ x: 3, y: 2 });
    expect(facingCell({ x: 0, y: 2, direction: 3 }, COLS, ROWS)).toBeNull();
    expect(facingCell({ x: 0, y: 0, direction: 0 }, COLS, ROWS)).toBeNull();
  });
});

describe('move', () => {
  it('advances the robot and is a no-op blocked at the edge', () => {
    let state = initialState();
    const outcome = executeStep(state, 'move', COLS, ROWS);
    expect(outcome.result).toBe('ok');
    expect(outcome.state.robot).toEqual({ x: 1, y: 4, direction: 1 });

    const blocked = executeStep(outcome.state, 'turn-right', COLS, ROWS);
    const stuck = executeStep(blocked.state, 'move', COLS, ROWS);
    expect(stuck.result).toBe('blocked');
    expect(stuck.state).toBe(blocked.state);
  });

  it('carries the crate along when holding', () => {
    let state = initialState();
    state = executeStep(state, 'turn-left', COLS, ROWS).state;
    state = executeStep(state, 'move', COLS, ROWS).state;
    state = executeStep(state, 'move', COLS, ROWS).state;
    expect(state.robot).toEqual({ x: 0, y: 2, direction: 0 });
    state = executeStep(state, 'grab', COLS, ROWS).state;
    expect(state.holding).toBe(true);
    state = executeStep(state, 'turn-right', COLS, ROWS).state;
    state = executeStep(state, 'move', COLS, ROWS).state;
    expect(state.crate).toEqual({ x: 1, y: 2 });
    expect(state.robot).toEqual({ x: 1, y: 2, direction: 1 });
  });
});

describe('grab', () => {
  it('picks up the crate when standing on it and drops it elsewhere', () => {
    let state = at(0, 2, 0);
    const grab = executeStep(state, 'grab', COLS, ROWS);
    expect(grab.result).toBe('ok');
    expect(grab.state.holding).toBe(true);

    const drop = executeStep(grab.state, 'grab', COLS, ROWS);
    expect(drop.state.holding).toBe(false);
    expect(drop.state.crate).toEqual({ x: 0, y: 2 });
  });

  it('reports no-crate when grabbing thin air', () => {
    const miss = executeStep(at(1, 2), 'grab', COLS, ROWS);
    expect(miss.result).toBe('no-crate');
    expect(miss.state.holding).toBe(false);
  });
});

describe('goal detection', () => {
  it('solves the authored first-puzzle program', () => {
    let state = initialState();
    const program = ['turn-left', 'move', 'move', 'grab', 'turn-right', 'move', 'move', 'grab'] as const;
    for (const cmd of program) {
      const outcome = executeStep(state, cmd, COLS, ROWS);
      expect(outcome.result).not.toBe('blocked');
      state = outcome.state;
    }
    expect(isSolved(state, FIRST_LEVEL.goal)).toBe(true);
  });
});