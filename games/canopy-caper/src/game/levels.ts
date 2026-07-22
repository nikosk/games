export interface PlatformData {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly oneWay?: boolean;
}

export interface VineData {
  readonly anchorX: number;
  readonly anchorY: number;
  readonly length: number;
}

export interface CheckpointData {
  readonly x: number;
  readonly y: number;
}

export interface FruitData {
  readonly x: number;
  readonly y: number;
}

export interface LevelData {
  readonly name: string;
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly startX: number;
  readonly startY: number;
  readonly goalX: number;
  readonly goalY: number;
  readonly platforms: readonly PlatformData[];
  readonly vine: VineData;
  readonly fruits: readonly FruitData[];
  readonly checkpoints: readonly CheckpointData[];
}

/**
 * A single authored vertical jungle climb.
 *
 * The route is hand-designed: start at bottom-left, step upward through
 * branch platforms (some one-way you can jump through from below), cross a
 * mandatory vine gap, then continue to the goal perch at the top-right.
 *
 * Coordinates use Phaser screen convention: origin top-left, y increases
 * downward. Platforms sit on top of their y coordinate (body extends down
 * below the surface line).
 */
export const AUTHORED_CLIMB: LevelData = {
  name: 'Canopy Caper',
  worldWidth: 800,
  worldHeight: 2400,
  // Start on the first platform, centred on it
  startX: 160,
  startY: 2330,
  // Goal perch at the top-right platform
  goalX: 660,
  goalY: 200,
  platforms: [
    // 0 — starting platform (bottom-left)
    { x: 80, y: 2360, width: 200 },
    // 1 — first step right
    { x: 340, y: 2240, width: 160, oneWay: true },
    // 2 — step left, one-way
    { x: 140, y: 2120, width: 150, oneWay: true },
    // 3 — intro run landing
    { x: 380, y: 2000, width: 170 },
    // 4 — checkpoint platform before the vine
    { x: 150, y: 1880, width: 180 },
    // ---- vine gap: anchor above platform 4, swing across to platform 5 ----
    // 5 — landing platform after vine (right side)
    { x: 520, y: 1700, width: 180 },
    // 6 — step left
    { x: 300, y: 1560, width: 150, oneWay: true },
    // 7 — step right
    { x: 480, y: 1420, width: 160 },
    // 8 — checkpoint after vine landing
    { x: 220, y: 1300, width: 170 },
    // 9 — climb higher
    { x: 440, y: 1160, width: 150, oneWay: true },
    // 10 — near the top
    { x: 200, y: 1020, width: 160 },
    // 11 — final approach
    { x: 420, y: 880, width: 150, oneWay: true },
    // 12 — near goal
    { x: 580, y: 720, width: 170 },
    // 13 — goal perch platform (top-right)
    { x: 560, y: 280, width: 200 },
  ],
  // Vine anchor is 40px above platform 4 centre; length 200 swings across ~280px
  vine: {
    anchorX: 240,
    anchorY: 1780,
    length: 200,
  },
  fruits: [
    // Two on the intro run
    { x: 420, y: 2200 },
    { x: 200, y: 2080 },
    // Two near the vine approach
    { x: 190, y: 1840 },
    { x: 560, y: 1660 },
    // Two after the vine
    { x: 360, y: 1520 },
    { x: 280, y: 1260 },
  ],
  checkpoints: [
    // Before the vine (on platform 4)
    { x: 240, y: 1850 },
    // After the vine landing (on platform 5)
    { x: 610, y: 1670 },
  ],
};