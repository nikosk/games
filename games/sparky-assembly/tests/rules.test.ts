import { describe, expect, it } from 'vitest';
import {
  executeStep,
  facingCell,
  isSolved,
  type Cargo,
  type Command,
  type FloorState,
} from '../src/game/rules';
import { turnLeft, turnRight, type Direction } from '../src/game/direction';
import { FIRST_LEVEL, LEVELS, initialState } from '../src/game/level';

function runProgram(level: (typeof LEVELS)[number], program: readonly Command[]): FloorState {
  let state = initialState(level);
  for (const cmd of program) {
    const outcome = executeStep(state, cmd, level);
    if (outcome.result === 'blocked') throw new Error(`Blocked at ${cmd}`);
    state = outcome.state;
  }
  return state;
}

function makeState(
  robot: { x: number; y: number; direction: Direction },
  cargo: readonly Cargo[],
  heldId: string | null,
): FloorState {
  return { robot, cargo, heldId };
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
    expect(facingCell({ x: 2, y: 2, direction: 1 }, FIRST_LEVEL)).toEqual({ x: 3, y: 2 });
    expect(facingCell({ x: 0, y: 2, direction: 3 }, FIRST_LEVEL)).toBeNull();
    expect(facingCell({ x: 0, y: 0, direction: 0 }, FIRST_LEVEL)).toBeNull();
  });

  it('returns null when the next cell is a wall', () => {
    const deadEnd = LEVELS[5]!; // wall at (1,4)
    expect(facingCell({ x: 0, y: 4, direction: 1 }, deadEnd)).toBeNull();
    expect(facingCell({ x: 2, y: 3, direction: 2 }, deadEnd)).toEqual({ x: 2, y: 4 });
  });
});

describe('move', () => {
  it('advances the robot and is a no-op blocked at the edge', () => {
    let state = initialState();
    const outcome = executeStep(state, 'move', FIRST_LEVEL);
    expect(outcome.result).toBe('ok');
    expect(outcome.state.robot).toEqual({ x: 1, y: 4, direction: 1 });

    const blocked = executeStep(outcome.state, 'turn-right', FIRST_LEVEL);
    const stuck = executeStep(blocked.state, 'move', FIRST_LEVEL);
    expect(stuck.result).toBe('blocked');
    expect(stuck.state).toBe(blocked.state);
  });

  it('is blocked by walls', () => {
    const level = LEVELS[5]!; // Dead End: wall at (1,4)
    const outcome = executeStep(initialState(level), 'move', level);
    expect(outcome.result).toBe('blocked');
    expect(outcome.state.robot).toEqual({ x: 0, y: 4, direction: 1 });
  });

  it('carries the cargo along when holding', () => {
    let state = initialState();
    state = executeStep(state, 'turn-left', FIRST_LEVEL).state;
    state = executeStep(state, 'move', FIRST_LEVEL).state;
    state = executeStep(state, 'move', FIRST_LEVEL).state;
    expect(state.robot).toEqual({ x: 0, y: 2, direction: 0 });
    state = executeStep(state, 'grab', FIRST_LEVEL).state;
    expect(state.heldId).toBe('gear-1');
    state = executeStep(state, 'turn-right', FIRST_LEVEL).state;
    state = executeStep(state, 'move', FIRST_LEVEL).state;
    expect(state.cargo).toEqual([{ id: 'gear-1', type: 'gear', x: 1, y: 2 }]);
    expect(state.robot).toEqual({ x: 1, y: 2, direction: 1 });
  });
});

