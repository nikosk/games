import { COLS, ROWS, cellKey, type Scenery, type WorkshopLevel } from './level';
import {
  DIRECTION_VECTORS,
  type Direction,
  type Point,
  type Rotation,
  type TrackKind,
} from './rules';

/** Golden-ratio constant used to mix seeds, route indices, and attempt streams. */
const GOLDEN = 0x9e3779b9;
/** Bounded attempts per (seed, route index); each attempt uses its own stream. */
const MAX_ATTEMPTS = 40;
/** Accepted route sizes in track pieces, excluding the fixed start and goal cells. */
const MIN_PIECES = 5;
const MAX_PIECES = 8;
const MIN_SCENERY = 8;
const MAX_SCENERY = 11;

/** Warm route names drawn deterministically from the seed. */
const ROUTE_NAMES: readonly string[] = [
  'Pinecone Path',
  'Garden Zigzag',
  'Meadow Loop',
  'Rocky Ridge',
  'Sunset Express',
  'Mossy Branch',
  'Copper Kettle',
  'Fox Hollow',
  'Bramble Bend',
  'Morning Glow',
  'Whistle Stop',
  'Clover Curve',
  'Willow Way',
  'Honey Hill',
  'Bluebell Run',
  'Apple Orchard',
];

export type Rng = () => number;

