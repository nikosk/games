import { describe, expect, it } from 'vitest';
import { createKitchenLayout, layoutRectsAreSafe } from '../src/game/layout';

const viewports = [[1280, 720], [1024, 768], [768, 1024], [640, 360], [390, 844], [1024, 420]] as const;
describe('responsive kitchen layout', () => {
  for (const [width, height] of viewports) it(`${width}x${height} keeps every target inside the viewport`, () => {
    const layout = createKitchenLayout(width, height);
    expect(layoutRectsAreSafe(layout, width, height)).toBe(true);
    for (const rect of Object.values(layout.buttons)) expect(rect.width).toBeGreaterThanOrEqual(44);
    for (const rect of Object.values(layout.directions)) expect(rect.width).toBeGreaterThanOrEqual(44);
    expect(layout.instructions.width).toBeGreaterThan(0);
    expect(layout.status.width).toBeGreaterThan(0);
  });
});
