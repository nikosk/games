import { describe, expect, it } from 'vitest';
import { createWorkshopLayout } from '../src/game/layout';

describe('responsive workshop layout', () => {
  it.each([
    [1024, 768],
    [1280, 720],
    [1366, 1024],
    [768, 1024],
    [1280, 800],
  ])('keeps the map dominant at %d × %d', (width, height) => {
    const layout = createWorkshopLayout(width, height);
    const isPortrait = height > width;

    // Board fills most of the smaller dimension
    expect(layout.boardWidth / width).toBeGreaterThan(0.62);
    // In portrait the board is width-limited; in landscape it fills most of the height
    if (isPortrait) {
      expect(layout.boardHeight / height).toBeGreaterThan(0.40);
    } else {
      expect(layout.boardHeight / height).toBeGreaterThan(0.75);
    }
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

  it('keeps controls inside the panel at portrait viewport', () => {
    const layout = createWorkshopLayout(768, 1024);

    expect(layout.controlsX).toBeGreaterThanOrEqual(layout.panelX);
    expect(layout.controlsY).toBeGreaterThanOrEqual(layout.panelY);
    // Controls (design 280px wide) should not overflow panel when scaled
    expect(layout.controlsX + 280 * layout.controlsScale).toBeLessThanOrEqual(layout.panelX + layout.panelWidth + 1);
    // Nav buttons at design 68x56 must be inside panel bounds after scaling
    expect(layout.controlsScale).toBeGreaterThan(0.65);
  });
});
