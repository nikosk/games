/** Deterministic seeded random generator (mulberry32). */
export interface Rng {
  /** Next pseudo-random float in [0, 1). */
  next(): number;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return {
    next(): number {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

/** Random integer in [min, max] inclusive. */
export function rngInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng.next() * (max - min + 1));
}

/** A random element of the given items. */
export function rngPick<T>(rng: Rng, items: readonly T[]): T {
  return items[rngInt(rng, 0, items.length - 1)]!;
}

/** Returns a shuffled copy of the given items. */
export function rngShuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = rngInt(rng, 0, index);
    const value = copy[index]!;
    copy[index] = copy[swap]!;
    copy[swap] = value;
  }
  return copy;
}

/** The inclusive integer range [min, max]. */
export function range(min: number, max: number): number[] {
  const values: number[] = [];
  for (let value = min; value <= max; value += 1) values.push(value);
  return values;
}

/** `count` distinct random integers in [min, max]. */
export function distinctInts(rng: Rng, count: number, min: number, max: number): number[] {
  return rngShuffle(rng, range(min, max)).slice(0, count);
}
