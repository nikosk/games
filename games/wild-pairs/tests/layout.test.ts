import { describe, expect, it } from 'vitest';
import { createWildPairsLayout, type LayoutMode, type Rect } from '../src/game/layout';
import { DIFFICULTIES } from '../src/game/rules';

const viewports = [
  { width: 1024, height: 768, mode: 'side' },
  { width: 1280, height: 720, mode: 'side' },
  { width: 640, height: 360, mode: 'compact' },
  { width: 1024, height: 420, mode: 'compact' },
  { width: 390, height: 844, mode: 'portrait' },
  { width: 768, height: 1024, mode: 'portrait' },
] as const satisfies ReadonlyArray<{ width: number; height: number; mode: LayoutMode }>;

function overlaps(first: Rect, second: Rect): boolean {
  return first.x < second.x + second.width
    && first.x + first.width > second.x
    && first.y < second.y + second.height
    && first.y + first.height > second.y;
}

describe.each(DIFFICULTIES)('$label responsive layout', (difficulty) => {
  it.each(viewports)('fits every card and the panel at $width × $height', ({ width, height, mode }) => {
    const layout = createWildPairsLayout(width, height, difficulty);

    expect(layout.mode).toBe(mode);
    expect(layout.cards).toHaveLength(difficulty.pairs * 2);
    expect(layout.rows * layout.columns).toBe(difficulty.pairs * 2);
    for (const rect of [...layout.cards, layout.panel]) {
      expect(rect.width).toBeGreaterThan(0);
      expect(rect.height).toBeGreaterThan(0);
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.y).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(width + 0.01);
      expect(rect.y + rect.height).toBeLessThanOrEqual(height + 0.01);
    }
  });

  it.each(viewports)('keeps cards separate at $width × $height', ({ width, height }) => {
    const cards = createWildPairsLayout(width, height, difficulty).cards;

    for (let first = 0; first < cards.length; first += 1) {
      for (let second = first + 1; second < cards.length; second += 1) {
        expect(overlaps(cards[first]!, cards[second]!)).toBe(false);
      }
    }
  });
});

describe('layout priorities', () => {
  it.each(viewports)('keeps the 2 × 4 cards comfortably tappable at $width × $height', ({ width, height }) => {
    const layout = createWildPairsLayout(width, height, DIFFICULTIES[0]);

    expect(Math.min(...layout.cards.map((card) => card.width))).toBeGreaterThanOrEqual(100);
    expect(Math.min(...layout.cards.map((card) => card.height))).toBeGreaterThanOrEqual(100);
  });

  it('keeps even the dense compact board above a practical minimum', () => {
    const layout = createWildPairsLayout(640, 360, DIFFICULTIES[3]);

    expect(Math.min(...layout.cards.map((card) => card.width))).toBeGreaterThanOrEqual(90);
    expect(Math.min(...layout.cards.map((card) => card.height))).toBeGreaterThanOrEqual(36);
  });

  it('gives the default card grid most of a landscape tablet', () => {
    const layout = createWildPairsLayout(1024, 768, DIFFICULTIES[0]);

    expect(layout.grid.width / layout.width).toBeGreaterThan(0.68);
    expect(layout.panel.x).toBeGreaterThan(layout.grid.x + layout.grid.width);
  });

  it('transposes non-square boards in portrait', () => {
    const layout = createWildPairsLayout(390, 844, DIFFICULTIES[1]);

    expect(layout.columns).toBe(3);
    expect(layout.rows).toBe(4);
  });
});
