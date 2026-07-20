import type { BoardCell, Point, TrackKind } from './rules';

export const COLS = 6;
export const ROWS = 5;
export const START: Point = { x: 0, y: 3 };
export const GOAL: Point = { x: 5, y: 1 };

export const BLOCKED_CELLS = new Map<string, 'trees' | 'pond' | 'rocks'>([
  ['0,0', 'trees'],
  ['1,0', 'rocks'],
  ['4,0', 'trees'],
  ['5,0', 'trees'],
  ['0,1', 'pond'],
  ['1,1', 'pond'],
  ['3,2', 'rocks'],
  ['4,2', 'pond'],
  ['5,2', 'pond'],
  ['0,4', 'trees'],
  ['3,4', 'rocks'],
  ['5,4', 'trees'],
]);

export const STARTING_INVENTORY: Readonly<Record<TrackKind, number>> = {
  straight: 4,
  curve: 2,
};

export function createBoard(): BoardCell[][] {
  const board = Array.from({ length: ROWS }, () => Array<BoardCell>(COLS).fill(null));
  board[START.y]![START.x] = { kind: 'straight', rotation: 1, fixed: true };
  board[GOAL.y]![GOAL.x] = { kind: 'straight', rotation: 1, fixed: true };
  return board;
}

export function cellKey(point: Point): string {
  return `${point.x},${point.y}`;
}
