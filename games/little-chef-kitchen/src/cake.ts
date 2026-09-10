export const flavours = [
  { name: 'Vanilla', color: 0xecc77e, dark: 0xc99552 },
  { name: 'Chocolate', color: 0x85503f, dark: 0x573329 },
  { name: 'Strawberry', color: 0xeda1ad, dark: 0xc66e82 },
] as const;
export const fillings = [
  { name: 'Berry jam', color: 0xc94768 },
  { name: 'Lemon cream', color: 0xf5d36c },
  { name: 'Chocolate', color: 0x63392d },
] as const;
export const icings = [0xfff0d5, 0xf298b6, 0x9270bd, 0x79caba, 0x704338] as const;
export type Tool = 'pipe' | 'sprinkles' | 'berry' | 'flower' | 'candle';
export interface Point { x: number; y: number }
export interface Layer { flavour: number; chips: boolean; berries: boolean }
export interface Mark { tool: Tool; color: number; points: Point[] }
export interface Cake { layers: Layer[]; filling: number; icing: number; marks: Mark[]; name: string }
export const freshLayer = (): Layer => ({ flavour: 0, chips: false, berries: false });
export const freshCake = (): Cake => ({ layers: [], filling: 0, icing: 0, marks: [], name: '' });
// Coordinates are relative to the cake, so drawings survive resizing and shelf previews.
export function onCake(p: Point): boolean {
  return (p.x / 240) ** 2 + (p.y / 90) ** 2 <= 1
    || (Math.abs(p.x) <= 240 && p.y >= 0 && p.y <= 225 && (p.x / 240) ** 2 + ((p.y - 160) / 65) ** 2 <= 1)
    || (Math.abs(p.x) <= 240 && p.y >= 0 && p.y <= 150);
}
export function onTop(p: Point): boolean { return (p.x / 230) ** 2 + (p.y / 82) ** 2 <= 1; }
export function validCake(value: unknown): value is Cake {
  if (!value || typeof value !== 'object') return false;
  const c = value as Cake;
  const index = (n: number, size: number) => Number.isInteger(n) && n >= 0 && n < size;
  return typeof c.name === 'string' && c.name.length <= 40 && index(c.filling, 3) && index(c.icing, 5)
    && Array.isArray(c.layers) && c.layers.length === 2 && c.layers.every(l => l && index(l.flavour, 3) && typeof l.chips === 'boolean' && typeof l.berries === 'boolean')
    && Array.isArray(c.marks) && c.marks.length <= 250 && c.marks.every(m => m && ['pipe', 'sprinkles', 'berry', 'flower', 'candle'].includes(m.tool)
      && Number.isInteger(m.color) && m.color >= 0 && m.color <= 0xffffff && Array.isArray(m.points) && m.points.length > 0 && m.points.length <= 600
      && m.points.every(p => p && Number.isFinite(p.x) && Number.isFinite(p.y) && onCake(p)));
}
export function readShelf(raw: string | null): Cake[] {
  try { const value: unknown = JSON.parse(raw ?? '[]'); return Array.isArray(value) ? value.filter(validCake).slice(0, 8) : []; } catch { return []; }
}
export function addToShelf(shelf: Cake[], cake: Cake): Cake[] {
  return [structuredClone(cake), ...shelf].slice(0, 8);
}
