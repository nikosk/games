import { describe, expect, it } from 'vitest';
import { beltSlotRect, computeControls, createLayout, DESIGN_CELL_SIZE, type ControlRect } from '../src/game/layout';
import { BELT_SLOTS, COLS, ROWS } from '../src/game/level';

const viewports = [
  [1280, 800],
  [1280, 720],
  [1024, 768],
  [800, 450],
  [780, 437],
  [768, 1024],
  [390, 844],
  [320, 568],
] as const;

function expectInside(rect: ControlRect, x: number, y: number, width: number, height: number): void {
  expect(rect.x, `${rect.key} left`).toBeGreaterThanOrEqual(x);
  expect(rect.y, `${rect.key} top`).toBeGreaterThanOrEqual(y);
  expect(rect.x + rect.width, `${rect.key} right`).toBeLessThanOrEqual(x + width);
  expect(rect.y + rect.height, `${rect.key} bottom`).toBeLessThanOrEqual(y + height);
}

function overlaps(a: ControlRect, b: ControlRect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

describe('responsive assembly layout', () => {
  it.each(viewports)('keeps all regions and controls in bounds at %d×%d', (width, height) => {
    const layout = createLayout(width, height);
    expect(layout.boardScale).toBe(layout.cellSize / DESIGN_CELL_SIZE);
    expect(layout.boardWidth).toBe(COLS * layout.cellSize);
    expect(layout.boardHeight).toBe(ROWS * layout.cellSize);
    expect(layout.boardX).toBeGreaterThanOrEqual(0);
    expect(layout.boardY).toBeGreaterThanOrEqual(0);
    expect(layout.boardX + layout.boardWidth).toBeLessThanOrEqual(width);
    expect(layout.beltY + layout.beltHeight).toBeLessThanOrEqual(height);
    expect(layout.panelX + layout.panelWidth).toBeLessThanOrEqual(width);
    expect(layout.panelY + layout.panelHeight).toBeLessThanOrEqual(height);

    const controls = computeControls(layout);
    const interactive = [
      ...controls.palette,
      controls.play,
      controls.step,
      controls.undo,
      controls.clear,
      controls.sound,
      controls.fullscreen,
    ];
    for (const rect of interactive) {
      expectInside(rect, layout.panelX, layout.panelY, layout.panelWidth, layout.panelHeight);
      expect(rect.width, `${rect.key} width`).toBeGreaterThanOrEqual(44);
      expect(rect.height, `${rect.key} height`).toBeGreaterThanOrEqual(44);
    }
    for (let i = 0; i < interactive.length; i += 1) {
      for (let j = i + 1; j < interactive.length; j += 1) {
        expect(overlaps(interactive[i]!, interactive[j]!), `${interactive[i]!.key}/${interactive[j]!.key}`).toBe(false);
      }
    }
  });

  it.each([[1280, 800], [1280, 720], [1024, 768]] as const)('uses a roomy landscape board at %d×%d', (width, height) => {
    const layout = createLayout(width, height);
    expect(layout.stacked).toBe(false);
    expect(layout.panelX).toBeGreaterThan(layout.boardX + layout.boardWidth);
    expect(layout.cellSize).toBeGreaterThanOrEqual(width === 1280 && height === 720 ? 90 : 96);
    expect(layout.beltSlotWidth).toBeGreaterThanOrEqual(64);
    expect(layout.beltSlotHeight).toBeGreaterThanOrEqual(64);
  });

  it.each(viewports)('keeps an 8- and 10-slot belt in bounds and touchable at %d×%d', (width, height) => {
    for (const slots of [8, 10] as const) {
      const layout = createLayout(width, height, slots);
      expect(layout.beltY + layout.beltHeight).toBeLessThanOrEqual(height);
      expect(layout.panelY + layout.panelHeight).toBeLessThanOrEqual(height);
      expect(layout.beltRows * layout.beltCols).toBe(slots);
      expect(layout.beltCols).toBe(slots > 8 ? 5 : layout.beltRows === 2 ? 4 : slots);
      const seen = new Set<string>();
      for (let index = 0; index < slots; index += 1) {
        const slot = beltSlotRect(layout, index);
        expectInside(slot, layout.beltX, layout.beltY, layout.beltWidth, layout.beltHeight);
        expect(slot.width).toBeGreaterThanOrEqual(44);
        expect(slot.height).toBeGreaterThanOrEqual(44);
        const key = `${slot.x},${slot.y},${slot.width},${slot.height}`;
        expect(seen.has(key), `belt slot ${index} overlaps another at ${slots} slots`).toBe(false);
        seen.add(key);
      }
    }
  });

  it('uses a non-overlapping 2×2 palette and touchable compact actions at 780×437', () => {
    const layout = createLayout(780, 437);
    const controls = computeControls(layout);
    expect(layout.stacked).toBe(false);
    expect(controls.palette[0]!.y).toBe(controls.palette[1]!.y);
    expect(controls.palette[2]!.y).toBeGreaterThan(controls.palette[0]!.y);
    expect(controls.palette[0]!.x).toBe(controls.palette[2]!.x);
    expect(controls.play.width).toBeGreaterThan(controls.step.width);

    const interactive = [
      ...controls.palette,
      controls.play,
      controls.step,
      controls.undo,
      controls.clear,
      controls.sound,
      controls.fullscreen,
    ];
    for (const rect of interactive) {
      expectInside(rect, layout.panelX, layout.panelY, layout.panelWidth, layout.panelHeight);
      expect(rect.width).toBeGreaterThanOrEqual(44);
      expect(rect.height).toBeGreaterThanOrEqual(44);
    }
    for (let i = 0; i < interactive.length; i += 1) {
      for (let j = i + 1; j < interactive.length; j += 1) {
        expect(overlaps(interactive[i]!, interactive[j]!)).toBe(false);
      }
    }
  });

  it('wraps the belt only on narrow phones and keeps every slot touchable', () => {
    const narrow = createLayout(320, 568);
    expect(narrow.beltRows).toBe(2);
    expect(narrow.beltCols).toBe(4);
    const regular = createLayout(390, 844);
    expect(regular.beltRows).toBe(1);
    expect(regular.beltCols).toBe(BELT_SLOTS);
    const wideTen = createLayout(1280, 720, 10);
    expect(wideTen.beltRows).toBe(2);
    expect(wideTen.beltCols).toBe(5);
    for (const layout of [narrow, regular, wideTen]) {
      for (let index = 0; index < (layout.beltRows * layout.beltCols); index += 1) {
        const slot = beltSlotRect(layout, index);
        expectInside(slot, layout.beltX, layout.beltY, layout.beltWidth, layout.beltHeight);
        expect(slot.width).toBeGreaterThanOrEqual(44);
        expect(slot.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  it('keeps the height-limited landscape belt aligned with the board', () => {
    const layout = createLayout(1280, 657);
    expect(layout.beltWidth).toBe(layout.boardWidth);
    expect(layout.beltSlotWidth).toBe(Math.floor(layout.boardWidth / BELT_SLOTS));
    const left = layout.boardX;
    const right = layout.width - (layout.panelX + layout.panelWidth);
    expect(Math.abs(left - right)).toBeLessThanOrEqual(1);
  });
});
