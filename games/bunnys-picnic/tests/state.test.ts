import { describe, it, expect } from 'vitest';
import { advance, complete, freshProgress, inventory, readProgress, type Progress, type Action } from '../src/state';
const doActions = (p: Progress, actions: Action[]) => actions.reduce(advance, p);
const travel = (room: Progress['room']): Action => ({ type: 'travel', room });
const setup = () => doActions(freshProgress(), [{ type: 'cloth' }, travel('shed'), { type: 'collect', tool: 'net' }, { type: 'collect', tool: 'plank' }, travel('garden')]);
const hedge = [travel('nook'), { type: 'bridge' }, ...[0, 1, 2].map(index => ({ type: 'leaf', index } as Action)), travel('garden')] satisfies Action[];
const duck = [travel('pond'), { type: 'duck' }, travel('garden')] satisfies Action[];
describe('the whole adventure', () => {
  it.each([true, false])('works in either friend order and box/basket order (%s)', reverse => {
    let p = setup();
    p = doActions(p, reverse ? [...duck, ...hedge] : [...hedge, ...duck]);
    expect(inventory(p)).toEqual(['basket']);
    p = advance(p, travel('orchard'));
    p = doActions(p, reverse ? [{ type: 'box' }, { type: 'basket' }] : [{ type: 'basket' }, { type: 'box' }]);
    p = doActions(p, [{ type: 'apples' }, travel('garden')]);
    for (const index of [3, 0, 2, 1]) p = advance(p, { type: 'plate', index });
    for (const index of [1, 3, 0, 2]) p = advance(p, { type: 'serve', index });
    expect(complete(p)).toBe(true); expect(inventory(p)).toEqual([]);
    expect(readProgress(JSON.stringify(p))).toEqual(p);
  });
  it('keeps an early orchard box when leaving for the basket', () => {
    let p = doActions(setup(), [travel('orchard'), { type: 'box' }]);
    expect(advance(p, { type: 'apples' })).toBe(p);
    p = doActions(p, [travel('garden'), ...hedge, travel('orchard'), { type: 'basket' }, { type: 'apples' }]);
    expect(p.apples).toBe(true);
  });
  it('rejects missing prerequisites, wrong rooms, duplicate actions and invalid indices', () => {
    let p = freshProgress(); expect(advance(p, travel('pond'))).toBe(p);
    p = setup(); expect(advance(p, { type: 'duck' })).toBe(p);
    p = advance(p, travel('nook')); expect(advance(p, { type: 'leaf', index: 0 })).toBe(p);
    p = doActions(p, [{ type: 'bridge' }, { type: 'leaf', index: 0 }]);
    for (const index of [0, -1, 9, 1.5, NaN]) expect(advance(p, { type: 'leaf', index })).toBe(p);
    expect(inventory(p)).toEqual(['net']);
    expect(advance(p, travel('pond'))).toBe(p);
  });
  it('round-trips every step without changing the world', () => {
    let p = setup();
    for (const action of [...hedge, ...duck, travel('orchard'), { type: 'box' }, { type: 'basket' }, { type: 'apples' }] as Action[]) {
      p = advance(p, action); p = readProgress(JSON.stringify(p));
      expect(p.cloth).toBe(true);
    }
    expect(p.apples).toBe(true);
  });
  it('recovers safely from corrupt, future, or impossible saves', () => {
    for (const value of ['broken', 'null', '{}', JSON.stringify({ ...freshProgress(), version: 2 }), JSON.stringify({ ...freshProgress(), duck: true }), JSON.stringify({ ...freshProgress(), leaves: [false] })]) expect(readProgress(value)).toEqual(freshProgress());
  });
});