describe('grab', () => {
  it('picks up a cargo when standing on it and drops it on an empty cell', () => {
    let state = initialState();
    state = executeStep(state, 'turn-left', FIRST_LEVEL).state;
    state = executeStep(state, 'move', FIRST_LEVEL).state;
    state = executeStep(state, 'move', FIRST_LEVEL).state; // (0,2) is the gear pickup
    const grab = executeStep(state, 'grab', FIRST_LEVEL);
    expect(grab.result).toBe('ok');
    expect(grab.state.heldId).toBe('gear-1');

    const drop = executeStep(grab.state, 'grab', FIRST_LEVEL);
    expect(drop.result).toBe('ok');
    expect(drop.state.heldId).toBeNull();
    expect(drop.state.cargo).toEqual([{ id: 'gear-1', type: 'gear', x: 0, y: 2 }]);
  });

  it('reports no-crate when grabbing thin air', () => {
    const state = makeState(
      { x: 1, y: 2, direction: 1 },
      [{ id: 'gear-1', type: 'gear', x: 0, y: 2 }],
      null,
    );
    const miss = executeStep(state, 'grab', FIRST_LEVEL);
    expect(miss.result).toBe('no-crate');
    expect(miss.state).toBe(state);
  });

  it('delivers to a matching dock and locks the cargo there', () => {
    const state = makeState(
      { x: 2, y: 2, direction: 1 },
      [{ id: 'gear-1', type: 'gear', x: 2, y: 2 }],
      'gear-1',
    );
    const outcome = executeStep(state, 'grab', FIRST_LEVEL);
    expect(outcome.result).toBe('ok');
    expect(outcome.state.heldId).toBeNull();
    expect(isSolved(outcome.state, FIRST_LEVEL)).toBe(true);

    const again = executeStep(outcome.state, 'grab', FIRST_LEVEL);
    expect(again.result).toBe('no-crate'); // delivered cargo cannot be picked up
  });

  it('refuses a drop on a mismatched dock with wrong-dock and keeps the cargo held', () => {
    const batteryLevel = LEVELS[6]!; // Battery Run: battery dock at (2,1)
    const state = makeState(
      { x: 2, y: 1, direction: 1 },
      [{ id: 'gear-1', type: 'gear', x: 2, y: 1 }],
      'gear-1',
    );
    const outcome = executeStep(state, 'grab', batteryLevel);
    expect(outcome.result).toBe('wrong-dock');
    expect(outcome.state).toBe(state);
    expect(outcome.state.heldId).toBe('gear-1');
  });

  it('blocks a drop onto a cell occupied by another cargo', () => {
    const state = makeState(
      { x: 1, y: 2, direction: 1 },
      [
        { id: 'gear-1', type: 'gear', x: 1, y: 2 },
        { id: 'battery-1', type: 'battery', x: 1, y: 2 },
      ],
      'battery-1',
    );
    const outcome = executeStep(state, 'grab', FIRST_LEVEL);
    expect(outcome.result).toBe('blocked');
    expect(outcome.state).toBe(state);
  });

  it('lets a wrongly dropped cargo be picked up again', () => {
    const state = makeState(
      { x: 2, y: 2, direction: 1 },
      [{ id: 'battery-1', type: 'battery', x: 2, y: 2 }],
      null,
    );
    const outcome = executeStep(state, 'grab', FIRST_LEVEL);
    expect(outcome.result).toBe('ok');
    expect(outcome.state.heldId).toBe('battery-1');
  });
});

describe('two-delivery levels', () => {
  it('solves Two Kinds in order with the intended program', () => {
    const level = LEVELS[8]!;
    const program = [
      'move', 'grab', 'move', 'grab', 'turn-left', 'move', 'move', 'grab', 'move', 'grab',
    ] as const;
    let state = initialState(level);
    for (const cmd of program) {
      const outcome = executeStep(state, cmd, level);
      expect(outcome.result, `blocked at ${cmd}`).toBe('ok');
      state = outcome.state;
    }
    expect(isSolved(state, level)).toBe(true);
  });

  it('is not solved until every dock is filled', () => {
    const level = LEVELS[8]!;
    const state = runProgram(level, ['move', 'grab', 'move', 'grab']);
    expect(isSolved(state, level)).toBe(false);
  });

  it('is not solved while a cargo is still held', () => {
    const level = LEVELS[9]!; // Grand Finale
    const program = [
      'move', 'grab', 'move', 'grab', 'move', 'turn-left', 'move', 'grab',
    ] as const;
    const state = runProgram(level, program);
    expect(state.heldId).toBe('battery-2');
    expect(isSolved(state, level)).toBe(false);
  });
});
