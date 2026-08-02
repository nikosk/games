import type { Cell, Direction, Level } from "./level";

export const VECTORS: Record<Direction, Cell> = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};
export const DIRECTIONS: readonly Direction[] = ["up", "right", "down", "left"];
export type Belt = Direction;
export type RunPhase =
  | "editing"
  | "moving"
  | "toasting"
  | "plated"
  | "serving"
  | "served"
  | "jammed";
export interface RunState {
  phase: RunPhase;
  path: Cell[];
  message: string;
}
export interface RouteSuccess {
  ok: true;
  path: Cell[];
}
export interface RouteFailure {
  ok: false;
  reason: "missing-belt" | "wrong-direction" | "loop" | "out-of-bounds";
  cell: Cell;
  message: string;
}
export type RouteResult = RouteSuccess | RouteFailure;
const same = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;
const key = (cell: Cell) => `${cell.x},${cell.y}`;

export function rotate(direction: Direction): Direction {
  return DIRECTIONS[(DIRECTIONS.indexOf(direction) + 1) % DIRECTIONS.length]!;
}
export function traceKitchenLine(
  level: Level,
  belts: ReadonlyMap<string, Direction>,
): RouteResult {
  const path: Cell[] = [];
  const seen = new Set<string>();
  let current = level.source;
  let toasted = false;
  for (let steps = 0; steps <= level.cells.length + 4; steps += 1) {
    path.push(current);
    if (same(current, level.toaster)) toasted = true;
    if (toasted && same(current, level.plate)) return { ok: true, path };
    const currentKey = key(current);
    if (seen.has(currentKey))
      return {
        ok: false,
        reason: "loop",
        cell: current,
        message: "JAM — the bread is going in circles.",
      };
    seen.add(currentKey);
    let direction = belts.get(currentKey);
    if (
      !direction &&
      (same(current, level.source) || same(current, level.toaster))
    ) {
      const candidate = level.cells.find((cell) => {
        const beltDirection = belts.get(key(cell));
        return (
          beltDirection !== undefined &&
          cell.x - current.x === VECTORS[beltDirection].x &&
          cell.y - current.y === VECTORS[beltDirection].y
        );
      });
      if (candidate)
        direction = DIRECTIONS.find(
          (value) =>
            current.x + VECTORS[value].x === candidate.x &&
            current.y + VECTORS[value].y === candidate.y,
        );
    }
    if (!direction) {
      const editableCell = level.cells.find(
        (cell) => Math.abs(cell.x - current.x) + Math.abs(cell.y - current.y) === 1,
      );
      return {
        ok: false,
        reason: "missing-belt",
        cell: editableCell ?? current,
        message: editableCell
          ? "JAM — add or rotate the glowing belt, then run again."
          : "JAM — add a belt to continue the line, then run again.",
      };
    }
    const next = {
      x: current.x + VECTORS[direction].x,
      y: current.y + VECTORS[direction].y,
    };
    if (next.x < 0 || next.y < 0 || next.x >= 6 || next.y >= 4)
      return {
        ok: false,
        reason: "out-of-bounds",
        cell: current,
        message: "JAM — that belt points outside the kitchen.",
      };
    if (!toasted && same(next, level.plate))
      return {
        ok: false,
        reason: "wrong-direction",
        cell: current,
        message: "JAM — reach the toaster before the plate.",
      };
    current = next;
  }
  return {
    ok: false,
    reason: "loop",
    cell: current,
    message: "JAM — check the belt directions.",
  };
}
