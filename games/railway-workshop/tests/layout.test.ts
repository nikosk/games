import { describe, expect, it } from 'vitest';
import { createWorkshopLayout } from '../src/game/layout';

describe('responsive workshop layout', () => {
  it.each([
    [1024, 768],
    [1280, 720],
    [1366, 1024],
  ])('fills a landscape viewport at %d × %d', (width, height) => {
    const layout = createWorkshopLayout(width, height);

    expect(layout.boardWidth / width).toBeGreaterThan(0.8);
    expect(layout.boardHeight / height).toBeGreaterThan(0.8);
    expect(layout.boardX).toBeGreaterThanOrEqual(0);
    expect(layout.boardY).toBeGreaterThanOrEqual(0);
    expect(layout.boardX + layout.boardWidth).toBeLessThanOrEqual(width);
    expect(layout.boardY + layout.boardHeight).toBeLessThanOrEqual(height);
  });

  it('keeps the overlaid controls inside the board', () => {
    const layout = createWorkshopLayout(1024, 768);

    expect(layout.controlsX).toBeGreaterThan(layout.hudX);
    expect(layout.controlsY).toBeGreaterThanOrEqual(layout.hudY);
    expect(layout.controlsX).toBeLessThan(layout.boardX + layout.boardWidth);
    expect(layout.controlsScale).toBeGreaterThanOrEqual(1);
  });
});
