import { describe, expect, it } from 'vitest';
import { findRandomLevel, generateRandomLevel, mulberry32 } from '../src/game/random';
import { COLS, ROWS, initialState, type SparkyLevel } from '../src/game/level';
import { executeStep, isSolved } from '../src/game/rules';
import { solveLevel } from '../src/game/solver';

describe('mulberry32', () => {
  it('is deterministic for the same seed', () => {
    const first = mulberry32(7);
    const second = mulberry32(7);
    for (let i = 0; i < 8; i += 1) expect(first()).toBe(second());
  });

  it('produces values in [0, 1)', () => {
    const rng = mulberry32(123);
    for (let i = 0; i < 100; i += 1) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('generateRandomLevel', () => {
  it('returns identical levels for the same seed', () => {
    let seed = 0;
    let first = generateRandomLevel(seed);
    while (first === null && seed < 500) {
      seed += 1;
      first = generateRandomLevel(seed);
    }
    expect(first).not.toBeNull();
    expect(generateRandomLevel(seed)).toEqual(first);
  });

  it('produces valid, solver-verified levels for seeds 0..199 (stress sweep)', { timeout: 60000 }, () => {
    const firstPass = new Map<number, SparkyLevel | null>();
    let accepted = 0;

    for (let seed = 0; seed < 200; seed += 1) {
      const level = generateRandomLevel(seed);
      firstPass.set(seed, level);
      if (level === null) continue;
      accepted += 1;

      expect(level.cols).toBe(COLS);
      expect(level.rows).toBe(ROWS);
      expect(level.seed).toBe(seed);
      expect(level.deliveries.length).toBeGreaterThanOrEqual(1);
      expect(level.deliveries.length).toBeLessThanOrEqual(2);
      expect(level.beltSlots).toBe(level.deliveries.length === 1 ? 8 : 10);
      expect(level.walls.length).toBeGreaterThanOrEqual(1);
      expect(level.walls.length).toBeLessThanOrEqual(2);

      const wallKeys = new Set(level.walls.map((w) => `${w.x},${w.y}`));
      expect(wallKeys.has(`${level.start.x},${level.start.y}`)).toBe(false);
      const pickupKeys = new Set<string>();
      const dockKeys = new Set<string>();
      for (const delivery of level.deliveries) {
        expect(delivery.pickup.x).toBeGreaterThanOrEqual(0);
        expect(delivery.pickup.x).toBeLessThan(COLS);
        expect(delivery.pickup.y).toBeGreaterThanOrEqual(0);
        expect(delivery.pickup.y).toBeLessThan(ROWS);
        expect(delivery.dock.x).toBeGreaterThanOrEqual(0);
        expect(delivery.dock.x).toBeLessThan(COLS);
        expect(delivery.dock.y).toBeGreaterThanOrEqual(0);
        expect(delivery.dock.y).toBeLessThan(ROWS);
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
      if (level.deliveries.length === 2) {
        expect(level.deliveries[0]!.type).not.toBe(level.deliveries[1]!.type);
      }

      // The core contract: the level is solver-verified within its own belt.
      const solution = solveLevel(level, level.beltSlots);
      expect(solution).not.toBeNull();
      expect(solution!.length).toBeLessThanOrEqual(level.beltSlots);
      // The returned program must actually solve the level when executed.
      let state = initialState(level);
      for (const cmd of solution!) {
        const outcome = executeStep(state, cmd, level);
        expect(outcome.result, `seed ${seed} blocked at ${cmd}`).toBe('ok');
        state = outcome.state;
      }
      expect(isSolved(state, level), `seed ${seed}`).toBe(true);
    }

    // Regression floor: the generator must accept a healthy share of seeds.
    expect(accepted).toBeGreaterThanOrEqual(40);

    // Determinism: regenerating the same seeds yields identical levels.
    for (let seed = 0; seed < 50; seed += 1) {
      expect(generateRandomLevel(seed)).toEqual(firstPass.get(seed));
    }
  });
});

describe('findRandomLevel', () => {
  it('is deterministic and stays within the seed window', () => {
    const first = findRandomLevel(1000);
    expect(first).not.toBeNull();
    expect(findRandomLevel(1000)).toEqual(first);
    expect(first!.seed).toBeGreaterThanOrEqual(1000);
    expect(first!.seed).toBeLessThan(1050);
    expect(first!.level.seed).toBe(first!.seed);
  });
});
