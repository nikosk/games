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

/**
 * First puzzle: Sparky stands in the south-west corner facing east. The crate
 * waits two cells to the north, the goal is two cells east of the crate.
 *
 * One clean solution (8 commands, fills the belt):
 *   turn-left, move, move, grab, turn-right, move, move, grab
 *
 * Sparky pivots north, walks to the crate, picks it up, pivots east, carries
 * it onto the goal, and releases. Every command type is needed.
 */
export const FIRST_LEVEL: SparkyLevel = {
  name: 'First Shift',
  cols: COLS,
  rows: ROWS,
  start: { x: 0, y: 4, direction: 1 },
  crate: { x: 0, y: 2 },
  goal: { x: 2, y: 2 },
  beltSlots: BELT_SLOTS,
};

export function initialState(level: SparkyLevel = FIRST_LEVEL) {
  return {
    robot: { x: level.start.x, y: level.start.y, direction: level.start.direction },
    crate: { x: level.crate.x, y: level.crate.y },
    holding: false,
  };
}