import type { BoardCell, Direction, Point, Rotation, TrackKind } from './rules';

export const COLS = 6;
export const ROWS = 5;

export type Scenery = 'trees' | 'pond' | 'rocks';

interface SolutionPiece {
  readonly kind: TrackKind;
  readonly rotation: Rotation;
}

export interface WorkshopLevel {
  readonly name: string;
  readonly start: Point;
  readonly goal: Point;
  readonly direction: Direction;
  readonly scenery: Readonly<Record<string, Scenery>>;
  readonly inventory: Readonly<Record<TrackKind, number>>;
  readonly solution: Readonly<Record<string, SolutionPiece>>;
}

function scenery(entries: readonly [string, Scenery][]): Readonly<Record<string, Scenery>> {
  return Object.fromEntries(entries);
}

function piece(kind: TrackKind, rotation: Rotation): SolutionPiece {
  return { kind, rotation };
}

export const LEVELS: readonly WorkshopLevel[] = [
  {
    name: 'Pinecone Path',
    start: { x: 0, y: 3 },
    goal: { x: 5, y: 1 },
    direction: 1,
    scenery: scenery([
      ['0,0', 'trees'], ['1,0', 'rocks'], ['4,0', 'trees'], ['5,0', 'trees'],
      ['0,1', 'pond'], ['1,1', 'pond'], ['3,2', 'rocks'], ['4,2', 'pond'],
      ['5,2', 'pond'], ['0,4', 'trees'], ['3,4', 'rocks'], ['5,4', 'trees'],
    ]),
    inventory: { straight: 4, curve: 2 },
    solution: {
      '1,3': piece('straight', 1), '2,3': piece('curve', 3),
      '2,2': piece('straight', 0), '2,1': piece('curve', 1),
      '3,1': piece('straight', 1), '4,1': piece('straight', 1),
    },
  },
  {
    name: 'Garden Zigzag',
    start: { x: 0, y: 3 },
    goal: { x: 5, y: 1 },
    direction: 1,
    scenery: scenery([
      ['0,0', 'trees'], ['2,0', 'pond'], ['3,0', 'trees'], ['5,0', 'rocks'],
      ['0,1', 'pond'], ['2,2', 'rocks'], ['5,2', 'pond'], ['0,4', 'trees'],
      ['2,4', 'pond'], ['5,4', 'trees'],
    ]),
    inventory: { straight: 2, curve: 6 },
    solution: {
      '1,3': piece('curve', 3), '1,2': piece('straight', 0),
      '1,1': piece('curve', 1), '2,1': piece('straight', 1),
      '3,1': piece('curve', 2), '3,2': piece('curve', 0),
      '4,2': piece('curve', 3), '4,1': piece('curve', 1),
    },
  },
  {
    name: 'Meadow Loop',
    start: { x: 0, y: 3 },
    goal: { x: 5, y: 1 },
    direction: 1,
    scenery: scenery([
      ['0,0', 'trees'], ['1,0', 'rocks'], ['3,0', 'pond'], ['5,0', 'trees'],
      ['0,1', 'pond'], ['1,1', 'pond'], ['3,2', 'trees'], ['5,2', 'pond'],
      ['0,4', 'trees'], ['5,4', 'trees'],
    ]),
    inventory: { straight: 4, curve: 4 },
    solution: {
      '1,3': piece('straight', 1), '2,3': piece('curve', 2),
      '2,4': piece('curve', 0), '3,4': piece('straight', 1),
      '4,4': piece('curve', 3), '4,3': piece('straight', 0),
      '4,2': piece('straight', 0), '4,1': piece('curve', 1),
    },
  },
  {
    name: 'Rocky Ridge',
    start: { x: 0, y: 3 },
    goal: { x: 5, y: 1 },
    direction: 1,
    scenery: scenery([
      ['0,0', 'trees'], ['1,0', 'rocks'], ['2,0', 'rocks'], ['5,0', 'trees'],
      ['0,1', 'pond'], ['1,1', 'pond'], ['3,2', 'rocks'], ['5,2', 'pond'],
      ['0,4', 'trees'], ['2,4', 'rocks'], ['5,4', 'trees'],
    ]),
    inventory: { straight: 4, curve: 4 },
    solution: {
      '1,3': piece('straight', 1), '2,3': piece('straight', 1),
      '3,3': piece('curve', 2), '3,4': piece('curve', 0),
      '4,4': piece('curve', 3), '4,3': piece('straight', 0),
      '4,2': piece('straight', 0), '4,1': piece('curve', 1),
    },
  },
  {
    name: 'Sunset Express',
    start: { x: 0, y: 3 },
    goal: { x: 5, y: 1 },
    direction: 1,
    scenery: scenery([
      ['0,0', 'trees'], ['1,0', 'rocks'], ['2,0', 'trees'], ['3,0', 'pond'],
      ['5,0', 'trees'], ['0,1', 'pond'], ['1,1', 'pond'], ['5,2', 'pond'],
      ['0,4', 'trees'], ['1,4', 'pond'], ['5,4', 'trees'],
    ]),
    inventory: { straight: 2, curve: 6 },
    solution: {
      '1,3': piece('straight', 1), '2,3': piece('curve', 2),
      '2,4': piece('curve', 0), '3,4': piece('curve', 3),
      '3,3': piece('straight', 0), '3,2': piece('curve', 1),
      '4,2': piece('curve', 3), '4,1': piece('curve', 1),
    },
  },
];

const FIRST_LEVEL = LEVELS[0]!;

export function getLevel(index: number): WorkshopLevel {
  const safeIndex = Math.min(LEVELS.length - 1, Math.max(0, Math.trunc(index)));
  return LEVELS[safeIndex] ?? FIRST_LEVEL;
}

export function createBoard(level: WorkshopLevel = FIRST_LEVEL): BoardCell[][] {
  const board = Array.from({ length: ROWS }, () => Array<BoardCell>(COLS).fill(null));
  board[level.start.y]![level.start.x] = {
    kind: 'straight',
    rotation: level.direction % 2 === 0 ? 0 : 1,
    fixed: true,
  };
  board[level.goal.y]![level.goal.x] = { kind: 'straight', rotation: 1, fixed: true };
  return board;
}

export function cellKey(point: Point): string {
  return `${point.x},${point.y}`;
}
