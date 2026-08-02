import { describe, expect, it } from 'vitest';
import {
  generateLevel,
  generateSessionLevel,
  mulberry32,
  startSession,
} from '../src/game/generator';
import { COLS, ROWS, createBoard, type WorkshopLevel } from '../src/game/level';
import { traceRoute, type BoardCell } from '../src/game/rules';

/** The level's own solution laid onto a fresh board, exactly as play does. */
function solutionBoard(level: WorkshopLevel): BoardCell[][] {
  const board = createBoard(level);
  for (const [key, track] of Object.entries(level.solution)) {
    const [x, y] = key.split(',').map(Number);
    if (x !== undefined && y !== undefined) board[y]![x] = track;
  }
  return board;
}

function parseKey(key: string): { x: number; y: number } {
  const [x, y] = key.split(',').map(Number);
  if (x === undefined || y === undefined) throw new Error(`bad key ${key}`);
  return { x, y };
}

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

describe('generateLevel', () => {
  it('returns identical levels for the same seed and route index', () => {
    expect(generateLevel(12345, 3)).toEqual(generateLevel(12345, 3));
    expect(generateLevel(0, 0)).toEqual(generateLevel(0, 0));
    expect(generateLevel(4294967295, 17)).toEqual(generateLevel(4294967295, 17));
  });

  it('advances to a different route for the next index and for other seeds', () => {
    const first = generateLevel(12345, 0);
    expect(generateLevel(12345, 1)).not.toEqual(first);
    expect(generateLevel(54321, 0)).not.toEqual(first);
  });

  it('keeps consecutive routes distinct over a long stretch', () => {
    let previous = generateLevel(999, 0);
    for (let index = 1; index < 40; index += 1) {
      const current = generateLevel(999, index);
      expect(current).not.toEqual(previous);
      previous = current;
    }
  });

  it('does not collapse adjacent indices of the same seed (regression)', () => {
    expect(generateLevel(4370, 7)).not.toEqual(generateLevel(4370, 8));
  });

  it('keeps forward routes distinct over many indices on fixed seeds', () => {
    for (const seed of [0, 1, 4370, 999999, 4294967295]) {
      const seen = new Set<string>();
      let previous = generateLevel(seed, 0);
      seen.add(JSON.stringify(previous));
      for (let index = 1; index < 250; index += 1) {
        const current = generateLevel(seed, index);
        expect(current, `seed ${seed} index ${index}`).not.toEqual(previous);
        const key = JSON.stringify(current);
        expect(seen.has(key), `seed ${seed}: route repeats at index ${index}`).toBe(false);
        seen.add(key);
        previous = current;
      }
    }
  });
});

describe('generated route invariants (stress sweep)', { timeout: 60000 }, () => {
  it('every route is solvable and respects inventory, scenery, and bounds', () => {
    const startRows = new Set<number>();
    const goalRows = new Set<number>();
    const straightCounts = new Set<number>();
    const curveCounts = new Set<number>();
    const sceneryCounts = new Set<number>();
    const sceneryTypes = new Set<string>();
    const names = new Set<string>();
    const shapes = new Set<string>();
    let generated = 0;

    for (let seed = 0; seed < 300; seed += 1) {
      for (let index = 0; index < 3; index += 1) {
        const level = generateLevel(seed, index);
        generated += 1;

        // The supplied solution is a valid route under the real trace rules.
        const route = traceRoute(solutionBoard(level), level.start, level.goal, level.direction);
        expect(route, `seed ${seed} index ${index}: ${JSON.stringify(route.failure)}`).toMatchObject({
          success: true,
        });

        // Inventory matches the solution exactly and stays in the chosen range.
        const pieces = Object.values(level.solution);
        const straights = pieces.filter((track) => track.kind === 'straight').length;
        const curves = pieces.filter((track) => track.kind === 'curve').length;
        expect(level.inventory.straight).toBe(straights);
        expect(level.inventory.curve).toBe(curves);
        expect(straights + curves).toBeGreaterThanOrEqual(5);
        expect(straights + curves).toBeLessThanOrEqual(8);
        expect(curves).toBeGreaterThanOrEqual(1);

        // Solution pieces stay on the board with valid rotations.
        for (const [key, track] of Object.entries(level.solution)) {
          const { x, y } = parseKey(key);
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThan(COLS);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThan(ROWS);
          expect(track.rotation).toBeGreaterThanOrEqual(0);
          expect(track.rotation).toBeLessThan(4);
        }

        // Start sits on the edge its direction points away from.
        expect(level.start).not.toEqual(level.goal);
        if (level.direction === 0) expect(level.start.y).toBe(ROWS - 1);
        if (level.direction === 1) expect(level.start.x).toBe(0);
        if (level.direction === 2) expect(level.start.y).toBe(0);
        if (level.direction === 3) expect(level.start.x).toBe(COLS - 1);

        // The final approach into the fixed station is horizontal.
        const secondToLast = route.path.at(-2);
        expect(secondToLast).toBeDefined();
        expect(secondToLast!.y).toBe(level.goal.y);
        expect(Math.abs(secondToLast!.x - level.goal.x)).toBe(1);

        // Scenery stays off the start, the goal, and every route cell.
        const routeKeys = new Set(route.path.map((point) => `${point.x},${point.y}`));
        const sceneryKeys = Object.keys(level.scenery);
        expect(sceneryKeys.length).toBeGreaterThanOrEqual(8);
        expect(sceneryKeys.length).toBeLessThanOrEqual(11);
        for (const key of sceneryKeys) {
          expect(routeKeys.has(key), `seed ${seed} index ${index}: scenery on ${key}`).toBe(false);
          const { x, y } = parseKey(key);
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThan(COLS);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThan(ROWS);
          sceneryTypes.add(level.scenery[key]!);
        }

        // Collect variety signals.
        startRows.add(level.start.y);
        goalRows.add(level.goal.y);
        straightCounts.add(straights);
        curveCounts.add(curves);
        sceneryCounts.add(sceneryKeys.length);
        names.add(level.name);
        shapes.add(level.solution ? Object.values(level.solution).map((track) => track.kind).join('') : '');
      }
    }

    expect(generated).toBe(900);

    // Variety floors: the generator must not collapse onto a few fixed layouts.
    expect(startRows.size).toBeGreaterThanOrEqual(4);
    expect(goalRows.size).toBeGreaterThanOrEqual(4);
    expect(straightCounts.size).toBeGreaterThanOrEqual(3);
    expect(curveCounts.size).toBeGreaterThanOrEqual(3);
    expect(sceneryCounts.size).toBeGreaterThanOrEqual(3);
    expect(sceneryTypes.size).toBe(3);
    expect(names.size).toBeGreaterThanOrEqual(8);
    expect(shapes.size).toBeGreaterThanOrEqual(20);
  });

  it('regenerates the same seeds to the identical levels', () => {
    const firstPass: WorkshopLevel[] = [];
    for (let seed = 0; seed < 50; seed += 1) firstPass.push(generateLevel(seed, 1));
    for (let seed = 0; seed < 50; seed += 1) {
      expect(generateLevel(seed, 1)).toEqual(firstPass[seed]);
    }
  });
});

describe('session routes', () => {
  it('starts a session from an explicit seed and advances deterministically', () => {
    startSession(424242);
    expect(generateSessionLevel(0)).toEqual(generateLevel(424242, 0));
    expect(generateSessionLevel(2)).toEqual(generateLevel(424242, 2));
  });

  it('reuses the session seed across calls and restarts', () => {
    startSession(7);
    expect(generateSessionLevel(5)).toEqual(generateSessionLevel(5));
  });
});
