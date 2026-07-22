import { DIFFICULTIES, type DifficultyConfig } from './rules';

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type LayoutMode = 'side' | 'compact' | 'portrait';

export interface WildPairsLayout {
  readonly width: number;
  readonly height: number;
  readonly mode: LayoutMode;
  readonly columns: number;
  readonly rows: number;
  readonly gap: number;
  readonly grid: Rect;
  readonly panel: Rect;
  readonly cards: readonly Rect[];
  readonly difficulty: DifficultyConfig;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function createWildPairsLayout(
  width: number,
  height: number,
  difficulty: DifficultyConfig = DIFFICULTIES[0]!,
): WildPairsLayout {
  const margin = clamp(Math.min(width, height) * 0.025, 10, 24);
  const denseBoard = difficulty.pairs >= 18;
  const gap = clamp(
    Math.min(width, height) * (denseBoard ? 0.012 : 0.018),
    denseBoard ? 5 : 8,
    16,
  );
  const side = width >= 820 && width > height && height >= 520;
  const portrait = height > width;
  const mode: LayoutMode = side ? 'side' : portrait ? 'portrait' : 'compact';
  const columns = mode === 'portrait' ? difficulty.rows : difficulty.columns;
  const rows = mode === 'portrait' ? difficulty.columns : difficulty.rows;

  let panel: Rect;
  let cardWidth: number;
  let cardHeight: number;
  let gridX: number;
  let gridY: number;

  if (mode === 'side') {
    const panelWidth = clamp(width * 0.225, 220, 280);
    const contentGap = clamp(width * 0.015, 14, 20);
    const boardWidth = width - margin * 2 - panelWidth - contentGap;
    cardWidth = (boardWidth - gap * (columns - 1)) / columns;
    cardHeight = Math.min(
      (height - margin * 2 - gap * (rows - 1)) / rows,
      cardWidth * 1.25,
      240,
    );
    const gridWidth = cardWidth * columns + gap * (columns - 1);
    const gridHeight = cardHeight * rows + gap * (rows - 1);
    gridX = margin + (boardWidth - gridWidth) / 2;
    gridY = (height - gridHeight) / 2;
    const panelHeight = Math.min(height - margin * 2, Math.max(470, gridHeight));
    panel = {
      x: width - margin - panelWidth,
      y: (height - panelHeight) / 2,
      width: panelWidth,
      height: panelHeight,
    };
  } else {
    const panelHeight = mode === 'portrait' ? 126 : 82;
    panel = {
      x: margin,
      y: margin,
      width: width - margin * 2,
      height: panelHeight,
    };
    const gridTop = panel.y + panel.height + gap;
    const availableHeight = height - gridTop - margin;
    cardWidth = (width - margin * 2 - gap * (columns - 1)) / columns;
    cardHeight = (availableHeight - gap * (rows - 1)) / rows;
    if (mode === 'portrait') cardHeight = Math.min(cardHeight, cardWidth * 1.75);
    const gridWidth = cardWidth * columns + gap * (columns - 1);
    const gridHeight = cardHeight * rows + gap * (rows - 1);
    gridX = (width - gridWidth) / 2;
    gridY = gridTop + (availableHeight - gridHeight) / 2;
  }

  const cards = Array.from({ length: difficulty.pairs * 2 }, (_unused, index) => ({
    x: gridX + (index % columns) * (cardWidth + gap),
    y: gridY + Math.floor(index / columns) * (cardHeight + gap),
    width: cardWidth,
    height: cardHeight,
  }));

  return {
    width,
    height,
    mode,
    columns,
    rows,
    gap,
    grid: {
      x: gridX,
      y: gridY,
      width: cardWidth * columns + gap * (columns - 1),
      height: cardHeight * rows + gap * (rows - 1),
    },
    panel,
    cards,
    difficulty,
  };
}
