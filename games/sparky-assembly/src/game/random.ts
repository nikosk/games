import type { Direction } from './direction';
import { BELT_SLOTS, COLS, ROWS, type SparkyLevel } from './level';
import type { CargoType, Cell, Delivery } from './rules';
import { solveLevel } from './solver';

const CARGO_TYPES: readonly CargoType[] = ['gear', 'battery', 'circuit'];
/** Roughly one in three random shifts gets two different deliveries. */
const DOUBLE_PROBABILITY = 0.3;
/** Bounded retries per seed; each attempt uses its own derived stream. */
const MAX_ATTEMPTS = 60;
/** Seed window searched by `findRandomLevel`. */
const FIND_SEED_WINDOW = 50;

/** Standard mulberry32 PRNG; the same seed always yields the same stream. */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministically generate a solver-verified random level from a seed, or
 * null when no attempt passed. The same seed always yields the identical
 * level. Single deliveries use the 8-slot belt; occasional two-delivery
 * levels use 10 slots and two different cargo types.
 */
export function generateRandomLevel(seed: number): SparkyLevel | null {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const rng = mulberry32(Math.imul(seed ^ 0x9e3779b9, attempt + 1) >>> 0);
    const level = attemptLevel(rng, seed);
    if (level === null) continue;
    const solution = solveLevel(level, level.beltSlots);
    if (solution === null) continue;
    const minimum = level.deliveries.length === 1 ? 4 : 6;
    if (solution.length < minimum) continue;
    if (!solution.some((c) => c === 'turn-left' || c === 'turn-right')) continue;
    return level;
  }
  return null;
}

/** First accepted level in the seed window (deterministic per base seed). */
export function findRandomLevel(
  baseSeed: number,
): { readonly level: SparkyLevel; readonly seed: number } | null {
  for (let seed = baseSeed; seed < baseSeed + FIND_SEED_WINDOW; seed += 1) {
    const level = generateRandomLevel(seed);
    if (level !== null) return { level, seed };
  }
  return null;
}

const EDGE_CELLS: readonly Cell[] = [
  { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 },
  { x: 0, y: 4 }, { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 },
  { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 },
  { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 },
];

function attemptLevel(rng: () => number, seed: number): SparkyLevel | null {
  const double = rng() < DOUBLE_PROBABILITY;
  const walls = drawWalls(rng);
  const wallKeys = new Set(walls.map((w) => `${w.x},${w.y}`));
  const starts = EDGE_CELLS.filter((c) => !wallKeys.has(`${c.x},${c.y}`));
  const start = starts[Math.floor(rng() * starts.length)]!;
  const direction = Math.floor(rng() * 4) as Direction;
  const free = allCells().filter(
    (c) => !wallKeys.has(`${c.x},${c.y}`) && !(c.x === start.x && c.y === start.y),
  );
  shuffle(free, rng);
  const deliveries = double ? twoDeliveries(rng, free) : [oneDelivery(rng, free)];
  return {
    name: `Random Shift ${seed}`,
    cols: COLS,
    rows: ROWS,
    start: { x: start.x, y: start.y, direction },
    walls,
    deliveries,
    beltSlots: double ? 10 : BELT_SLOTS,
    seed,
  };
}

function drawWalls(rng: () => number): Cell[] {
  const count = 1 + Math.floor(rng() * 2); // 1–2 walls
  const cells = allCells();
  shuffle(cells, rng);
  return cells.slice(0, count);
}

function oneDelivery(rng: () => number, free: Cell[]): Delivery {
  const type = CARGO_TYPES[Math.floor(rng() * CARGO_TYPES.length)]!;
  return { id: `${type}-1`, type, pickup: free[1]!, dock: free[0]! };
}

function twoDeliveries(rng: () => number, free: Cell[]): Delivery[] {
  const typeA = CARGO_TYPES[Math.floor(rng() * CARGO_TYPES.length)]!;
  const others = CARGO_TYPES.filter((t) => t !== typeA);
  const typeB = others[Math.floor(rng() * others.length)]!;
  return [
    { id: `${typeA}-1`, type: typeA, pickup: free[2]!, dock: free[0]! },
    { id: `${typeB}-2`, type: typeB, pickup: free[3]!, dock: free[1]! },
  ];
}

function allCells(): Cell[] {
  const cells: Cell[] = [];
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) cells.push({ x, y });
  }
  return cells;
}

function shuffle<T>(items: T[], rng: () => number): void {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
}
