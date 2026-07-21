import { describe, expect, it } from 'vitest';
import { COLS, LEVELS, ROWS, createBoard, getLevel } from '../src/game/level';
import { traceRoute } from '../src/game/rules';

describe('authored workshop puzzles', () => {
  it.each(LEVELS.map((level, index) => [index, level] as const))('solution %i reaches the station', (_index, level) => {
    const board = createBoard(level);
    for (const [key, track] of Object.entries(level.solution)) {
      const [x, y] = key.split(',').map(Number);
      if (x !== undefined && y !== undefined) board[y]![x] = track;
    }
    const route = traceRoute(board, level.start, level.goal, level.direction);
    expect(route, `${level.name}: ${JSON.stringify(route.failure)}`).toMatchObject({ success: true });
    expect(Object.values(level.solution).filter((track) => track.kind === 'straight')).toHaveLength(level.inventory.straight);
    expect(Object.values(level.solution).filter((track) => track.kind === 'curve')).toHaveLength(level.inventory.curve);
  });

  it.each(LEVELS)('$name keeps its required route clear of scenery', (level) => {
    expect(level.scenery[`${level.start.x},${level.start.y}`]).toBeUndefined();
    expect(level.scenery[`${level.goal.x},${level.goal.y}`]).toBeUndefined();

    for (const key of Object.keys(level.solution)) {
      const [x, y] = key.split(',').map(Number);
      expect(level.scenery[key], `${level.name}: scenery blocks ${key}`).toBeUndefined();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(COLS);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThan(ROWS);
    }
  });

  it('uses unique puzzle names', () => {
    expect(new Set(LEVELS.map((level) => level.name)).size).toBe(LEVELS.length);
  });

  it('clamps puzzle selection to safe bounds', () => {
    expect(getLevel(-10).name).toBe(LEVELS[0]!.name);
    expect(getLevel(999).name).toBe(LEVELS.at(-1)!.name);
    expect(getLevel(2.9).name).toBe(LEVELS[2]!.name);
  });
});
