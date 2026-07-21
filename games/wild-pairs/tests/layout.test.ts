import { describe, expect, it } from 'vitest';
import { createWildPairsLayout, type LayoutMode } from '../src/game/layout';

const viewports = [
  { width: 1024, height: 768, mode: 'side' },
  { width: 1280, height: 720, mode: 'side' },
  { width: 640, height: 360, mode: 'compact' },
  { width: 390, height: 844, mode: 'portrait' },
  { width: 768, height: 1024, mode: 'portrait' },
] as const satisfies ReadonlyArray<{ width: number; height: number; mode: LayoutMode }>;

describe('responsive Wild Pairs layout', () => {
  it.each(viewports)('fits every card and the panel at $width × $height', ({ width, height, mode }) => {
    const layout = createWildPairsLayout(width, height);

    expect(layout.mode).toBe(mode);
    expect(layout.cards).toHaveLength(8);
    for (const rect of [...layout.cards, layout.panel]) {
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.y).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(width + 0.01);
      expect(rect.y + rect.height).toBeLessThanOrEqual(height + 0.01);
    }
  });

  it.each(viewports)('keeps cards comfortably tappable at $width × $height', ({ width, height }) => {
    const layout = createWildPairsLayout(width, height);

    expect(Math.min(...layout.cards.map((card) => card.width))).toBeGreaterThanOrEqual(100);
    expect(Math.min(...layout.cards.map((card) => card.height))).toBeGreaterThanOrEqual(100);
  });

  it('gives the card grid most of a landscape tablet', () => {
    const layout = createWildPairsLayout(1024, 768);

    expect(layout.grid.width / layout.width).toBeGreaterThan(0.68);
    expect(layout.panel.x).toBeGreaterThan(layout.grid.x + layout.grid.width);
  });
});
