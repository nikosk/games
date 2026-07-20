import { describe, expect, it } from 'vitest';
import { createWorkshopLayout } from '../src/game/layout';

describe('responsive workshop layout', () => {
  it.each([
    [1024, 768],
    [1280, 720],
    [1366, 1024],
  ])('keeps the map dominant at %d × %d', (width, height) => {
    const layout = createWorkshopLayout(width, height);

    expect(layout.boardWidth / width).toBeGreaterThan(0.62);
    expect(layout.boardHeight / height).toBeGreaterThan(0.75);
    expect((layout.boardWidth + layout.panelWidth) / width).toBeGreaterThan(0.85);
    expect(layout.boardX).toBeGreaterThanOrEqual(0);
    expect(layout.boardY).toBeGreaterThanOrEqual(0);
    expect(layout.panelX + layout.panelWidth).toBeLessThanOrEqual(width);
    expect(layout.panelY + layout.panelHeight).toBeLessThanOrEqual(height);
  });

  it('places the controls inside the right side panel', () => {
    const layout = createWorkshopLayout(1024, 768);

    expect(layout.panelX).toBeGreaterThan(layout.boardX + layout.boardWidth);
    expect(layout.controlsX).toBeGreaterThanOrEqual(layout.panelX);
    expect(layout.controlsY).toBeGreaterThanOrEqual(layout.panelY);
    expect(layout.controlsScale).toBeGreaterThan(0.85);
  });
});
