export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface KitchenLayout {
  readonly mode: "side" | "stacked" | "compact";
  readonly board: Rect;
  readonly panel: Rect;
  readonly cell: number;
  readonly cells: readonly Rect[];
  readonly buttons: Readonly<Record<"run" | "undo" | "clear" | "serve", Rect>>;
  readonly directions: Readonly<Record<"right" | "down" | "left" | "up", Rect>>;
  readonly instructions: Rect;
  readonly status: Rect;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const rectInside = (rect: Rect, bounds: Rect) =>
  rect.x >= bounds.x &&
  rect.y >= bounds.y &&
  rect.x + rect.width <= bounds.x + bounds.width &&
  rect.y + rect.height <= bounds.y + bounds.height;

export function createKitchenLayout(
  width: number,
  height: number,
): KitchenLayout {
  const margin = clamp(Math.min(width, height) * 0.025, 8, 22);
  const gap = clamp(Math.min(width, height) * 0.016, 6, 14);
  const side = width >= 820 && width > height && height >= 520;
  const compact = width < 700 || height < 500;
  const mode = side ? "side" : compact ? "compact" : "stacked";
  const cols = 6;
  const rows = 4;
  let board: Rect;
  let panel: Rect;

  if (side) {
    const panelWidth = clamp(width * 0.23, 230, 286);
    const availableWidth = width - margin * 2 - panelWidth - gap;
    const cell = Math.min(
      (availableWidth - gap * (cols - 1)) / cols,
      (height - margin * 2 - gap * (rows - 1)) / rows,
      116,
    );
    const boardWidth = cell * cols + gap * (cols - 1);
    const boardHeight = cell * rows + gap * (rows - 1);
    board = {
      x: margin + (availableWidth - boardWidth) / 2,
      y: (height - boardHeight) / 2,
      width: boardWidth,
      height: boardHeight,
    };
    panel = {
      x: width - margin - panelWidth,
      y: margin,
      width: panelWidth,
      height: height - margin * 2,
    };
  } else {
    const panelHeight = compact ? 276 : 276;
    const availableHeight = height - margin * 2 - panelHeight - gap;
    const cell = Math.min(
      (width - margin * 2 - gap * (cols - 1)) / cols,
      (availableHeight - gap * (rows - 1)) / rows,
      compact ? 82 : 145,
    );
    const boardWidth = cell * cols + gap * (cols - 1);
    const boardHeight = cell * rows + gap * (rows - 1);
    panel = {
      x: margin,
      y: margin,
      width: width - margin * 2,
      height: panelHeight,
    };
    board = {
      x: (width - boardWidth) / 2,
      y: panel.y + panel.height + gap,
      width: boardWidth,
      height: boardHeight,
    };
  }

  const cell = (board.width - gap * (cols - 1)) / cols;
  const cells = Array.from({ length: cols * rows }, (_, index) => ({
    x: board.x + (index % cols) * (cell + gap),
    y: board.y + Math.floor(index / cols) * (cell + gap),
    width: cell,
    height: cell,
  }));

  let buttons: KitchenLayout["buttons"];
  let directions: KitchenLayout["directions"];
  let instructions: Rect;
  let status: Rect;
  if (side) {
    const inner = panel.width - 28;
    const rowHeight = 48;
    const buttonGap = 8;
    const footerY = panel.y + panel.height - 190;
    const half = (inner - buttonGap) / 2;
    buttons = {
      run: { x: panel.x + 14, y: footerY, width: inner, height: rowHeight },
      serve: { x: panel.x + 14, y: footerY, width: inner, height: rowHeight },
      undo: {
        x: panel.x + 14,
        y: footerY + rowHeight + buttonGap,
        width: half,
        height: rowHeight,
      },
      clear: {
        x: panel.x + 14 + half + buttonGap,
        y: footerY + rowHeight + buttonGap,
        width: half,
        height: rowHeight,
      },
    };
    instructions = {
      x: panel.x + 14,
      y: footerY + rowHeight * 2 + 22,
      width: inner,
      height: 42,
    };
    status = { x: panel.x + 14, y: panel.y + 246, width: inner, height: 56 };
    directions = {
      right: {
        x: panel.x + 14,
        y: panel.y + 170,
        width: (inner - 12) / 4,
        height: 42,
      },
      down: {
        x: panel.x + 14 + (inner - 12) / 4 + 4,
        y: panel.y + 170,
        width: (inner - 12) / 4,
        height: 42,
      },
      left: {
        x: panel.x + 14 + 2 * ((inner - 12) / 4 + 4),
        y: panel.y + 170,
        width: (inner - 12) / 4,
        height: 42,
      },
      up: {
        x: panel.x + 14 + 3 * ((inner - 12) / 4 + 4),
        y: panel.y + 170,
        width: (inner - 12) / 4,
        height: 42,
      },
    };
  } else {
    const inner = width - margin * 2;
    const buttonWidth = Math.min(150, (inner - 18) / 4);
    const y = panel.y + 190;
    buttons = {
      run: { x: margin, y, width: buttonWidth, height: 40 },
      serve: { x: margin, y, width: buttonWidth, height: 40 },
      undo: { x: margin + buttonWidth + 6, y, width: buttonWidth, height: 40 },
      clear: {
        x: margin + (buttonWidth + 6) * 2,
        y,
        width: buttonWidth,
        height: 40,
      },
    };
    instructions = {
      x: margin,
      y: panel.y + panel.height - 38,
      width: inner,
      height: 28,
    };
    status = { x: margin, y: panel.y + 150, width: inner, height: 34 };
    const directionWidth = Math.max(44, Math.min(54, (inner - 18) / 4));
    const directionY = panel.y + 108;
    directions = {
      right: { x: margin, y: directionY, width: directionWidth, height: 38 },
      down: { x: margin + directionWidth + 6, y: directionY, width: directionWidth, height: 38 },
      left: { x: margin + (directionWidth + 6) * 2, y: directionY, width: directionWidth, height: 38 },
      up: { x: margin + (directionWidth + 6) * 3, y: directionY, width: directionWidth, height: 38 },
    };
  }
  return { mode, board, panel, cell, cells, buttons, directions, instructions, status };
}

export function layoutRectsAreSafe(
  layout: KitchenLayout,
  width: number,
  height: number,
): boolean {
  const viewport = { x: 0, y: 0, width, height };
  const controls = [
    ...Object.values(layout.buttons),
    ...Object.values(layout.directions),
    layout.instructions,
    layout.status,
  ];
  const overlaps = (a: Rect, b: Rect) =>
    a.x < b.x + b.width && a.x + a.width > b.x &&
    a.y < b.y + b.height && a.y + a.height > b.y;
  const regions = [layout.status, layout.buttons.run, layout.buttons.undo, layout.buttons.clear, ...Object.values(layout.directions), layout.instructions];
  const regionsDoNotOverlap = regions.every((region, index) =>
    regions.slice(index + 1).every((other) => !overlaps(region, other)),
  );
  return [layout.board, layout.panel, ...layout.cells, ...controls].every(
    (rect) => rectInside(rect, viewport),
  ) && regionsDoNotOverlap;
}
