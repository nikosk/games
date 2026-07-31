import { clamp, type Rect } from './room';

export interface TouchButtons {
  readonly left: Rect;
  readonly right: Rect;
  readonly jump: Rect;
}

export interface HudLayout {
  readonly status: { readonly x: number; readonly y: number };
  readonly pauseButton: { readonly x: number; readonly y: number; readonly radius: number };
  /** Contextual hint line, just above the movement controls. */
  readonly hint: { readonly x: number; readonly y: number };
}

export interface CheeseLayout {
  readonly gameWidth: number;
  readonly gameHeight: number;
  /** Camera zoom that fits the 1600x900 room to the canvas. */
  readonly zoom: number;
  readonly buttonSize: number;
  readonly touch: TouchButtons;
  readonly hud: HudLayout;
}

/** Minimum touch target diameter in CSS pixels. */
export const MIN_TOUCH_SIZE = 64;

const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 900;
const MAX_BUTTON_CSS = 92;
const BUTTON_MARGIN = 14;
const BUTTON_GAP = 10;

/**
 * Responsive layout for Cheese Heist.
 *
 * The room only needs left, right, and jump. The spoon, mug, cheese, and vent
 * are deliberately automatic so the player can concentrate on moving through
 * the kitchen instead of hunting for context buttons.
 */
export function createLayout(width: number, height: number): CheeseLayout {
  const zoom = clamp(Math.min(width / WORLD_WIDTH, height / WORLD_HEIGHT), 0.1, 1);
  const buttonSize = clamp(Math.min(width, height) * 0.13, MIN_TOUCH_SIZE, MAX_BUTTON_CSS);
  const rowY = height - buttonSize - BUTTON_MARGIN;

  const left: Rect = { x: BUTTON_MARGIN, y: rowY, width: buttonSize, height: buttonSize };
  const right: Rect = {
    x: BUTTON_MARGIN + buttonSize + BUTTON_GAP,
    y: rowY,
    width: buttonSize,
    height: buttonSize,
  };
  const jump: Rect = {
    x: width - buttonSize - BUTTON_MARGIN,
    y: rowY,
    width: buttonSize,
    height: buttonSize,
  };

  const pauseRadius = buttonSize * 0.5;
  return {
    gameWidth: width,
    gameHeight: height,
    zoom,
    buttonSize,
    touch: { left, right, jump },
    hud: {
      status: { x: 16, y: 12 },
      pauseButton: {
        x: width - pauseRadius - 8,
        y: pauseRadius + 8,
        radius: pauseRadius,
      },
      hint: { x: width / 2, y: Math.max(0, rowY - 8) },
    },
  };
}