/** Standard mulberry32 PRNG; the same seed always yields the same stream. */
export function mulberry32(seed: number): Rng {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Session seed chosen once per page load; survives Phaser scene restarts. */
let sessionSeed: number | null = null;

/**
 * Start (or resume) the current session. An explicit seed makes the whole
 * session reproducible; otherwise one seed is drawn from the clock on the
 * first call and then reused for every route afterwards.
 */
export function startSession(seed?: number): number {
  if (seed !== undefined) {
    sessionSeed = seed >>> 0;
  } else if (sessionSeed === null) {
    const coarse = Date.now() >>> 0;
    const fine = Math.floor(performance.now() * 1000) >>> 0;
    sessionSeed = (coarse ^ Math.imul(fine, GOLDEN) ^ 0x85ebca6b) >>> 0;
  }
  return sessionSeed;
}

/** Deterministically generate the current session's route at `routeIndex`. */
export function generateSessionLevel(routeIndex: number): WorkshopLevel {
  return generateLevel(startSession(), routeIndex);
}

/**
 * Pure deterministic route generator: the same (seed, routeIndex) always
 * returns the identical puzzle. Every generated route is a simple path that
 * is valid under the real traceRoute rules, the inventory matches the
 * solution exactly, and scenery never blocks the route, the start, or the
 * goal. The goal is always approached horizontally so the fixed station
 * piece accepts the train.
 */
/** Mix two integers into one seed (murmur-style avalanche). */
function mix(left: number, right: number): number {
  let h = (left ^ right) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

export function generateLevel(seed: number, routeIndex: number): WorkshopLevel {
  // Scale the index and attempt streams by an odd constant before mixing so
  // distinct (seed, routeIndex) pairs never collapse through a pure XOR.
  const base = mix(seed >>> 0, Math.imul(routeIndex + 1, GOLDEN));
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const rng = mulberry32(mix(base, Math.imul(attempt + 1, GOLDEN)));
    const level = attemptLevel(rng);
    if (level !== null) return level;
  }
  throw new Error(`Could not generate Railway Workshop route ${routeIndex} from seed ${seed}.`);
}

interface StartRef {
  readonly point: Point;
  readonly direction: Direction;
}

interface SolutionPiece {
  readonly point: Point;
  readonly kind: TrackKind;
  readonly rotation: Rotation;
}

/**
 * Build one candidate route. Returns null when the drawn start/goal pair
 * cannot host a route of the drawn length, or when the route is a boring
 * straight line; the caller then retries with a fresh stream.
 */
function attemptLevel(rng: Rng): WorkshopLevel | null {
  const start = pickStart(rng);
  const goal = pickGoal(rng, start);
  const length = MIN_PIECES + Math.floor(rng() * (MAX_PIECES - MIN_PIECES + 1));
  const straightBias = 0.35 + rng() * 0.5;
  const route = findRoute(rng, start, goal, length, straightBias);
  if (route === null || countCurves(route) === 0) return null;

  const solutionPieces = buildSolution(route, start.direction);
  const solution: Record<string, { kind: TrackKind; rotation: Rotation }> = {};
  const inventory = { straight: 0, curve: 0 };
  for (const piece of solutionPieces) {
    solution[cellKey(piece.point)] = { kind: piece.kind, rotation: piece.rotation };
    inventory[piece.kind] += 1;
  }

  const routeKeys = new Set(route.map(cellKey));
  const free = allCells().filter((cell) => !routeKeys.has(cellKey(cell)));
  const scenery = pickScenery(rng, free);
  const name = ROUTE_NAMES[Math.floor(rng() * ROUTE_NAMES.length)]!;

  return {
    name,
    start: start.point,
    goal,
    direction: start.direction,
    scenery,
    inventory,
    solution,
  };
}

/** The train leaves from any board edge; its first step always stays inside. */
function pickStart(rng: Rng): StartRef {
  const direction = Math.floor(rng() * 4) as Direction;
  if (direction === 0) return { point: { x: Math.floor(rng() * COLS), y: ROWS - 1 }, direction };
  if (direction === 1) return { point: { x: 0, y: Math.floor(rng() * ROWS) }, direction };
  if (direction === 2) return { point: { x: Math.floor(rng() * COLS), y: 0 }, direction };
  return { point: { x: COLS - 1, y: Math.floor(rng() * ROWS) }, direction };
}

/** The goal may sit anywhere except the start and its first step cell. */
function pickGoal(rng: Rng, start: StartRef): Point {
  const firstStep = add(start.point, DIRECTION_VECTORS[start.direction]);
  const excluded = new Set([cellKey(start.point), cellKey(firstStep)]);
  const candidates = allCells().filter((cell) => !excluded.has(cellKey(cell)));
  return candidates[Math.floor(rng() * candidates.length)]!;
}

/**
 * Randomized backtracking search for a simple path of exactly `length`
 * track pieces that ends horizontally adjacent to the goal. The first step
 * is fixed to `start.direction` so the fixed shed piece points the train
 * that way. The search is exhaustive within the depth bound, so it finds a
 * route whenever one exists.
 */
function findRoute(
  rng: Rng,
  start: StartRef,
  goal: Point,
  length: number,
  straightBias: number,
): readonly Point[] | null {
  const first = add(start.point, DIRECTION_VECTORS[start.direction]);
  if (!isInside(first) || samePoint(first, goal)) return null;
  const visited = new Set<string>([cellKey(start.point)]);
  const path: Point[] = [start.point, first];
  visited.add(cellKey(first));
  if (search(rng, first, start.direction, goal, length, straightBias, visited, path)) return path;
  return null;
}

function search(
  rng: Rng,
  current: Point,
  entry: Direction,
  goal: Point,
  length: number,
  straightBias: number,
  visited: Set<string>,
  path: Point[],
): boolean {
  if (path.length - 1 === length) {
    if (canFinish(current, goal)) {
      path.push(goal);
      return true;
    }
    return false;
  }
  for (const direction of orderedDirections(rng, entry, straightBias)) {
    const next = add(current, DIRECTION_VECTORS[direction]);
    if (!isInside(next)) continue;
    const key = cellKey(next);
    if (visited.has(key) || samePoint(next, goal)) continue;
    visited.add(key);
    path.push(next);
    if (search(rng, next, direction, goal, length, straightBias, visited, path)) return true;
    path.pop();
    visited.delete(key);
  }
  return false;
}

/** The fixed station piece accepts the train only from the east or west. */
function canFinish(current: Point, goal: Point): boolean {
  return current.y === goal.y && Math.abs(current.x - goal.x) === 1;
}

/** Prefer continuing straight when the level's bias says so, for shape variety. */
function orderedDirections(rng: Rng, entry: Direction, straightBias: number): readonly Direction[] {
  const left = ((entry + 1) % 4) as Direction;
  const right = ((entry + 3) % 4) as Direction;
  if (rng() < straightBias) {
    return rng() < 0.5 ? [entry, left, right] : [entry, right, left];
  }
  const options: Direction[] = [entry, left, right];
  shuffle(options, rng);
  return options;
}

function buildSolution(route: readonly Point[], startDirection: Direction): readonly SolutionPiece[] {
  const pieces: SolutionPiece[] = [];
  for (let i = 1; i < route.length - 1; i += 1) {
    const entry = i === 1 ? startDirection : directionBetween(route[i - 1]!, route[i]!);
    const exit = directionBetween(route[i]!, route[i + 1]!);
    pieces.push({
      point: route[i]!,
      kind: exit === entry ? 'straight' : 'curve',
      rotation: rotationFor(entry, exit),
    });
  }
  return pieces;
}

/**
 * A straight piece runs along the entry axis; a curve piece exposes the
 * entrance and exit ports (the trace checks the entrance, then leaves via
 * the other port).
 */
function rotationFor(entry: Direction, exit: Direction): Rotation {
  if (exit === entry) return entry % 2 === 0 ? 0 : 1;
  const entrance = ((entry + 2) % 4) as Direction;
  return (exit === ((entrance + 1) % 4) ? entrance : exit) as Rotation;
}

function countCurves(route: readonly Point[]): number {
  let curves = 0;
  for (let i = 1; i < route.length - 1; i += 1) {
    const entry = directionBetween(route[i - 1]!, route[i]!);
    const exit = directionBetween(route[i]!, route[i + 1]!);
    if (entry !== exit) curves += 1;
  }
  return curves;
}

function pickScenery(rng: Rng, free: readonly Point[]): Record<string, Scenery> {
  const count = MIN_SCENERY + Math.floor(rng() * (MAX_SCENERY - MIN_SCENERY + 1));
  const pool = [...free];
  shuffle(pool, rng);
  const scenery: Record<string, Scenery> = {};
  for (let i = 0; i < count; i += 1) {
    const point = pool[i];
    if (point === undefined) break;
    scenery[cellKey(point)] = pickSceneryType(rng);
  }
  return scenery;
}

function pickSceneryType(rng: Rng): Scenery {
  const roll = rng();
  if (roll < 0.4) return 'trees';
  if (roll < 0.75) return 'pond';
  return 'rocks';
}

function directionBetween(from: Point, to: Point): Direction {
  if (to.x > from.x) return 1;
  if (to.x < from.x) return 3;
  if (to.y < from.y) return 0;
  return 2;
}

function allCells(): Point[] {
  const cells: Point[] = [];
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) cells.push({ x, y });
  }
  return cells;
}

function add(point: Point, vector: Point): Point {
  return { x: point.x + vector.x, y: point.y + vector.y };
}

function isInside(point: Point): boolean {
  return point.x >= 0 && point.x < COLS && point.y >= 0 && point.y < ROWS;
}

function samePoint(left: Point, right: Point): boolean {
  return left.x === right.x && left.y === right.y;
}

function shuffle<T>(items: T[], rng: Rng): void {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
}
