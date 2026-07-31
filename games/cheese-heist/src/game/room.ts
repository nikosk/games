export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface GuardRoute {
  /** Patrol waypoints along the floor (x positions). */
  readonly waypoints: readonly number[];
  readonly patrolSpeed: number;
  readonly chaseSpeed: number;
  readonly viewRange: number;
  readonly viewHalfAngleDeg: number;
  /** Same-floor catch distance. */
  readonly catchRadius: number;
  /** Horizontal reach for the cat's swipe at a mouse up on the counter. */
  readonly swipeRange: number;
  /** The guard never walks left of this x. */
  readonly minX: number;
  /** The guard never walks right of this x. */
  readonly maxX: number;
}

export interface KitchenRoom {
  readonly worldWidth: number;
  readonly worldHeight: number;
  /** Top surface of the floor. */
  readonly floorY: number;
  readonly wallLeft: number;
  readonly wallRight: number;
  readonly mouseStart: { readonly x: number; readonly y: number };
  readonly guard: GuardRoute;
  readonly floor: Rect;
  readonly counter: Rect;
  /** Rectangles that block sight lines (generous to the player). */
  readonly cover: readonly Rect[];
  /** Physics solids (floor, counter, bread). */
  readonly solids: readonly Rect[];
  readonly spoonHomeX: number;
  readonly spoonClatterX: number;
  readonly spoonRadius: number;
  readonly mugX: number;
  readonly mugY: number;
  readonly mugRadius: number;
  readonly cheeseX: number;
  readonly cheeseY: number;
  readonly cheeseRadius: number;
  readonly ventX: number;
  readonly ventY: number;
  readonly ventRadius: number;
  /** How close the mouse must be to interact with a prop. */
  readonly interactRange: number;
}

/**
 * The single authored kitchen heist room.
 *
 * The mouse starts in a shielded pocket at the left wall next to the vent,
 * with a bread loaf hiding the sight line to the cat's patrol. The cat
 * patrols the middle of the floor (in front of the mug hiding spot). The
 * spoon sits at the left of the patrol zone; kicking it draws the cat away
 * from the counter, where the cheese sits on the counter top.
 */
export const KITCHEN: KitchenRoom = {
  worldWidth: 1600,
  worldHeight: 900,
  floorY: 820,
  wallLeft: 60,
  wallRight: 1540,
  mouseStart: { x: 172, y: 808 },
  guard: {
    waypoints: [700, 1020],
    patrolSpeed: 90,
    chaseSpeed: 235,
    viewRange: 400,
    viewHalfAngleDeg: 55,
    catchRadius: 46,
    swipeRange: 70,
    minX: 320,
    maxX: 1060,
  },
  floor: { x: 60, y: 820, width: 1480, height: 80 },
  counter: { x: 1100, y: 640, width: 400, height: 180 },
  cover: [
    { x: 1100, y: 640, width: 400, height: 180 }, // counter
    { x: 188, y: 760, width: 84, height: 60 }, // bread loaf (generous)
    { x: 906, y: 752, width: 68, height: 68 }, // mug
  ],
  solids: [
    { x: 60, y: 820, width: 1480, height: 80 }, // floor
    { x: 1100, y: 640, width: 400, height: 180 }, // counter
    { x: 188, y: 786, width: 84, height: 34 }, // bread loaf
  ],
  spoonHomeX: 480,
  spoonClatterX: 380,
  spoonRadius: 30,
  mugX: 940,
  mugY: 780,
  mugRadius: 64,
  cheeseX: 1300,
  cheeseY: 620,
  cheeseRadius: 30,
  ventX: 84,
  ventY: 790,
  ventRadius: 36,
  interactRange: 52,
};

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function pointInRect(px: number, py: number, rect: Rect): boolean {
  return (
    px >= rect.x
    && px <= rect.x + rect.width
    && py >= rect.y
    && py <= rect.y + rect.height
  );
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y
  );
}
