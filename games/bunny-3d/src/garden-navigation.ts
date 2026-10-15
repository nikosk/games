export interface Point { x: number; z: number }
export interface GardenLayout {
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  radius: number;
  obstacles: { x: number; z: number; radius: number }[];
}
export const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.z - b.z);

/** The same clearance is used for taps, keyboard movement and path smoothing. */
export function canTravel(a: Point, b: Point, layout: GardenLayout): boolean {
  const { bounds: r, radius } = layout;
  for (const p of [a, b]) {
    if (!Number.isFinite(p.x + p.z) || p.x < r.minX + radius || p.x > r.maxX - radius || p.z < r.minZ + radius || p.z > r.maxZ - radius) return false;
  }
  const dx = b.x - a.x, dz = b.z - a.z, length2 = dx * dx + dz * dz;
  return layout.obstacles.every(o => {
    const t = length2 ? Math.max(0, Math.min(1, ((o.x - a.x) * dx + (o.z - a.z) * dz) / length2)) : 0;
    return Math.hypot(a.x + dx * t - o.x, a.z + dz * t - o.z) >= o.radius + radius;
  });
}

/** A small eight-neighbor grid, then exact circle-clearance smoothing. */
export function findPath(start: Point, requested: Point, layout: GardenLayout): Point[] {
  if (!Number.isFinite(requested.x + requested.z) || !canTravel(start, start, layout)) return [];
  const { bounds: b, radius: r } = layout;
  const goal = { x: Math.max(b.minX + r, Math.min(b.maxX - r, requested.x)), z: Math.max(b.minZ + r, Math.min(b.maxZ - r, requested.z)) };
  if (distance(start, goal) < .025) return [];
  if (canTravel(start, goal, layout)) return [goal];
  const step = .22, width = Math.ceil((b.maxX - b.minX - 2 * r) / step) + 1;
  const height = Math.ceil((b.maxZ - b.minZ - 2 * r) / step) + 1;
  const points: Point[] = [];
  const free: boolean[] = [];
  for (let z = 0; z < height; z++) for (let x = 0; x < width; x++) {
    const p = { x: b.minX + r + x / (width - 1) * (b.maxX - b.minX - 2 * r), z: b.minZ + r + z / (height - 1) * (b.maxZ - b.minZ - 2 * r) };
    points.push(p); free.push(canTravel(p, p, layout));
  }
  function nearest(p: Point, connect: boolean): number {
    let best = -1, bestDistance = Infinity;
    points.forEach((v, i) => {
      const d = distance(v, p);
      if (free[i] && d < bestDistance && (!connect || canTravel(p, v, layout))) { best = i; bestDistance = d; }
    });
    return best;
  }
  const from = nearest(start, true), to = nearest(goal, canTravel(goal, goal, layout));
  if (from < 0 || to < 0) return [];
  const scores = new Float64Array(points.length).fill(Infinity);
  const parents = new Int32Array(points.length).fill(-1);
  const closed = new Uint8Array(points.length);
  const open = new Set<number>([from]); scores[from] = 0;
  let found = false;
  while (open.size) {
    let current = -1, best = Infinity;
    for (const i of open) {
      const score = scores[i]! + distance(points[i]!, points[to]!);
      if (score < best) { best = score; current = i; }
    }
    if (current === to) { found = true; break; }
    open.delete(current); closed[current] = 1;
    const cx = current % width, cz = Math.floor(current / width);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const x = cx + dx, z = cz + dz, n = z * width + x;
      if ((!dx && !dz) || x < 0 || z < 0 || x >= width || z >= height || closed[n] || !free[n]) continue;
      if (!canTravel(points[current]!, points[n]!, layout)) continue;
      const score = scores[current]! + distance(points[current]!, points[n]!);
      if (score < scores[n]!) { scores[n] = score; parents[n] = current; open.add(n); }
    }
  }
  if (!found) return [];
  const raw: Point[] = [];
  for (let n = to; n !== -1; n = parents[n]!) raw.unshift(points[n]!);
  if (canTravel(raw.at(-1)!, goal, layout)) raw.push(goal);
  const result: Point[] = [];
  let previous = start;
  for (let i = 0; i < raw.length;) {
    let last = i;
    for (let j = i + 1; j < raw.length; j++) if (canTravel(previous, raw[j]!, layout)) last = j;
    previous = raw[last]!; result.push(previous); i = last + 1;
  }
  return result;
}

/** Take a distance along a path, preserving corners and returning unused distance. */
export function advance(position: Point, path: Point[], amount: number): number {
  while (path.length && amount > 0) {
    const next = path[0]!, d = distance(position, next), step = Math.min(d, amount);
    if (d > 1e-8) { position.x += (next.x - position.x) / d * step; position.z += (next.z - position.z) / d * step; }
    amount -= step;
    if (d <= step + 1e-8) path.shift();
  }
  return amount;
}

/** Feet stay put at takeoff and landing; forward travel happens in the air. */
export function hopProgress(phase: number): number {
  const t = Math.max(0, Math.min(1, (phase - .12) / .76));
  return t * t * (3 - 2 * t);
}
