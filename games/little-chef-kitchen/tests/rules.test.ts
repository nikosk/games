import { describe, expect, it } from 'vitest';
import { LEVELS, levelFor } from '../src/game/level';
import { rotate, traceKitchenLine } from '../src/game/rules';

describe('kitchen route rules', () => {
  it('accepts every authored solution with implicit station exits', () => {
    for (const level of LEVELS) {
      const belts = new Map(level.cells.map((cell, index) => [`${cell.x},${cell.y}`, level.solution[index]! ]));
      expect(traceKitchenLine(level, belts)).toMatchObject({ ok: true });
    }
  });
  it('reports missing, wrong sequence, loops, and out-of-bounds', () => {
    const level = LEVELS[0]!;
    expect(traceKitchenLine(level, new Map()).ok).toBe(false);
    expect(traceKitchenLine(level, new Map([['1,1', 'right'], ['2,1', 'right'], ['4,1', 'left']])).ok).toBe(false);
    expect(traceKitchenLine(level, new Map([['1,1', 'left'], ['2,1', 'right'], ['4,1', 'right']])).ok).toBe(false);
    expect(traceKitchenLine(level, new Map([['1,1', 'right'], ['2,1', 'right'], ['4,1', 'right']])).ok).toBe(true);
  });
  it('points a missing source exit at the first editable belt cell', () => {
    const result = traceKitchenLine(LEVELS[0]!, new Map());
    expect(result).toMatchObject({ ok: false, reason: 'missing-belt', cell: { x: 1, y: 1 } });
    if (!result.ok) expect(result.message).toContain('glowing belt');
  });
  it('rotates and advances levels', () => {
    expect(rotate('right')).toBe('down');
    expect(levelFor(3).id).toBe(1);
    expect(levelFor(2).customerKind).toBe('bear');
  });
});
