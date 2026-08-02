import type { Direction } from './direction';
import type { CargoType, Cell, Delivery, FloorState } from './rules';

export type { CargoType, Cell, Delivery };

export const COLS = 5;
export const ROWS = 5;
/** Default command-belt capacity; individual levels may use up to 10. */
export const BELT_SLOTS = 8;

export interface SparkyLevel {
  readonly name: string;
  readonly cols: number;
  readonly rows: number;
  readonly start: Cell & { readonly direction: Direction };
  readonly walls: readonly Cell[];
  readonly deliveries: readonly Delivery[];
  readonly beltSlots: number;
  /** Present only on generated random levels. */
  readonly seed?: number;
}

/**
 * Reference fixtures retained for focused rule and solver tests. The runtime
 * scene does not sequence these: every playable puzzle is generated and
 * solver-checked in `random.ts`.
 */
export const LEVELS: readonly SparkyLevel[] = [
  {
    name: 'First Shift',
    cols: COLS,
    rows: ROWS,
    start: { x: 0, y: 4, direction: 1 }, // south-west, facing east
    walls: [],
    deliveries: [{ id: 'gear-1', type: 'gear', pickup: { x: 0, y: 2 }, dock: { x: 2, y: 2 } }],
    beltSlots: BELT_SLOTS,
  },
  {
    name: 'Long Haul',
    cols: COLS,
    rows: ROWS,
    start: { x: 0, y: 4, direction: 0 }, // south-west, facing north
    walls: [],
    deliveries: [{ id: 'gear-1', type: 'gear', pickup: { x: 0, y: 3 }, dock: { x: 0, y: 0 } }],
    beltSlots: BELT_SLOTS,
  },
  {
    name: 'Corner Delivery',
    cols: COLS,
    rows: ROWS,
    start: { x: 4, y: 4, direction: 0 }, // south-east, facing north
    walls: [],
    deliveries: [{ id: 'gear-1', type: 'gear', pickup: { x: 4, y: 3 }, dock: { x: 2, y: 2 } }],
    beltSlots: BELT_SLOTS,
  },
  {
    name: 'Turnaround',
    cols: COLS,
    rows: ROWS,
    start: { x: 0, y: 2, direction: 1 }, // mid-left, facing east
    walls: [],
    deliveries: [{ id: 'gear-1', type: 'gear', pickup: { x: 2, y: 2 }, dock: { x: 0, y: 2 } }],
    beltSlots: BELT_SLOTS,
  },
  {
    name: 'Zig Zag',
    cols: COLS,
    rows: ROWS,
    start: { x: 0, y: 4, direction: 1 }, // south-west, facing east
    walls: [],
    deliveries: [{ id: 'gear-1', type: 'gear', pickup: { x: 0, y: 3 }, dock: { x: 2, y: 2 } }],
    beltSlots: BELT_SLOTS,
  },
  {
    name: 'Dead End',
    cols: COLS,
    rows: ROWS,
    start: { x: 0, y: 4, direction: 1 },
    walls: [{ x: 1, y: 4 }], // blocks the tempting first move east
    deliveries: [{ id: 'gear-1', type: 'gear', pickup: { x: 0, y: 2 }, dock: { x: 2, y: 2 } }],
    beltSlots: BELT_SLOTS,
  },
  {
    name: 'Battery Run',
    cols: COLS,
    rows: ROWS,
    start: { x: 0, y: 4, direction: 0 },
    walls: [],
    deliveries: [{ id: 'battery-1', type: 'battery', pickup: { x: 0, y: 3 }, dock: { x: 2, y: 1 } }],
    beltSlots: BELT_SLOTS,
  },
  {
    name: 'Circuit Shelf',
    cols: COLS,
    rows: ROWS,
    start: { x: 4, y: 4, direction: 0 },
    walls: [{ x: 2, y: 4 }],
    deliveries: [{ id: 'circuit-1', type: 'circuit', pickup: { x: 4, y: 3 }, dock: { x: 2, y: 1 } }],
    beltSlots: BELT_SLOTS,
  },
  {
    name: 'Two Kinds',
    cols: COLS,
    rows: ROWS,
    start: { x: 0, y: 4, direction: 1 },
    walls: [],
    deliveries: [
      { id: 'gear-1', type: 'gear', pickup: { x: 1, y: 4 }, dock: { x: 2, y: 4 } },
      { id: 'battery-2', type: 'battery', pickup: { x: 2, y: 2 }, dock: { x: 2, y: 1 } },
    ],
    beltSlots: 10,
  },
  {
    name: 'Grand Finale',
    cols: COLS,
    rows: ROWS,
    start: { x: 0, y: 4, direction: 1 },
    walls: [{ x: 2, y: 3 }], // blocks the naive turn north after the gear dock
    deliveries: [
      { id: 'gear-1', type: 'gear', pickup: { x: 1, y: 4 }, dock: { x: 2, y: 4 } },
      { id: 'battery-2', type: 'battery', pickup: { x: 3, y: 3 }, dock: { x: 3, y: 2 } },
    ],
    beltSlots: 10,
  },
];

/** Backward-compatible reference fixture used by focused rule tests. */
export const FIRST_LEVEL: SparkyLevel = LEVELS[0]!;

export function initialState(level: SparkyLevel = FIRST_LEVEL): FloorState {
  return {
    robot: { x: level.start.x, y: level.start.y, direction: level.start.direction },
    cargo: level.deliveries.map((d) => ({ id: d.id, type: d.type, x: d.pickup.x, y: d.pickup.y })),
    heldId: null,
  };
}
