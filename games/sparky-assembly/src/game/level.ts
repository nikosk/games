import type { Direction } from './direction';

export const COLS = 5;
export const ROWS = 5;
export const BELT_SLOTS = 8;

export interface Cell {
  readonly x: number;
  readonly y: number;
}

export interface SparkyLevel {
  readonly name: string;
  readonly cols: number;
  readonly rows: number;
  readonly start: Cell & { readonly direction: Direction };
  readonly crate: Cell;
  readonly goal: Cell;
  readonly beltSlots: number;
}

/** Five sequenced puzzles. Belt capacity remains 8 slots on a 5×5 grid. */
export const LEVELS: readonly SparkyLevel[] = [
  {
    name: 'First Shift',
    cols: COLS,
    rows: ROWS,
    start: { x: 0, y: 4, direction: 1 }, // south-west, facing east
    crate: { x: 0, y: 2 },
    goal: { x: 2, y: 2 },
    beltSlots: BELT_SLOTS,
  },
  {
    name: 'Long Haul',
    cols: COLS,
    rows: ROWS,
    start: { x: 0, y: 4, direction: 0 }, // south-west, facing north
    crate: { x: 0, y: 3 },
    goal: { x: 0, y: 0 }, // far end of the column
    beltSlots: BELT_SLOTS,
  },
  {
    name: 'Corner Delivery',
    cols: COLS,
    rows: ROWS,
    start: { x: 4, y: 4, direction: 0 }, // south-east, facing north
    crate: { x: 4, y: 3 },
    goal: { x: 2, y: 2 }, // centre of the board
    beltSlots: BELT_SLOTS,
  },
  {
    name: 'Turnaround',
    cols: COLS,
    rows: ROWS,
    start: { x: 0, y: 2, direction: 1 }, // mid-left, facing east
    crate: { x: 2, y: 2 },
    goal: { x: 0, y: 2 }, // back to the start column
    beltSlots: BELT_SLOTS,
  },
  {
    name: 'Zig Zag',
    cols: COLS,
    rows: ROWS,
    start: { x: 0, y: 4, direction: 1 }, // south-west, facing east
    crate: { x: 0, y: 3 },
    goal: { x: 2, y: 2 }, // centre, reached via an L-shaped route
    beltSlots: BELT_SLOTS,
  },
];

/** Backward-compatible alias for the first level. */
export const FIRST_LEVEL: SparkyLevel = LEVELS[0]!;

export function initialState(level: SparkyLevel = FIRST_LEVEL) {
  return {
    robot: { x: level.start.x, y: level.start.y, direction: level.start.direction },
    crate: { x: level.crate.x, y: level.crate.y },
    holding: false,
  };
}