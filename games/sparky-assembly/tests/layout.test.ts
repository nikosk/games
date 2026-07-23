import { describe, expect, it } from 'vitest';
import { createLayout, DESIGN_CELL_SIZE } from '../src/game/layout';
import { COLS, ROWS, BELT_SLOTS } from '../src/game/level';

describe('createLayout – landscape (tablet)', () => {
  it('uses side-by-side layout with a right-side panel', () => {
    const layout = createLayout(1280, 800);
    expect(layout.stacked).toBe(false);
    expect(layout.panelX).toBeGreaterThan(layout.boardX + layout.boardWidth);
    expect(layout.cellSize).toBeGreaterThan(40);
    expect(layout.beltSlotSize).toBeGreaterThanOrEqual(1);
    expect(layout.boardScale).toBe(layout.cellSize / DESIGN_CELL_SIZE);
  });

  it('keeps board, belt, and panel within bounds', () => {
    const layout = createLayout(1024, 768);
    expect(layout.boardX).toBeGreaterThanOrEqual(0);
    expect(layout.boardY).toBeGreaterThanOrEqual(0);
    expect(layout.boardX + layout.boardWidth).toBeLessThanOrEqual(layout.width);
    expect(layout.beltY + layout.beltHeight).toBeLessThanOrEqual(layout.height);
    expect(layout.panelX + layout.panelWidth).toBeLessThanOrEqual(layout.width);
    expect(layout.panelY + layout.panelHeight).toBeLessThanOrEqual(layout.height);
  });
});

describe('createLayout – portrait (phone 390×844)', () => {
  it('uses stacked layout with a full-width panel below the belt', () => {
    const layout = createLayout(390, 844);
    expect(layout.stacked).toBe(true);
    // Panel is below the belt, spans the width.
    expect(layout.panelY).toBeGreaterThan(layout.beltY + layout.beltHeight);
    expect(layout.panelX).toBeGreaterThanOrEqual(0);
    expect(layout.panelX + layout.panelWidth).toBeLessThanOrEqual(layout.width);
    // Board is centred and comfortably sized (not tiny).
    expect(layout.cellSize).toBeGreaterThanOrEqual(50);
    expect(layout.boardWidth).toBe(COLS * layout.cellSize);
    expect(layout.boardHeight).toBe(ROWS * layout.cellSize);
  });

  it('produces non-negative panel height for controls', () => {
    const layout = createLayout(390, 844);
    expect(layout.panelHeight).toBeGreaterThanOrEqual(120);
  });

  it('keeps every region inside the viewport', () => {
    const layout = createLayout(390, 844);
    expect(layout.boardX).toBeGreaterThanOrEqual(0);
    expect(layout.boardY).toBeGreaterThanOrEqual(0);
    expect(layout.boardX + layout.boardWidth).toBeLessThanOrEqual(layout.width);
    expect(layout.beltY + layout.beltHeight).toBeLessThanOrEqual(layout.height);
    expect(layout.panelY + layout.panelHeight).toBeLessThanOrEqual(layout.height);
  });

  it('sizes belt slots to fill the width', () => {
    const layout = createLayout(390, 844);
    expect(layout.beltSlotSize).toBe(Math.floor((layout.width - 24) / BELT_SLOTS));
    expect(layout.beltSlotSize).toBeGreaterThanOrEqual(1);
  });
});

describe('createLayout – very narrow portrait', () => {
  it('still produces a usable stacked layout', () => {
    const layout = createLayout(320, 568);
    expect(layout.stacked).toBe(true);
    expect(layout.cellSize).toBeGreaterThanOrEqual(1);
    expect(layout.panelHeight).toBeGreaterThanOrEqual(120);
    expect(layout.panelY + layout.panelHeight).toBeLessThanOrEqual(568);
  });
});