import type { Level2Station } from './puzzleTypes';

export interface StationBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Generous design-space hit areas around the painted Level 2 objects. */
export const LEVEL_2_STATION_BOUNDS: Readonly<Record<Level2Station, StationBounds>> = {
  blocks: { x: 105, y: 245, width: 180, height: 220 },
  train: { x: 290, y: 250, width: 200, height: 155 },
  balloons: { x: 805, y: 85, width: 175, height: 205 },
  fishbowl: { x: 985, y: 215, width: 245, height: 220 },
  cookies: { x: 35, y: 470, width: 265, height: 195 },
  eggs: { x: 305, y: 450, width: 230, height: 180 },
  buttons: { x: 790, y: 430, width: 195, height: 210 },
  shells: { x: 995, y: 445, width: 265, height: 205 },
};

/** Returns every pair of bounds whose interiors overlap. */
export function findOverlappingStations(
  bounds: Readonly<Record<Level2Station, StationBounds>> = LEVEL_2_STATION_BOUNDS,
): readonly [Level2Station, Level2Station][] {
  const stations = Object.keys(bounds) as Level2Station[];
  const overlaps: [Level2Station, Level2Station][] = [];
  for (let first = 0; first < stations.length; first += 1) {
    const a = bounds[stations[first]!]!;
    for (let second = first + 1; second < stations.length; second += 1) {
      const b = bounds[stations[second]!]!;
      const overlap = a.x < b.x + b.width
        && b.x < a.x + a.width
        && a.y < b.y + b.height
        && b.y < a.y + a.height;
      if (overlap) overlaps.push([stations[first]!, stations[second]!]);
    }
  }
  return overlaps;
}
