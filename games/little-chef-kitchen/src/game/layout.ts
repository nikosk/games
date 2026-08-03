export interface Rect { readonly x: number; readonly y: number; readonly width: number; readonly height: number; }
export interface KitchenLayout { readonly mode: "landscape" | "tablet" | "portrait"; readonly board: Rect; readonly inventory: Rect; readonly customer: Rect; readonly plate: Rect; readonly sockets: readonly Rect[]; }
const inside = (r: Rect, w: number, h: number) => r.x >= 0 && r.y >= 0 && r.x + r.width <= w + .5 && r.y + r.height <= h + .5;
const overlap = (a: Rect, b: Rect) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
export function createKitchenLayout(w: number, h: number): KitchenLayout {
  const portrait = h > w;
  const mode = portrait ? "portrait" : w < 1100 ? "tablet" : "landscape";
  const margin = Math.max(10, Math.min(28, w * .02));
  const board = portrait ? { x: margin, y: h * .19, width: w - margin * 2, height: h * .46 } : { x: margin, y: h * .16, width: w * .68 - margin, height: h * .52 };
  const laneHeight = Math.min(76, Math.max(48, board.height * .17));
  const left = board.x + board.width * .06;
  const middle = board.x + board.width * (portrait ? .39 : .36);
  const socketWidth = Math.min(108, Math.max(portrait ? 54 : 72, board.width * .17));
  const laneY = (row: number) => board.y + board.height * (.23 + row * .27);
  const sockets: Rect[] = [
    { x: left, y: laneY(0), width: socketWidth, height: laneHeight },
    { x: middle, y: laneY(0), width: socketWidth, height: laneHeight },
    { x: left, y: laneY(1), width: socketWidth, height: laneHeight },
    { x: middle, y: laneY(1), width: socketWidth, height: laneHeight },
    { x: left, y: laneY(2), width: socketWidth, height: laneHeight },
  ];
  const plate = { x: board.x + board.width * (portrait ? .72 : .73), y: board.y + board.height * .34, width: Math.min(116, board.width * .2), height: Math.min(105, board.height * .3) };
  const customer = portrait ? { x: w * .53, y: margin, width: w * .43 - margin, height: h * .15 } : { x: w * .73, y: margin, width: w * .24, height: h * .36 };
  const inventory = portrait ? { x: margin, y: h * .7, width: w - margin * 2, height: h * .26 } : { x: margin, y: h * .72, width: w * .68 - margin, height: h * .23 };
  return { mode, board, sockets, inventory, customer, plate };
}
export function layoutSafe(l: KitchenLayout, w: number, h: number): boolean {
  const all = [l.board, l.inventory, l.customer, l.plate, ...l.sockets];
  return all.every((r) => inside(r, w, h)) && l.sockets.every((s, i) => l.sockets.every((other, j) => i === j || !overlap(s, other))) && l.plate.x >= l.board.x && l.plate.y >= l.board.y && l.plate.x + l.plate.width <= l.board.x + l.board.width && l.plate.y + l.plate.height <= l.board.y + l.board.height && !overlap(l.inventory, l.board) && !overlap(l.plate, l.inventory);
}
