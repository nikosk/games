import { describe, expect, it } from 'vitest';
import { resolveHorizontalVelocity } from '../src/game/movement';

const RUN = 280;

describe('resolveHorizontalVelocity', () => {
  it('steers left at run speed when only left is held', () => {
    expect(resolveHorizontalVelocity(true, false, true, 0, RUN)).toBe(-RUN);
    expect(resolveHorizontalVelocity(true, false, false, 120, RUN)).toBe(-RUN);
  });

  it('steers right at run speed when only right is held', () => {
    expect(resolveHorizontalVelocity(false, true, true, 0, RUN)).toBe(RUN);
    expect(resolveHorizontalVelocity(false, true, false, -90, RUN)).toBe(RUN);
  });

  it('stops on the ground when no direction is held', () => {
    expect(resolveHorizontalVelocity(false, false, true, 200, RUN)).toBe(0);
    expect(resolveHorizontalVelocity(false, false, true, -200, RUN)).toBe(0);
  });

  it('preserves airborne momentum when no direction is held', () => {
    expect(resolveHorizontalVelocity(false, false, false, 260, RUN)).toBe(260);
    expect(resolveHorizontalVelocity(false, false, false, -180, RUN)).toBe(-180);
    expect(resolveHorizontalVelocity(false, false, false, 0, RUN)).toBe(0);
  });

  it('treats opposing inputs as no held direction', () => {
    // Both held on the ground -> stop.
    expect(resolveHorizontalVelocity(true, true, true, 150, RUN)).toBe(0);
    // Both held in the air -> preserve momentum.
    expect(resolveHorizontalVelocity(true, true, false, 240, RUN)).toBe(240);
  });
});