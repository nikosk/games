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
  readonly gap: number;
  readonly grid: Rect;
  readonly panel: Rect;
  readonly cards: readonly Rect[];
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function createWildPairsLayout(width: number, height: number): WildPairsLayout {
  const margin = clamp(Math.min(width, height) * 0.025, 10, 24);
  const gap = clamp(Math.min(width, height) * 0.018, 8, 16);
  const side = width >= 820 && width > height;
  const portrait = height > width;
  const mode: LayoutMode = side ? 'side' : portrait ? 'portrait' : 'compact';
  const columns = portrait ? 2 : 4;
  const rows = portrait ? 4 : 2;

  let panel: Rect;
  let cardWidth: number;
  let cardHeight: number;
  let gridX: number;
  let gridY: number;

  if (mode === 'side') {
    const panelWidth = clamp(width * 0.225, 220, 280);
    const contentGap = clamp(width * 0.015, 14, 20);
    const boardWidth = width - margin * 2 - panelWidth - contentGap;
    cardWidth = (boardWidth - gap * 3) / 4;
    cardHeight = Math.min((height - margin * 2 - gap) / 2, cardWidth * 1.25, 240);
    const gridWidth = cardWidth * 4 + gap * 3;
    const gridHeight = cardHeight * 2 + gap;
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
    const panelHeight = mode === 'portrait' ? 100 : 72;
    panel = {
      x: margin,
      y: margin,
      width: width - margin * 2,
      height: panelHeight,
    };
    const gridTop = panel.y + panel.height + gap;
    const availableHeight = height - gridTop - margin;
    const rawCardWidth = (width - margin * 2 - gap * (columns - 1)) / columns;
    cardWidth = mode === 'portrait' ? Math.min(rawCardWidth, 240) : rawCardWidth;
    cardHeight = Math.min(
      (availableHeight - gap * (rows - 1)) / rows,
      mode === 'portrait' ? cardWidth * 1.2 : Number.POSITIVE_INFINITY,
    );
    const gridWidth = cardWidth * columns + gap * (columns - 1);
    const gridHeight = cardHeight * rows + gap * (rows - 1);
    gridX = (width - gridWidth) / 2;
    gridY = gridTop + (availableHeight - gridHeight) / 2;
  }

  const cards: Rect[] = [];
  for (let index = 0; index < 8; index += 1) {
    cards.push({
      x: gridX + (index % columns) * (cardWidth + gap),
      y: gridY + Math.floor(index / columns) * (cardHeight + gap),
      width: cardWidth,
      height: cardHeight,
    });
  }

  return {
    width,
    height,
    mode,
    columns,
    gap,
    grid: {
      x: gridX,
      y: gridY,
      width: cardWidth * columns + gap * (columns - 1),
      height: cardHeight * rows + gap * (rows - 1),
    },
    panel,
    cards,
  };
}
