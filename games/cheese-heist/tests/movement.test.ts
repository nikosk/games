import { describe, expect, it } from 'vitest';
import { resolveHorizontalVelocity } from '../src/game/movement';

const RUN = 260;

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
    expect(resolveHorizontalVelocity(false, false, false, 240, RUN)).toBe(240);
    expect(resolveHorizontalVelocity(false, false, false, -160, RUN)).toBe(-160);
  });

  it('treats opposing inputs as no held direction', () => {
    expect(resolveHorizontalVelocity(true, true, true, 150, RUN)).toBe(0);
    expect(resolveHorizontalVelocity(true, true, false, 240, RUN)).toBe(240);
  });
});
