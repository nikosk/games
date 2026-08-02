import { describe, expect, it } from 'vitest';
import type { Direction } from '../src/game/direction';
import { LEVELS, type SparkyLevel } from '../src/game/level';
import { solveLevel } from '../src/game/solver';

const INTENDED_LENGTHS: Readonly<Record<string, number>> = {
  'First Shift': 8,
  'Long Haul': 6,
  'Corner Delivery': 7,
  Turnaround: 8,
  'Zig Zag': 8,
  'Dead End': 8,
  'Battery Run': 8,
  'Circuit Shelf': 8,
  'Two Kinds': 10,
  'Grand Finale': 10,
};

function makeLevel(
  overrides: Partial<SparkyLevel> & Pick<SparkyLevel, 'name' | 'start' | 'deliveries'>,
): SparkyLevel {
  return { cols: 5, rows: 5, walls: [], beltSlots: 8, ...overrides };
}

describe('solveLevel', () => {
  it('finds the shortest straight-walk program', () => {
    const level = makeLevel({
      name: 'Straight',
      start: { x: 0, y: 4, direction: 1 as Direction },
      deliveries: [{ id: 'gear-1', type: 'gear', pickup: { x: 1, y: 4 }, dock: { x: 2, y: 4 } }],
    });
    expect(solveLevel(level)).toEqual(['move', 'grab', 'move', 'grab']);
  });

  it('returns null when a pickup is boxed in by walls', () => {
    const level = makeLevel({
      name: 'Boxed',
      start: { x: 0, y: 4, direction: 1 as Direction },
      walls: [{ x: 0, y: 1 }, { x: 1, y: 2 }, { x: 0, y: 3 }],
      deliveries: [{ id: 'gear-1', type: 'gear', pickup: { x: 0, y: 2 }, dock: { x: 2, y: 2 } }],
    });
    expect(solveLevel(level)).toBeNull();
  });

  it('finds a shortest program of exactly the intended length for every authored level', () => {
    for (const level of LEVELS) {
      const solution = solveLevel(level);
      expect(solution, level.name).not.toBeNull();
      expect(solution!.length, level.name).toBe(INTENDED_LENGTHS[level.name]);
    }
  });

  it('respects a depth limit', () => {
    expect(solveLevel(LEVELS[0]!, 4)).toBeNull();
    expect(solveLevel(LEVELS[0]!, 8)).not.toBeNull();
    expect(solveLevel(LEVELS[8]!, 9)).toBeNull();
    expect(solveLevel(LEVELS[8]!, 10)).not.toBeNull();
  });
});
