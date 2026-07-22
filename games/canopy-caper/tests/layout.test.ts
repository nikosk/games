import { describe, expect, it } from 'vitest';
import { createLayout } from '../src/game/layout';
import type { Rect } from '../src/game/layout';

const viewports = [
  { width: 1024, height: 768, label: '1024x768 landscape tablet' },
  { width: 1280, height: 720, label: '1280x720 landscape compact' },
  { width: 390, height: 844, label: '390x844 phone portrait' },
  { width: 768, height: 1024, label: '768x1024 portrait tablet' },
  { width: 1920, height: 1080, label: '1080p landscape' },
  { width: 640, height: 360, label: '640x360 small landscape' },
] as const;

const MIN_TOUCH_CSS = 64;

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}

describe('createLayout', () => {
  it('uses canvas width as gameWidth and stores the world-design scale', () => {
    const l = createLayout(800, 600);
    expect(l.gameWidth).toBe(800);
    expect(l.scale).toBeCloseTo(1, 3);
  });

  it('keeps gameHeight equal to the canvas height (RESIZE mode)', () => {
    const l = createLayout(1024, 768);
    expect(l.scale).toBeCloseTo(1024 / 800, 3);
    // In RESIZE mode, canvas = world = screen units; gameHeight is the
    // actual canvas height, not a scaled design height.
    expect(l.gameHeight).toBe(768);
    expect(l.gameWidth).toBe(1024);
  });

  // Previously this test divided buttonSize by the (never-applied) scale,
  // which masked the canvas-coordinate blocker. With RESIZE + zoom 1,
  // buttonSize already IS in CSS pixels.
  it.each(viewports)
    ('keeps the jump button at least 64 CSS px at $label',
     ({ width, height }) => {
       const l = createLayout(width, height);
       expect(l.buttonSize).toBeGreaterThanOrEqual(MIN_TOUCH_CSS);
     });

  it.each(viewports)
    ('keeps touch zones within the actual canvas bounds at $label',
     ({ width, height }) => {
       const l = createLayout(width, height);
       for (const zone of [l.touchLeftZone, l.touchRightZone, l.touchJumpZone]) {
         expect(zone.width).toBeGreaterThan(0);
         expect(zone.height).toBeGreaterThan(0);
         // All positions use real canvas CSS-pixel coordinates.
         expect(zone.x).toBeGreaterThanOrEqual(0);
         expect(zone.y).toBeGreaterThanOrEqual(0);
         expect(zone.x + zone.width).toBeLessThanOrEqual(width + 0.01);
         expect(zone.y + zone.height).toBeLessThanOrEqual(height + 0.01);
       }
     });

  it.each(viewports)
    ('keeps the jump button on-screen at $label',
     ({ width, height }) => {
       const l = createLayout(width, height);
       const jb = l.touchJumpZone;
       expect(jb.x).toBeGreaterThanOrEqual(0);
       expect(jb.y).toBeGreaterThanOrEqual(0);
       expect(jb.x + jb.width).toBeLessThanOrEqual(width);
       expect(jb.y + jb.height).toBeLessThanOrEqual(height);
     });

  it.each(viewports)
    ('keeps the pause button circle inside the canvas at $label',
     ({ width, height }) => {
       const l = createLayout(width, height);
       const r = l.hud.pauseButton.radius;
       // Center must stay inside.
       expect(l.hud.pauseButton.x).toBeGreaterThanOrEqual(0);
       expect(l.hud.pauseButton.y).toBeGreaterThanOrEqual(0);
       expect(l.hud.pauseButton.x).toBeLessThanOrEqual(width);
       expect(l.hud.pauseButton.y).toBeLessThanOrEqual(height);
       // Full circle (center ± radius) must stay inside the canvas.
       expect(l.hud.pauseButton.x - r).toBeGreaterThanOrEqual(-0.01);
       expect(l.hud.pauseButton.y - r).toBeGreaterThanOrEqual(-0.01);
       expect(l.hud.pauseButton.x + r).toBeLessThanOrEqual(width + 0.01);
       expect(l.hud.pauseButton.y + r).toBeLessThanOrEqual(height + 0.01);
     });

  it.each(viewports)
    ('does not overlap movement zones at $label',
     ({ width, height }) => {
       const l = createLayout(width, height);
       expect(overlaps(l.touchLeftZone, l.touchRightZone)).toBe(false);
     });

  it('keeps the pause button fully inside 1024x768 and 1280x720 specifically', () => {
    // These two viewports were the original blockers: the fixed 28-px
    // margin let the pause circle (radius up to 38.4 px) spill past the
    // right and top edges.
    for (const { width, height } of [
      { width: 1024, height: 768 },
      { width: 1280, height: 720 },
    ]) {
      const l = createLayout(width, height);
      const r = l.hud.pauseButton.radius;
      expect(r).toBeGreaterThan(28); // confirms the circle is larger than the old margin
      expect(l.hud.pauseButton.x - r).toBeGreaterThanOrEqual(0);
      expect(l.hud.pauseButton.y - r).toBeGreaterThanOrEqual(0);
      expect(l.hud.pauseButton.x + r).toBeLessThanOrEqual(width);
      expect(l.hud.pauseButton.y + r).toBeLessThanOrEqual(height);
    }
  });

  it('keeps the camera dead zone within a reasonable fraction of the viewport', () => {
    for (const { width, height } of viewports) {
      const l = createLayout(width, height);
      expect(l.cameraDeadZone.top).toBeGreaterThanOrEqual(height * 0.2);
      expect(l.cameraDeadZone.top).toBeLessThanOrEqual(height * 0.4);
      expect(l.cameraDeadZone.bottom).toBeGreaterThanOrEqual(height * 0.25);
      expect(l.cameraDeadZone.bottom).toBeLessThanOrEqual(height * 0.45);
    }
  });

  it('keeps HUD elements and pause button circle within the canvas bounds', () => {
    for (const { width, height } of viewports) {
      const l = createLayout(width, height);
      expect(l.hud.fruitCounter.x).toBeGreaterThanOrEqual(0);
      expect(l.hud.fruitCounter.y).toBeGreaterThanOrEqual(0);
      expect(l.hud.fruitCounter.x).toBeLessThanOrEqual(width);
      expect(l.hud.fruitCounter.y).toBeLessThanOrEqual(height);
      const r = l.hud.pauseButton.radius;
      expect(r).toBeGreaterThan(0);
      expect(l.hud.pauseButton.x - r).toBeGreaterThanOrEqual(-0.01);
      expect(l.hud.pauseButton.y - r).toBeGreaterThanOrEqual(-0.01);
      expect(l.hud.pauseButton.x + r).toBeLessThanOrEqual(width + 0.01);
      expect(l.hud.pauseButton.y + r).toBeLessThanOrEqual(height + 0.01);
    }
  });
});