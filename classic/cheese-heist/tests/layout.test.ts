import { describe, expect, it } from 'vitest';
import { createLayout, MIN_TOUCH_SIZE } from '../src/game/layout';
import { KITCHEN, type Rect } from '../src/game/room';

const viewports = [
  { width: 1024, height: 768, label: '1024x768 landscape tablet' },
  { width: 1280, height: 720, label: '1280x720 landscape compact' },
  { width: 390, height: 844, label: '390x844 phone portrait' },
  { width: 768, height: 1024, label: '768x1024 portrait tablet' },
  { width: 1920, height: 1080, label: '1080p landscape' },
  { width: 640, height: 360, label: '640x360 small landscape' },
] as const;

function overlaps(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y
  );
}

describe('createLayout', () => {
  it('computes the fit zoom from the 1600x900 room', () => {
    const l = createLayout(1280, 720);
    expect(l.zoom).toBeCloseTo(720 / 900, 5);
    const l2 = createLayout(1024, 768);
    expect(l2.zoom).toBeCloseTo(1024 / 1600, 5);
  });

  it.each(viewports)
    ('keeps every touch zone at least 64 CSS px and inside the canvas at $label',
     ({ width, height }) => {
       const l = createLayout(width, height);
       expect(l.buttonSize).toBeGreaterThanOrEqual(MIN_TOUCH_SIZE);
       const zones = [l.touch.left, l.touch.right, l.touch.jump];
       for (const zone of zones) {
         expect(zone.width).toBe(l.buttonSize);
         expect(zone.height).toBe(l.buttonSize);
         expect(zone.x).toBeGreaterThanOrEqual(0);
         expect(zone.y).toBeGreaterThanOrEqual(0);
         expect(zone.x + zone.width).toBeLessThanOrEqual(width + 0.01);
         expect(zone.y + zone.height).toBeLessThanOrEqual(height + 0.01);
       }
     });

  it.each(viewports)
    ('keeps all bottom touch buttons separate at $label',
     ({ width, height }) => {
       const l = createLayout(width, height);
       const bottom = [l.touch.left, l.touch.right, l.touch.jump];
       for (let i = 0; i < bottom.length; i++) {
         for (let j = i + 1; j < bottom.length; j++) {
           expect(overlaps(bottom[i]!, bottom[j]!)).toBe(false);
         }
       }
     });

  it.each(viewports)
    ('keeps the pause button circle inside the canvas at $label',
     ({ width, height }) => {
       const l = createLayout(width, height);
       const r = l.hud.pauseButton.radius;
       expect(l.hud.pauseButton.x - r).toBeGreaterThanOrEqual(-0.01);
       expect(l.hud.pauseButton.y - r).toBeGreaterThanOrEqual(-0.01);
       expect(l.hud.pauseButton.x + r).toBeLessThanOrEqual(width + 0.01);
       expect(l.hud.pauseButton.y + r).toBeLessThanOrEqual(height + 0.01);
     });

  it('keeps the hint line and status text inside the canvas', () => {
    for (const { width, height } of viewports) {
      const l = createLayout(width, height);
      expect(l.hud.hint.x).toBeGreaterThan(0);
      expect(l.hud.hint.x).toBeLessThanOrEqual(width);
      expect(l.hud.hint.y).toBeGreaterThanOrEqual(0);
      expect(l.hud.hint.y).toBeLessThanOrEqual(height);
      expect(l.hud.status.x).toBeGreaterThanOrEqual(0);
      expect(l.hud.status.y).toBeGreaterThanOrEqual(0);
      expect(l.hud.status.x).toBeLessThanOrEqual(width);
      expect(l.hud.status.y).toBeLessThanOrEqual(height);
    }
  });

  it('zooms the room to fit exactly on a 16:9 canvas', () => {
    const l = createLayout(1600, 900);
    expect(l.zoom).toBeCloseTo(1, 5);
    expect(l.gameWidth).toBe(1600);
    expect(l.gameHeight).toBe(900);
    expect(KITCHEN.worldWidth).toBe(1600);
    expect(KITCHEN.worldHeight).toBe(900);
  });
});
