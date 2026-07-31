import { describe, expect, it } from 'vitest';
import {
  evaluateVision,
  lineOfSightBlocked,
  pointInCone,
  segmentIntersectsRect,
} from '../src/game/sight';
import { KITCHEN } from '../src/game/room';

describe('pointInCone', () => {
  it('sees targets ahead within range', () => {
    expect(pointInCone(0, 0, 1, 55, 400, 300, 0)).toBe(true);
  });

  it('does not see targets behind the facing direction', () => {
    expect(pointInCone(0, 0, 1, 55, 400, -300, 0)).toBe(false);
    expect(pointInCone(0, 0, -1, 55, 400, 300, 0)).toBe(false);
  });

  it('does not see targets beyond range', () => {
    expect(pointInCone(0, 0, 1, 55, 400, 500, 0)).toBe(false);
  });

  it('accepts targets exactly at the cone edge and rejects just past it', () => {
    const range = 400;
    const onEdge = pointInCone(
      0, 0, 1, 55, range,
      range * Math.cos((55 * Math.PI) / 180),
      range * Math.sin((55 * Math.PI) / 180),
    );
    expect(onEdge).toBe(true);
    const pastEdge = pointInCone(
      0, 0, 1, 55, range,
      range * Math.cos((56 * Math.PI) / 180),
      range * Math.sin((56 * Math.PI) / 180),
    );
    expect(pastEdge).toBe(false);
  });
});

describe('segmentIntersectsRect', () => {
  const rect = { x: 100, y: 100, width: 50, height: 50 };

  it('detects a segment crossing the rect', () => {
    expect(segmentIntersectsRect(0, 0, 200, 200, rect)).toBe(true);
  });

  it('rejects a segment that misses', () => {
    expect(segmentIntersectsRect(0, 0, 200, 0, rect)).toBe(false);
    expect(segmentIntersectsRect(0, 200, 200, 200, rect)).toBe(false);
  });

  it('detects a segment starting inside the rect', () => {
    expect(segmentIntersectsRect(120, 120, 200, 0, rect)).toBe(true);
  });
});

describe('lineOfSightBlocked', () => {
  it('blocks when a rect sits between the two points', () => {
    const rects = [{ x: 300, y: 300, width: 50, height: 50 }];
    expect(lineOfSightBlocked(0, 0, 400, 400, rects)).toBe(true);
    expect(lineOfSightBlocked(0, 0, 100, 100, rects)).toBe(false);
  });
});

describe('evaluateVision', () => {
  const eyeY = 780 - 32; // cat center minus eye offset

  it('sees a mouse in the open within the cone', () => {
    const vision = evaluateVision(700, eyeY, 1, 55, 400, 800, 800, KITCHEN.cover, false);
    expect(vision.visible).toBe(true);
    expect(vision.distance).toBeCloseTo(Math.hypot(100, 52), 5);
  });

  it('never sees a hidden mouse, even in the open', () => {
    const vision = evaluateVision(700, eyeY, 1, 55, 400, 800, 800, KITCHEN.cover, true);
    expect(vision.visible).toBe(false);
  });

  it('blocks sight lines that cross the counter front', () => {
    // guard left of the counter, mouse on top of it
    const vision = evaluateVision(1020, eyeY, 1, 55, 400, 1300, 620, KITCHEN.cover, false);
    expect(vision.visible).toBe(false);
  });

  it('can still see the mouse at the counter edge (the thin risk strip)', () => {
    // 92px left of the guard and 128px up: inside the cone, and the sight
    // line grazes just over the counter top before the counter blocks it
    const vision = evaluateVision(1020, eyeY, 1, 55, 400, 1112, 620, KITCHEN.cover, false);
    expect(vision.visible).toBe(true);
  });

  it('blocks sight through the mug', () => {
    const vision = evaluateVision(1060, eyeY, -1, 55, 400, 880, 800, KITCHEN.cover, false);
    expect(vision.visible).toBe(false);
  });
});
