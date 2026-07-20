import { COLS, ROWS } from './level';

export const DESIGN_CELL_SIZE = 78;

export interface WorkshopLayout {
  readonly width: number;
  readonly height: number;
  readonly boardX: number;
  readonly boardY: number;
  readonly boardWidth: number;
  readonly boardHeight: number;
  readonly cellSize: number;
  readonly boardScale: number;
  readonly hudX: number;
  readonly hudY: number;
  readonly hudWidth: number;
  readonly hudHeight: number;
  readonly infoWidth: number;
  readonly controlsX: number;
  readonly controlsY: number;
  readonly controlsScale: number;
}

const CONTROL_WIDTH = 626;
const CONTROL_HEIGHT = 68;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function createWorkshopLayout(width: number, height: number): WorkshopLayout {
  const margin = clamp(Math.min(width, height) * 0.022, 10, 24);
  const cellSize = Math.min((width - margin * 2) / COLS, (height - margin * 2) / ROWS);
  const boardWidth = cellSize * COLS;
  const boardHeight = cellSize * ROWS;
  const boardX = (width - boardWidth) / 2;
  const boardY = (height - boardHeight) / 2;
  const hudInset = clamp(cellSize * 0.08, 8, 13);
  const hudX = boardX + hudInset;
  const hudY = boardY + hudInset;
  const hudWidth = boardWidth - hudInset * 2;
  const hudHeight = clamp(cellSize * 0.72, 72, 96);
  const controlsScale = Math.min(1.05, hudHeight / CONTROL_HEIGHT, (hudWidth - 150) / CONTROL_WIDTH);
  const controlsWidth = CONTROL_WIDTH * controlsScale;
  const infoWidth = hudWidth - controlsWidth - 16;

  return {
    width,
    height,
    boardX,
    boardY,
    boardWidth,
    boardHeight,
    cellSize,
    boardScale: cellSize / DESIGN_CELL_SIZE,
    hudX,
    hudY,
    hudWidth,
    hudHeight,
    infoWidth,
    controlsX: hudX + hudWidth - controlsWidth,
    controlsY: hudY + (hudHeight - CONTROL_HEIGHT * controlsScale) / 2,
    controlsScale,
  };
}
