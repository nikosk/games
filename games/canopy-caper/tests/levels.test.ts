import { describe, expect, it } from 'vitest';
import { AUTHORED_CLIMB } from '../src/game/levels';

describe('AUTHORED_CLIMB level data', () => {
  it('has a valid name and positive world bounds', () => {
    expect(AUTHORED_CLIMB.name).toBe('Canopy Caper');
    expect(AUTHORED_CLIMB.worldWidth).toBeGreaterThan(0);
    expect(AUTHORED_CLIMB.worldHeight).toBeGreaterThan(0);
  });

  it('places every platform within world bounds with positive width', () => {
    for (const p of AUTHORED_CLIMB.platforms) {
      expect(p.width).toBeGreaterThan(0);
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(AUTHORED_CLIMB.worldHeight);
      expect(p.x + p.width).toBeLessThanOrEqual(AUTHORED_CLIMB.worldWidth);
    }
  });

  it('has at least one checkpoint before and after the vine', () => {
    expect(AUTHORED_CLIMB.checkpoints.length).toBeGreaterThanOrEqual(2);
    const beforeVine = AUTHORED_CLIMB.checkpoints[0]!;
    const afterVine = AUTHORED_CLIMB.checkpoints[1]!;
    const anchorY = AUTHORED_CLIMB.vine.anchorY;
    expect(beforeVine.y).toBeGreaterThan(anchorY - 220);
    expect(beforeVine.y).toBeLessThan(anchorY + 220);
    expect(afterVine.y).toBeLessThan(beforeVine.y + 60);
  });

  it('places the vine anchor within the world', () => {
    const v = AUTHORED_CLIMB.vine;
    expect(v.anchorX).toBeGreaterThan(0);
    expect(v.anchorX).toBeLessThan(AUTHORED_CLIMB.worldWidth);
    expect(v.anchorY).toBeGreaterThan(0);
    expect(v.anchorY).toBeLessThan(AUTHORED_CLIMB.worldHeight);
    expect(v.length).toBeGreaterThan(80);
  });

  it('places the vine anchor reachable from at least one platform', () => {
    const v = AUTHORED_CLIMB.vine;
    const reachable = AUTHORED_CLIMB.platforms.some((p) =>
      Math.abs((p.x + p.width / 2) - v.anchorX) <= v.length &&
      v.anchorY - p.y <= v.length + 60 + 120,
    );
    expect(reachable).toBe(true);
  });

  it('places every fruit near a platform surface', () => {
    for (const fruit of AUTHORED_CLIMB.fruits) {
      const nearPlatform = AUTHORED_CLIMB.platforms.some((p) =>
        fruit.x >= p.x - 20 &&
        fruit.x <= p.x + p.width + 20 &&
        fruit.y <= p.y + 40 &&
        fruit.y >= p.y - 120,
      );
      expect(nearPlatform).toBe(true);
    }
  });

  it('places the goal above the highest platform', () => {
    const highestY = Math.min(...AUTHORED_CLIMB.platforms.map((p) => p.y));
    expect(AUTHORED_CLIMB.goalY).toBeLessThanOrEqual(highestY + 80);
    expect(AUTHORED_CLIMB.goalY).toBeGreaterThanOrEqual(0);
  });

  it('places the start position on the first platform', () => {
    const first = AUTHORED_CLIMB.platforms[0]!;
    expect(AUTHORED_CLIMB.startX).toBeGreaterThanOrEqual(first.x);
    expect(AUTHORED_CLIMB.startX).toBeLessThanOrEqual(first.x + first.width);
    expect(AUTHORED_CLIMB.startY).toBeLessThanOrEqual(first.y);
    expect(AUTHORED_CLIMB.startY).toBeGreaterThanOrEqual(first.y - 120);
  });

  it('has exactly six fruits', () => {
    expect(AUTHORED_CLIMB.fruits).toHaveLength(6);
  });

  it('includes at least one one-way platform', () => {
    expect(AUTHORED_CLIMB.platforms.some((p) => p.oneWay === true)).toBe(true);
  });
});