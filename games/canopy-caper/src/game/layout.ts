export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface CameraDeadZone {
  readonly top: number;
  readonly bottom: number;
}

export interface HudLayout {
  readonly fruitCounter: { readonly x: number; readonly y: number };
  readonly pauseButton: { readonly x: number; readonly y: number; readonly radius: number };
}

export interface CanopyLayout {
  /** Canvas width the layout was computed for, in CSS pixels. */
  readonly gameWidth: number;
  /** Canvas height the layout was computed for, in CSS pixels. */
  readonly gameHeight: number;
  /** Ratio of canvas width to the 800-px world design width —
   * informational only; positions use canvas coordinates directly. */
  readonly scale: number;
  readonly cameraDeadZone: CameraDeadZone;
  /** Touch button diameter in CSS pixels (≥ 64). */
  readonly buttonSize: number;
  readonly touchLeftZone: Rect;
  readonly touchRightZone: Rect;
  readonly touchJumpZone: Rect;
  readonly hud: HudLayout;
}

/** Minimum touch target diameter in CSS pixels. */
const MIN_BUTTON_CSS = 64;

/** Padding (CSS px) between the pause button circle and the canvas edge. */
const PAUSE_MARGIN = 8;

/** Authoring width of the game world, used only for the informational scale. */
const DESIGN_WIDTH = 800;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

/**
 * Compute the responsive layout for the Canopy Caper climb.
 *
 * The Phaser Scale mode is RESIZE with camera zoom 1, so canvas, world,
 * and screen units coincide. Every screen-fixed HUD element and touch
 * zone is therefore positioned directly in canvas CSS-pixel coordinates.
 * The two circular movement buttons sit side by side at bottom-left, while
 * the jump button is anchored at bottom-right.
 */
export function createLayout(width: number, height: number): CanopyLayout {
  const buttonSize = clamp(Math.min(width, height) * 0.14, MIN_BUTTON_CSS, 96);
  const buttonRadius = buttonSize / 2;
  const buttonMargin = 16;
  const movementButtonGap = 12;
  const buttonY = height - buttonSize - buttonMargin;

  const touchLeftZone: Rect = {
    x: buttonMargin,
    y: buttonY,
    width: buttonSize,
    height: buttonSize,
  };

  const touchRightZone: Rect = {
    x: buttonMargin + buttonSize + movementButtonGap,
    y: buttonY,
    width: buttonSize,
    height: buttonSize,
  };

  const touchJumpZone: Rect = {
    x: width - buttonSize - buttonMargin,
    y: buttonY,
    width: buttonSize,
    height: buttonSize,
  };

  // Pause button circle: position the center so the entire circle stays
  // inside the canvas at every tested size (the previous fixed 28-px
  // margin let the circle spill out when the radius exceeded 28 px).
  const pauseRadius = buttonRadius * 0.8;
  const hud: HudLayout = {
    fruitCounter: { x: 20, y: 20 },
    pauseButton: {
      x: width - pauseRadius - PAUSE_MARGIN,
      y: pauseRadius + PAUSE_MARGIN,
      radius: pauseRadius,
    },
  };

  return {
    gameWidth: width,
    gameHeight: height,
    scale: width / DESIGN_WIDTH,
    cameraDeadZone: {
      top: height * 0.25,
      bottom: height * 0.35,
    },
    buttonSize,
    touchLeftZone,
    touchRightZone,
    touchJumpZone,
    hud,
  };
}