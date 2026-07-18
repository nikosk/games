export type Direction = 0 | 1 | 2 | 3;
export type Rotation = 0 | 1 | 2 | 3;
export type TrackKind = 'straight' | 'curve';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface TrackPiece {
  readonly kind: TrackKind;
  readonly rotation: Rotation;
  readonly fixed?: boolean;
}

export type BoardCell = TrackPiece | null;
export type Board = ReadonlyArray<ReadonlyArray<BoardCell>>;

export interface RouteStep extends Point {
  readonly direction: Direction;
}

export type RouteFailure = 'missing-track' | 'wrong-connection' | 'left-board' | 'loop';

export interface RouteResult {
  readonly success: boolean;
  readonly path: readonly RouteStep[];
  readonly failure?: {
    readonly point: Point;
    readonly reason: RouteFailure;
  };
}

export const DIRECTION_VECTORS: Readonly<Record<Direction, Point>> = {
  0: { x: 0, y: -1 },
  1: { x: 1, y: 0 },
  2: { x: 0, y: 1 },
  3: { x: -1, y: 0 },
};

export function opposite(direction: Direction): Direction {
  return ((direction + 2) % 4) as Direction;
}

export function rotate(piece: TrackPiece): TrackPiece {
  return {
    ...piece,
    rotation: ((piece.rotation + 1) % 4) as Rotation,
  };
}

export function portsFor(piece: TrackPiece): readonly [Direction, Direction] {
  if (piece.kind === 'straight') {
    return piece.rotation % 2 === 0 ? [0, 2] : [1, 3];
  }

  return [piece.rotation, ((piece.rotation + 1) % 4) as Direction];
}

function isInside(board: Board, point: Point): boolean {
  const row = board[point.y];
  return point.y >= 0 && point.x >= 0 && row !== undefined && point.x < row.length;
}

function samePoint(left: Point, right: Point): boolean {
  return left.x === right.x && left.y === right.y;
}

export function traceRoute(
  board: Board,
  start: Point,
  goal: Point,
  startingDirection: Direction,
): RouteResult {
  const path: RouteStep[] = [];
  const visited = new Set<string>();
  let point = { ...start };
  let direction = startingDirection;

  while (true) {
    if (!isInside(board, point)) {
      return { success: false, path, failure: { point, reason: 'left-board' } };
    }

    const stateKey = `${point.x},${point.y},${direction}`;
    if (visited.has(stateKey)) {
      return { success: false, path, failure: { point, reason: 'loop' } };
    }
    visited.add(stateKey);

    const piece = board[point.y]?.[point.x] ?? null;
    if (piece === null) {
      return { success: false, path, failure: { point, reason: 'missing-track' } };
    }

    const ports = portsFor(piece);
    const entrance = opposite(direction);
    if (!ports.includes(entrance)) {
      return { success: false, path, failure: { point, reason: 'wrong-connection' } };
    }

    if (samePoint(point, goal)) {
      path.push({ ...point, direction });
      return { success: true, path };
    }

    const exit = ports[0] === entrance ? ports[1] : ports[0];
    path.push({ ...point, direction: exit });

    const movement = DIRECTION_VECTORS[exit];
    point = { x: point.x + movement.x, y: point.y + movement.y };
    direction = exit;
  }
}

export function cloneBoard(board: Board): BoardCell[][] {
  return board.map((row) => row.map((piece) => piece === null ? null : { ...piece }));
}
