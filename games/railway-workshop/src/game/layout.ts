import { COLS, ROWS } from './level';

export const DESIGN_CELL_SIZE = 78;
export const DESIGN_PANEL_WIDTH = 280;
export const DESIGN_PANEL_HEIGHT = 470;

export interface WorkshopLayout {
  readonly width: number;
  readonly height: number;
  readonly boardX: number;
  readonly boardY: number;
  readonly boardWidth: number;
  readonly boardHeight: number;
  readonly cellSize: number;
  readonly boardScale: number;
  readonly panelX: number;
  readonly panelY: number;
  readonly panelWidth: number;
  readonly panelHeight: number;
  readonly controlsX: number;
  readonly controlsY: number;
  readonly controlsScale: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function createWorkshopLayout(width: number, height: number): WorkshopLayout {
  const margin = clamp(Math.min(width, height) * 0.022, 10, 24);
  const gap = clamp(width * 0.012, 10, 18);
  const panelWidth = clamp(width * 0.24, 196, 300);
  const availableBoardWidth = width - margin * 2 - gap - panelWidth;
  const cellSize = Math.min(availableBoardWidth / COLS, (height - margin * 2) / ROWS);
  const boardWidth = cellSize * COLS;
  const boardHeight = cellSize * ROWS;
  const contentWidth = boardWidth + gap + panelWidth;
  const boardX = (width - contentWidth) / 2;
  const boardY = (height - boardHeight) / 2;
  const panelX = boardX + boardWidth + gap;
  const panelY = boardY;
  const panelHeight = boardHeight;
  const controlsScale = Math.min(
    1.1,
    panelWidth / DESIGN_PANEL_WIDTH,
    panelHeight / DESIGN_PANEL_HEIGHT,
  );
  const controlsX = panelX + (panelWidth - DESIGN_PANEL_WIDTH * controlsScale) / 2;
  const controlsY = panelY + (panelHeight - DESIGN_PANEL_HEIGHT * controlsScale) / 2;

  return {
    width,
    height,
    boardX,
    boardY,
    boardWidth,
    boardHeight,
    cellSize,
    boardScale: cellSize / DESIGN_CELL_SIZE,
    panelX,
    panelY,
    panelWidth,
    panelHeight,
    controlsX,
    controlsY,
    controlsScale,
  };
}
