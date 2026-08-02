export type Direction = "up" | "right" | "down" | "left";
export type Cell = { x: number; y: number };
export interface Level {
  readonly id: number;
  readonly title: string;
  readonly source: Cell;
  readonly toaster: Cell;
  readonly plate: Cell;
  readonly customer: string;
  readonly customerKind: "rabbit" | "bear";
  readonly cells: readonly Cell[];
  readonly solution: readonly Direction[];
}
export const LEVELS: readonly Level[] = [
  {
    id: 1,
    title: "Toast for Tilly",
    source: { x: 0, y: 1 },
    toaster: { x: 3, y: 1 },
    plate: { x: 5, y: 1 },
    customer: "Tilly",
    customerKind: "rabbit",
    cells: [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 4, y: 1 },
    ],
    solution: ["right", "right", "right"],
  },
  {
    id: 2,
    title: "A Toasty Turn",
    source: { x: 0, y: 2 },
    toaster: { x: 3, y: 1 },
    plate: { x: 5, y: 1 },
    customer: "Momo",
    customerKind: "bear",
    cells: [
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 2, y: 1 },
      { x: 4, y: 1 },
    ],
    solution: ["right", "up", "right", "right"],
  },
];
export function levelFor(id: number): Level {
  return LEVELS[(id - 1) % LEVELS.length]!;
}
