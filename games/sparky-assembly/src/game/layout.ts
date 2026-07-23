import { COLS, ROWS, BELT_SLOTS } from './level';

export const DESIGN_CELL_SIZE = 80;

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
  readonly beltSlotSize: number;
  readonly panelX: number;
  readonly panelY: number;
  readonly panelWidth: number;
  readonly panelHeight: number;
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
  const panelWidth = clamp(width * 0.26, 210, 300);

  const availableBoardWidth = width - margin * 2 - gap - panelWidth;
  const beltHeight = clamp(availableBoardWidth * 0.17, 64, 112);

  const availableBoardHeight = height - margin * 2 - gap - beltHeight;
  const cellSize = Math.min(availableBoardWidth / COLS, availableBoardHeight / ROWS);
  const boardWidth = cellSize * COLS;
  const boardHeight = cellSize * ROWS;

  // Belt spans the actual board width so it stays aligned with the board
  // even when the board height (not width) is what limits cell size.
  const beltWidth = boardWidth;
  const beltSlotSize = Math.floor(beltWidth / BELT_SLOTS);

  const contentHeight = boardHeight + gap + beltHeight;

  // Center the board + gap + panel group instead of anchoring it left.
  const groupWidth = boardWidth + gap + panelWidth;
  const boardX = Math.round((width - groupWidth) / 2);
  const boardY = Math.round((height - contentHeight) / 2);
  const boardScale = cellSize / DESIGN_CELL_SIZE;

  const beltX = boardX + (boardWidth - beltSlotSize * BELT_SLOTS) / 2;
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
    beltSlotSize,
    panelX,
    panelY,
    panelWidth,
    panelHeight,
  };
}

function stackedLayout(width: number, height: number): AssemblyLayout {
  const margin = clamp(Math.min(width, height) * 0.03, 12, 28);
  const gap = clamp(width * 0.02, 10, 18);

  // Belt spans most of the width; board sits above it, panel below.
  const beltSlotSize = Math.floor((width - margin * 2) / BELT_SLOTS);
  const beltWidth = beltSlotSize * BELT_SLOTS;
  const beltHeight = clamp(beltSlotSize * 0.85, 48, 84);

  // Reserve a target panel height so the board scales to the width first.
  const panelTargetHeight = clamp(height * 0.3, 170, 260);
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
  const panelHeight = Math.max(height - panelY - margin, 120);

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
    beltSlotSize,
    panelX,
    panelY,
    panelWidth,
    panelHeight,
  };
}