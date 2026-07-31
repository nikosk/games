import { describe, expect, it } from 'vitest';
import { KITCHEN, rectsOverlap } from '../src/game/room';
import { createGuard, GUARD_EYE_OFFSET } from '../src/game/guard';
import { evaluateVision } from '../src/game/sight';

describe('KITCHEN room data', () => {
  it('keeps guard waypoints inside the guard bounds and on the floor span', () => {
    for (const waypoint of KITCHEN.guard.waypoints) {
      expect(waypoint).toBeGreaterThanOrEqual(KITCHEN.guard.minX);
      expect(waypoint).toBeLessThanOrEqual(KITCHEN.guard.maxX);
    }
    // the guard never walks into the left bread pocket or into the counter
    expect(KITCHEN.guard.minX).toBeGreaterThan(KITCHEN.wallLeft);
    expect(KITCHEN.guard.maxX).toBeLessThan(KITCHEN.counter.x);
    // guard bounds sit on the floor rect
    expect(KITCHEN.floorY).toBe(KITCHEN.floor.y);
    expect(KITCHEN.guard.maxX).toBeLessThanOrEqual(KITCHEN.floor.x + KITCHEN.floor.width);
  });

  it('keeps solids inside the room walls', () => {
    for (const solid of KITCHEN.solids) {
      expect(solid.x).toBeGreaterThanOrEqual(KITCHEN.wallLeft - 0.01);
      expect(solid.x + solid.width).toBeLessThanOrEqual(KITCHEN.wallRight + 0.01);
      expect(solid.y).toBeGreaterThanOrEqual(0);
      expect(solid.y + solid.height).toBeLessThanOrEqual(KITCHEN.worldHeight + 0.01);
    }
    expect(rectsOverlap(KITCHEN.counter, KITCHEN.floor)).toBe(false);
    expect(rectsOverlap(KITCHEN.solids[0]!, KITCHEN.solids[1]!)).toBe(false);
  });

  it('places the cheese on the counter top, away from the edges', () => {
    expect(KITCHEN.cheeseY + KITCHEN.cheeseRadius).toBeLessThan(KITCHEN.counter.y + 40);
    expect(KITCHEN.cheeseX).toBeGreaterThan(KITCHEN.counter.x + 80);
    expect(KITCHEN.cheeseX).toBeLessThan(KITCHEN.counter.x + KITCHEN.counter.width - 80);
  });

  it('places the vent at the left wall at floor height', () => {
    expect(KITCHEN.ventX - KITCHEN.wallLeft).toBeLessThan(KITCHEN.ventRadius);
    expect(KITCHEN.floorY - KITCHEN.ventY).toBeLessThan(KITCHEN.ventRadius);
    expect(KITCHEN.ventX).toBeLessThan(KITCHEN.guard.minX);
  });

  it('keeps the spoon lure left of the patrol zone and the mug in it', () => {
    const firstWaypoint = KITCHEN.guard.waypoints[0]!;
    expect(KITCHEN.spoonHomeX).toBeLessThan(firstWaypoint);
    expect(KITCHEN.spoonClatterX).toBeLessThan(KITCHEN.spoonHomeX);
    // the clatter point must be reachable within the guard bounds
    expect(KITCHEN.spoonClatterX).toBeGreaterThanOrEqual(KITCHEN.guard.minX - 0.01);
    expect(KITCHEN.mugX).toBeGreaterThanOrEqual(KITCHEN.guard.minX);
    expect(KITCHEN.mugX).toBeLessThanOrEqual(KITCHEN.guard.maxX);
  });
});

describe('KITCHEN shielding', () => {
  it('shields the mouse start behind the bread from a left-facing guard at both patrol ends', () => {
    const guard = createGuard(KITCHEN);
    guard.facing = -1;
    const eyeY = guard.y - GUARD_EYE_OFFSET;
    for (const waypoint of KITCHEN.guard.waypoints) {
      const vision = evaluateVision(
        waypoint,
        eyeY,
        -1,
        KITCHEN.guard.viewHalfAngleDeg,
        KITCHEN.guard.viewRange,
        KITCHEN.mouseStart.x,
        KITCHEN.mouseStart.y - 8,
        KITCHEN.cover,
        false,
      );
      expect(vision.visible).toBe(false);
    }
  });

  it('exposes a mouse that peeks out from behind the bread', () => {
    const vision = evaluateVision(
      700,
      780 - GUARD_EYE_OFFSET,
      -1,
      KITCHEN.guard.viewHalfAngleDeg,
      KITCHEN.guard.viewRange,
      320,
      800,
      KITCHEN.cover,
      false,
    );
    expect(vision.visible).toBe(true);
  });

  it('shields a mouse behind the mug from a guard on the other side', () => {
    const vision = evaluateVision(
      1060,
      780 - GUARD_EYE_OFFSET,
      -1,
      KITCHEN.guard.viewHalfAngleDeg,
      KITCHEN.guard.viewRange,
      700,
      800,
      KITCHEN.cover,
      false,
    );
    expect(vision.visible).toBe(false);
  });
});
