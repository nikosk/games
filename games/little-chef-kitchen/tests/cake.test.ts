import { describe, expect, it } from 'vitest';
import { addToShelf, freshCake, freshLayer, onCake, onTop, readShelf } from '../src/cake';
const cake = () => ({ ...freshCake(), layers: [freshLayer(), { flavour: 2, chips: true, berries: false }] });
describe('cake shelf', () => {
  it('keeps flavours, fillings and drawn strokes without sharing mutable state', () => {
    const c = cake(); c.filling = 2; c.marks.push({ tool: 'pipe', color: 0xffffff, points: [{ x: 0, y: 0 }, { x: 12, y: 2 }] });
    const shelf = addToShelf([], c); c.marks[0]!.points[0]!.x = 99;
    expect(shelf[0]!.marks[0]!.points[0]!.x).toBe(0);
    expect(readShelf(JSON.stringify(shelf))).toEqual(shelf);
  });
  it('recovers from corrupt or incompatible storage', () => {
    for (const raw of ['broken', 'null', '{}', '[null,{}]', JSON.stringify([{ ...cake(), marks: [null] }]), JSON.stringify([{ ...cake(), layers: [null, null] }])]) expect(readShelf(raw)).toEqual([]);
    expect(readShelf(JSON.stringify([{ ...cake(), icing: 500 }, cake()]))).toEqual([cake()]);
  });
  it('keeps the eight newest cakes', () => {
    let shelf: ReturnType<typeof addToShelf> = []; for (let i = 0; i < 12; i++) shelf = addToShelf(shelf, { ...cake(), name: `${i}` });
    expect(shelf.map(c => c.name)).toEqual(['11', '10', '9', '8', '7', '6', '5', '4']);
  });
});
describe('decoration surface', () => {
  it('allows icing on the top and front but keeps decorations off the table', () => {
    expect(onCake({ x: 0, y: -70 })).toBe(true); expect(onCake({ x: 0, y: 180 })).toBe(true);
    expect(onCake({ x: 230, y: -80 })).toBe(false); expect(onCake({ x: 0, y: 240 })).toBe(false);
    expect(onTop({ x: 0, y: 120 })).toBe(false);
  });
});
