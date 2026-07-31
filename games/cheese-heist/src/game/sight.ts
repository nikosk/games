import type { Rect } from './room';

export interface VisionResult {
  readonly visible: boolean;
  readonly distance: number;
}

/**
 * Is the target point inside the guard's vision cone? The cone opens along
 * the facing axis (± halfAngleDeg) up to `range` pixels, using the same
 * pixel-space convention as the room (y grows downward).
 */
export function pointInCone(
  originX: number,
  originY: number,
  facing: 1 | -1,
  halfAngleDeg: number,
  range: number,
  px: number,
  py: number,
): boolean {
  const dx = px - originX;
  const dy = py - originY;
  const distanceSq = dx * dx + dy * dy;
  if (distanceSq > range * range) return false;
  if (distanceSq < 1) return true;
  const halfAngle = (halfAngleDeg * Math.PI) / 180;
  const facingAngle = facing === 1 ? 0 : Math.PI;
  let diff = Math.abs(Math.atan2(dy, dx) - facingAngle);
  if (diff > Math.PI) diff = Math.PI * 2 - diff;
  return diff <= halfAngle;
}

/**
 * Liang–Barsky segment/rectangle intersection. Returns true when any part
 * of the segment lies inside the rectangle (a segment starting inside the
 * rectangle counts as intersecting).
 */
export function segmentIntersectsRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rect: Rect,
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let t0 = 0;
  let t1 = 1;
  const p = [-dx, dx, -dy, dy];
  const q = [
    x1 - rect.x,
    rect.x + rect.width - x1,
    y1 - rect.y,
    rect.y + rect.height - y1,
  ];
  for (let i = 0; i < 4; i++) {
    const pi = p[i]!;
    const qi = q[i]!;
    if (pi === 0) {
      if (qi < 0) return false;
    } else {
      const t = qi / pi;
      if (pi < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
    }
  }
  return true;
}

export function lineOfSightBlocked(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rects: readonly Rect[],
): boolean {
  return rects.some((rect) => segmentIntersectsRect(x1, y1, x2, y2, rect));
}

/**
 * Full detection check: a hidden player is never seen; otherwise the target
 * must be inside the cone and the sight line must be clear of cover.
 */
export function evaluateVision(
  eyeX: number,
  eyeY: number,
  facing: 1 | -1,
  halfAngleDeg: number,
  range: number,
  targetX: number,
  targetY: number,
  coverRects: readonly Rect[],
  hidden: boolean,
): VisionResult {
  const distance = Math.hypot(targetX - eyeX, targetY - eyeY);
  if (hidden) return { visible: false, distance };
  if (!pointInCone(eyeX, eyeY, facing, halfAngleDeg, range, targetX, targetY)) {
    return { visible: false, distance };
  }
  if (lineOfSightBlocked(eyeX, eyeY, targetX, targetY, coverRects)) {
    return { visible: false, distance };
  }
  return { visible: true, distance };
}
