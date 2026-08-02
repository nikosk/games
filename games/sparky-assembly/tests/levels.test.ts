import { describe, expect, it } from 'vitest';
import { executeStep, isSolved, type Command } from '../src/game/rules';
import { BELT_SLOTS, COLS, FIRST_LEVEL, LEVELS, ROWS, initialState } from '../src/game/level';
import { solveLevel } from '../src/game/solver';

const INTENDED_PROGRAMS: Readonly<Record<string, readonly Command[]>> = {
  'First Shift': ['turn-left', 'move', 'move', 'grab', 'turn-right', 'move', 'move', 'grab'],
  'Long Haul': ['move', 'grab', 'move', 'move', 'move', 'grab'],
  'Corner Delivery': ['move', 'grab', 'move', 'turn-left', 'move', 'move', 'grab'],
  Turnaround: ['move', 'move', 'grab', 'turn-left', 'turn-left', 'move', 'move', 'grab'],
  'Zig Zag': ['turn-left', 'move', 'grab', 'move', 'turn-right', 'move', 'move', 'grab'],
  'Dead End': ['turn-left', 'move', 'move', 'grab', 'turn-right', 'move', 'move', 'grab'],
  'Battery Run': ['move', 'grab', 'move', 'move', 'turn-right', 'move', 'move', 'grab'],
  'Circuit Shelf': ['move', 'grab', 'move', 'move', 'turn-left', 'move', 'move', 'grab'],
  'Two Kinds': ['move', 'grab', 'move', 'grab', 'turn-left', 'move', 'move', 'grab', 'move', 'grab'],
  'Grand Finale': ['move', 'grab', 'move', 'grab', 'move', 'turn-left', 'move', 'grab', 'move', 'grab'],
};

describe('authored levels', () => {
  it('FIRST_LEVEL is the first level in LEVELS', () => {
    expect(FIRST_LEVEL).toBe(LEVELS[0]);
  });

  it('every level has a 5×5 board and a belt of 8 or 10 slots', () => {
    for (const level of LEVELS) {
      expect(level.cols).toBe(COLS);
      expect(level.rows).toBe(ROWS);
      expect([BELT_SLOTS, 10]).toContain(level.beltSlots);
      expect(level.deliveries.length).toBeGreaterThanOrEqual(1);
      expect(level.deliveries.length).toBeLessThanOrEqual(2);
      const ids = new Set(level.deliveries.map((d) => d.id));
      expect(ids.size).toBe(level.deliveries.length);
    }
  });

  it('never repeats a cargo type within one level', () => {
    for (const level of LEVELS) {
      const types = level.deliveries.map((d) => d.type);
      expect(new Set(types).size, level.name).toBe(types.length);
    }
  });

  it('keeps walls, start, pickups, and docks disjoint and in bounds', () => {
    for (const level of LEVELS) {
      for (const point of [level.start, ...level.walls, ...level.deliveries.flatMap((d) => [d.pickup, d.dock])]) {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThan(level.cols);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThan(level.rows);
      }
      const wallKeys = new Set(level.walls.map((w) => `${w.x},${w.y}`));
      expect(wallKeys.has(`${level.start.x},${level.start.y}`)).toBe(false);
      const pickupKeys = new Set<string>();
      const dockKeys = new Set<string>();
      for (const delivery of level.deliveries) {
        expect(wallKeys.has(`${delivery.pickup.x},${delivery.pickup.y}`)).toBe(false);
        expect(wallKeys.has(`${delivery.dock.x},${delivery.dock.y}`)).toBe(false);
        expect(`${delivery.pickup.x},${delivery.pickup.y}`).not.toBe(
          `${delivery.dock.x},${delivery.dock.y}`,
        );
        expect(pickupKeys.has(`${delivery.pickup.x},${delivery.pickup.y}`)).toBe(false);
        expect(dockKeys.has(`${delivery.dock.x},${delivery.dock.y}`)).toBe(false);
        pickupKeys.add(`${delivery.pickup.x},${delivery.pickup.y}`);
        dockKeys.add(`${delivery.dock.x},${delivery.dock.y}`);
      }
    }
  });

  it('later levels introduce walls, all three cargo types, and two-type deliveries', () => {
    const later = LEVELS.slice(5);
    const types = new Set(later.flatMap((l) => l.deliveries.map((d) => d.type)));
    expect(types.has('gear')).toBe(true);
    expect(types.has('battery')).toBe(true);
    expect(types.has('circuit')).toBe(true);
    expect(LEVELS[5]!.walls.length).toBeGreaterThan(0); // Dead End
    expect(LEVELS[7]!.walls.length).toBeGreaterThan(0); // Circuit Shelf
    expect(LEVELS[9]!.walls.length).toBeGreaterThan(0); // Grand Finale
    for (const level of [LEVELS[8]!, LEVELS[9]!]) {
      expect(level.deliveries).toHaveLength(2);
      expect(level.beltSlots).toBe(10);
      expect(level.deliveries[0]!.type).not.toBe(level.deliveries[1]!.type);
    }
  });

  it('every intended program solves its level and fits the belt', () => {
    for (const level of LEVELS) {
      const program = INTENDED_PROGRAMS[level.name];
      expect(program, level.name).toBeDefined();
      expect(program!.length, level.name).toBeLessThanOrEqual(level.beltSlots);
      let state = initialState(level);
      for (const cmd of program!) {
        const outcome = executeStep(state, cmd, level);
        expect(outcome.result, `${level.name} blocked at ${cmd}`).toBe('ok');
        state = outcome.state;
      }
      expect(isSolved(state, level), level.name).toBe(true);
    }
  });

  it('solver programs solve every authored level and fit the belt', () => {
    for (const level of LEVELS) {
      const solution = solveLevel(level);
      expect(solution, level.name).not.toBeNull();
      expect(solution!.length, level.name).toBeLessThanOrEqual(level.beltSlots);
      let state = initialState(level);
      for (const cmd of solution!) {
        const outcome = executeStep(state, cmd, level);
        expect(outcome.result, `${level.name} blocked at ${cmd}`).toBe('ok');
        state = outcome.state;
      }
      expect(isSolved(state, level), level.name).toBe(true);
    }
  });

  it('solves the original first-puzzle program (backward compat)', () => {
    let state = initialState();
    const program = ['turn-left', 'move', 'move', 'grab', 'turn-right', 'move', 'move', 'grab'] as const;
    for (const cmd of program) {
      const outcome = executeStep(state, cmd, FIRST_LEVEL);
      expect(outcome.result).not.toBe('blocked');
      state = outcome.state;
    }
    expect(isSolved(state, FIRST_LEVEL)).toBe(true);
  });
});
