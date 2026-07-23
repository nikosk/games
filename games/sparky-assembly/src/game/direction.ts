export type Direction = 0 | 1 | 2 | 3;

export const DIRECTION_VECTORS: Readonly<
  Record<Direction, { readonly x: number; readonly y: number }>
> = {
  0: { x: 0, y: -1 },
  1: { x: 1, y: 0 },
  2: { x: 0, y: 1 },
  3: { x: -1, y: 0 },
};

export function turnLeft(direction: Direction): Direction {
  return (((direction + 3) % 4) + 4) % 4 as Direction;
}

export function turnRight(direction: Direction): Direction {
  return (((direction + 1) % 4) + 4) % 4 as Direction;
}

export function angleFor(direction: Direction): number {
  return direction * 90;
}