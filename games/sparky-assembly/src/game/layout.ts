import { COLS, ROWS, BELT_SLOTS } from './level';

export const DESIGN_CELL_SIZE = 80;

/** Width below which the eight belt slots wrap into two rows of four. */
export const BELT_WRAP_WIDTH = 390;

export interface AssemblyLayout {
  readonly width: number;
  readonly height: number;
  readonly stacked: boolean;
  readonly boardX: number;
  readonly boardY: number;
  readonly boardWidth: number;
  readonly boardHeight: number;
  readonly cellSize: number;
  readonly boardScale: number;
  readonly beltX: number;
  readonly beltY: number;
  readonly beltWidth: number;
  readonly beltHeight: number;
  /** Slot width (kept as an alias for slot width for backward compatibility). */
  readonly beltSlotSize: number;
  readonly beltSlotWidth: number;
  readonly beltSlotHeight: number;
  readonly beltRows: number;
  readonly beltCols: number;
  readonly beltGap: number;
  readonly panelX: number;
  readonly panelY: number;
  readonly panelWidth: number;
  readonly panelHeight: number;
}

export interface ControlRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly key: string;
}

export interface ControlLayout {
  readonly objective: ControlRect;
  readonly status: ControlRect;
  readonly palette: readonly ControlRect[];
  readonly play: ControlRect;
  readonly step: ControlRect;
  readonly undo: ControlRect;
  readonly clear: ControlRect;
  readonly sound: ControlRect;
  readonly fullscreen: ControlRect;
  readonly hint: ControlRect | null;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function createLayout(width: number, height: number): AssemblyLayout {
  const stacked = width < height;
  if (stacked) return stackedLayout(width, height);
  return sideBySideLayout(width, height);
}

function sideBySideLayout(width: number, height: number): AssemblyLayout {
  const margin = clamp(Math.min(width, height) * 0.03, 12, 28);
  const gap = clamp(width * 0.014, 12, 20);
  const panelWidth = clamp(width * 0.26, 220, 300);

  const availableBoardWidth = width - margin * 2 - gap - panelWidth;
  const beltHeight = clamp(availableBoardWidth * 0.17, 64, 112);

  const availableBoardHeight = height - margin * 2 - gap - beltHeight;
  const cellSize = Math.min(availableBoardWidth / COLS, availableBoardHeight / ROWS);
  const boardWidth = cellSize * COLS;
  const boardHeight = cellSize * ROWS;

  // Belt spans the actual board width so it stays aligned with the board
  // even when the board height (not width) is what limits cell size.
  const beltWidth = boardWidth;
  const beltSlotWidth = Math.floor(beltWidth / BELT_SLOTS);
  const beltCols = BELT_SLOTS;
  const beltRows = 1;
  const beltGap = 0;
  const beltSlotHeight = beltHeight;

  const contentHeight = boardHeight + gap + beltHeight;

  // Center the board + gap + panel group instead of anchoring it left.
  const groupWidth = boardWidth + gap + panelWidth;
  const boardX = Math.round((width - groupWidth) / 2);
  const boardY = Math.round((height - contentHeight) / 2);
  const boardScale = cellSize / DESIGN_CELL_SIZE;

  const beltX = boardX + (boardWidth - beltSlotWidth * BELT_SLOTS) / 2;
  const beltY = boardY + boardHeight + gap;

  const panelX = boardX + boardWidth + gap;
  const panelY = boardY;
  const panelHeight = contentHeight;

  return {
    width,
    height,
    stacked: false,
    boardX,
    boardY,
    boardWidth,
    boardHeight,
    cellSize,
    boardScale,
    beltX,
    beltY,
    beltWidth,
    beltHeight,
    beltSlotSize: beltSlotWidth,
    beltSlotWidth,
    beltSlotHeight,
    beltRows,
    beltCols,
    beltGap,
    panelX,
    panelY,
    panelWidth,
    panelHeight,
  };
}

function stackedLayout(width: number, height: number): AssemblyLayout {
  const margin = clamp(Math.min(width, height) * 0.03, 10, 24);
  const gap = clamp(width * 0.02, 8, 16);

  // Two rows of four below 390px keep each slot a usable touch target.
  const wrapped = width < BELT_WRAP_WIDTH;
  const beltCols = wrapped ? 4 : BELT_SLOTS;
  const beltRows = wrapped ? 2 : 1;
  const slotGap = wrapped ? 6 : 0;
  const innerW = width - margin * 2;
  const beltSlotWidth = Math.floor((innerW - (beltCols - 1) * slotGap) / beltCols);
  const beltSlotHeight = clamp(Math.round(beltSlotWidth * 0.78), 44, 84);
  const beltWidth = beltCols * beltSlotWidth + (beltCols - 1) * slotGap;
  const beltHeight = beltRows * beltSlotHeight + (beltRows - 1) * slotGap;

  // Reserve a compact control panel.
  const panelTargetHeight = clamp(height * 0.27, 230, 280);
  const boardAvailWidth = width - margin * 2;
  const boardAvailHeight = height - margin * 2 - gap - beltHeight - gap - panelTargetHeight;
  const cellSize = Math.min(boardAvailWidth / COLS, Math.max(boardAvailHeight, 0) / ROWS);
  const boardWidth = cellSize * COLS;
  const boardHeight = cellSize * ROWS;

  const boardX = Math.round((width - boardWidth) / 2);
  const boardY = margin;
  const boardScale = cellSize / DESIGN_CELL_SIZE;

  const beltX = Math.round((width - beltWidth) / 2);
  const beltY = boardY + boardHeight + gap;

  const panelX = margin;
  const panelY = beltY + beltHeight + gap;
  const panelWidth = width - margin * 2;
  const panelHeight = Math.max(height - panelY - margin, 230);

  return {
    width,
    height,
    stacked: true,
    boardX,
    boardY,
    boardWidth,
    boardHeight,
    cellSize,
    boardScale,
    beltX,
    beltY,
    beltWidth,
    beltHeight,
    beltSlotSize: beltSlotWidth,
    beltSlotWidth,
    beltSlotHeight,
    beltRows,
    beltCols,
    beltGap: slotGap,
    panelX,
    panelY,
    panelWidth,
    panelHeight,
  };
}

/** Deterministic control rectangles for a given layout. */
export function computeControls(layout: AssemblyLayout): ControlLayout {
  if (layout.stacked) return stackedControls(layout);
  return sideBySideControls(layout);
}

const STATUS_HEIGHT = 56;
const OBJECTIVE_HEIGHT = 30;
const PALETTE_MIN_HEIGHT = 52;
const ACTION_MIN_HEIGHT = 46;
const CLEAR_MIN_HEIGHT = 44;
const FOOTER_HEIGHT = 52;

function sideBySideControls(layout: AssemblyLayout): ControlLayout {
  const { panelX, panelY, panelWidth, panelHeight } = layout;
  if (panelHeight < 540) return compactSideBySideControls(layout);

  const pad = 16;
  const innerW = panelWidth - pad * 2;
  const gap = 8;

  const objective: ControlRect = {
    x: panelX + pad,
    y: panelY + pad,
    width: innerW,
    height: OBJECTIVE_HEIGHT,
    key: 'objective',
  };
  const status: ControlRect = {
    x: panelX + pad,
    y: objective.y + objective.height + 4,
    width: innerW,
    height: STATUS_HEIGHT,
    key: 'status',
  };

  const footerY = panelY + panelHeight - FOOTER_HEIGHT;
  const available = footerY - gap - (status.y + status.height);
  const slots = 4;
  const paletteH = clamp(
    (available - gap * 5 - 56 - 46 - 44) / slots,
    PALETTE_MIN_HEIGHT,
    74,
  );

  let y = status.y + status.height;
  const palette: ControlRect[] = [];
  for (let i = 0; i < slots; i += 1) {
    palette.push({
      x: panelX + pad,
      y: y + gap,
      width: innerW,
      height: paletteH,
      key: `palette-${i}`,
    });
    y += paletteH + gap;
  }

  const play: ControlRect = { x: panelX + pad, y: y + gap, width: innerW, height: 56, key: 'play' };
  y += 56 + gap;
  const halfW = (innerW - gap) / 2;
  const step: ControlRect = { x: panelX + pad, y, width: halfW, height: ACTION_MIN_HEIGHT, key: 'step' };
  const undo: ControlRect = { x: panelX + pad + halfW + gap, y, width: halfW, height: ACTION_MIN_HEIGHT, key: 'undo' };
  y += ACTION_MIN_HEIGHT + gap;
  const clear: ControlRect = { x: panelX + pad, y, width: innerW, height: CLEAR_MIN_HEIGHT, key: 'clear' };

  const btnR = Math.min(22, FOOTER_HEIGHT / 2 - 4);
  const sound: ControlRect = {
    x: panelX + pad,
    y: footerY + (FOOTER_HEIGHT - btnR * 2) / 2,
    width: btnR * 2,
    height: btnR * 2,
    key: 'sound',
  };
  const fullscreen: ControlRect = {
    x: panelX + pad + btnR * 2 + gap,
    y: footerY + (FOOTER_HEIGHT - btnR * 2) / 2,
    width: btnR * 2,
    height: btnR * 2,
    key: 'fullscreen',
  };
  return { objective, status, palette, play, step, undo, clear, sound, fullscreen, hint: null };
}

/** Low-height landscape keeps every action touchable without changing the roomy tablet panel. */
function compactSideBySideControls(layout: AssemblyLayout): ControlLayout {
  const { panelX, panelY, panelWidth, panelHeight } = layout;
  const pad = 10;
  const gap = 6;
  const innerW = panelWidth - pad * 2;
  const objective: ControlRect = {
    x: panelX + pad,
    y: panelY + pad,
    width: innerW,
    height: 24,
    key: 'objective',
  };
  const status: ControlRect = {
    x: panelX + pad,
    y: objective.y + objective.height + 2,
    width: innerW,
    height: 44,
    key: 'status',
  };

  let y = status.y + status.height + gap;
  const paletteGap = 6;
  const paletteW = (innerW - paletteGap) / 2;
  const paletteH = 44;
  const palette: ControlRect[] = Array.from({ length: 4 }, (_, index) => ({
    x: panelX + pad + (index % 2) * (paletteW + paletteGap),
    y: y + Math.floor(index / 2) * (paletteH + paletteGap),
    width: paletteW,
    height: paletteH,
    key: `palette-${index}`,
  }));
  y += paletteH * 2 + paletteGap + gap;

  const play: ControlRect = { x: panelX + pad, y, width: innerW, height: 48, key: 'play' };
  y += play.height + gap;
  const actionW = (innerW - gap * 2) / 3;
  const step: ControlRect = { x: panelX + pad, y, width: actionW, height: 44, key: 'step' };
  const undo: ControlRect = { x: step.x + actionW + gap, y, width: actionW, height: 44, key: 'undo' };
  const clear: ControlRect = { x: undo.x + actionW + gap, y, width: actionW, height: 44, key: 'clear' };

  const footerY = panelY + panelHeight - 44 - pad;
  const sound: ControlRect = { x: panelX + pad, y: footerY, width: 44, height: 44, key: 'sound' };
  const fullscreen: ControlRect = {
    x: sound.x + sound.width + gap,
    y: footerY,
    width: 44,
    height: 44,
    key: 'fullscreen',
  };
  return { objective, status, palette, play, step, undo, clear, sound, fullscreen, hint: null };
}

function stackedControls(layout: AssemblyLayout): ControlLayout {
  const { panelX, panelY, panelWidth, panelHeight } = layout;
  const pad = 12;
  const gap = 6;
  const innerW = panelWidth - pad * 2;

  // Header: objective on the left, sound + fullscreen on the right.
  const headerH = 44;
  const btnR = 22;
  const sound: ControlRect = {
    x: panelX + innerW + pad - btnR * 2,
    y: panelY + pad + (headerH - btnR * 2) / 2,
    width: btnR * 2,
    height: btnR * 2,
    key: 'sound',
  };
  const fullscreen: ControlRect = {
    x: sound.x - btnR * 2 - gap,
    y: sound.y,
    width: btnR * 2,
    height: btnR * 2,
    key: 'fullscreen',
  };
  const objective: ControlRect = {
    x: panelX + pad,
    y: panelY + pad + (headerH - 16) / 2,
    width: fullscreen.x - (panelX + pad) - gap,
    height: 16,
    key: 'objective',
  };
  const status: ControlRect = {
    x: panelX + pad,
    y: panelY + pad + headerH + gap,
    width: innerW,
    height: STATUS_HEIGHT,
    key: 'status',
  };

  const available = panelY + panelHeight - pad - (status.y + status.height) - gap;
  const paletteH = clamp((available - gap * 2) / 2, 44, 56);
  let y = status.y + status.height + gap;
  const palette: ControlRect[] = [];
  const cmdW = (innerW - gap * (4 - 1)) / 4;
  for (let i = 0; i < 4; i += 1) {
    palette.push({
      x: panelX + pad + i * (cmdW + gap),
      y,
      width: cmdW,
      height: paletteH,
      key: `palette-${i}`,
    });
  }
  y += paletteH + gap;

  const actW = (innerW - gap * 3) / 4;
  const play: ControlRect = { x: panelX + pad, y, width: actW, height: paletteH, key: 'play' };
  const step: ControlRect = { x: panelX + pad + (cmdW + gap) * 1, y, width: actW, height: paletteH, key: 'step' };
  const undo: ControlRect = { x: panelX + pad + (cmdW + gap) * 2, y, width: actW, height: paletteH, key: 'undo' };
  const clear: ControlRect = { x: panelX + pad + (cmdW + gap) * 3, y, width: actW, height: paletteH, key: 'clear' };

  return { objective, status, palette, play, step, undo, clear, sound, fullscreen, hint: null };
}

/** Map a flat belt index (0..BELT_SLOTS-1) to its slot rectangle. */
export function beltSlotRect(layout: AssemblyLayout, index: number): ControlRect {
  const col = index % layout.beltCols;
  const row = Math.floor(index / layout.beltCols);
  return {
    x: layout.beltX + col * (layout.beltSlotWidth + layout.beltGap),
    y: layout.beltY + row * (layout.beltSlotHeight + layout.beltGap),
    width: layout.beltSlotWidth,
    height: layout.beltSlotHeight,
    key: `belt-${index}`,
  };
}