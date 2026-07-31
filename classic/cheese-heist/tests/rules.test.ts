import { describe, expect, it } from 'vitest';
import {
  collectCheese,
  createHeistState,
  escape,
  kickSpoon,
  markCaught,
  recover,
  returnSpoon,
  setHidden,
  type HeistState,
} from '../src/game/rules';
import { KITCHEN } from '../src/game/room';

function fresh(): HeistState {
  return createHeistState();
}

describe('createHeistState', () => {
  it('starts visible, empty-handed, and ready to play', () => {
    const state = fresh();
    expect(state.phase).toBe('playing');
    expect(state.mouseHidden).toBe(false);
    expect(state.hasCheese).toBe(false);
    expect(state.cheeseStolen).toBe(false);
    expect(state.spoonKicked).toBe(false);
  });
});

describe('automatic interactions', () => {
  it('enters and leaves the mug without mutating the old state', () => {
    const state = fresh();
    const hidden = setHidden(state, true);
    expect(hidden.mouseHidden).toBe(true);
    expect(state.mouseHidden).toBe(false);
    expect(setHidden(hidden, false).mouseHidden).toBe(false);
  });

  it('collects the cheese once', () => {
    const state = fresh();
    const carrying = collectCheese(state);
    expect(carrying.hasCheese).toBe(true);
    expect(carrying.cheeseStolen).toBe(true);
    expect(collectCheese(carrying)).toBe(carrying);
  });

  it('kicks the spoon once and returns it to ready', () => {
    const kicked = kickSpoon(fresh(), KITCHEN);
    expect(kicked.spoonKicked).toBe(true);
    expect(kicked.spoonClatterX).toBe(KITCHEN.spoonClatterX);
    expect(kickSpoon(kicked, KITCHEN)).toBe(kicked);
    const returned = returnSpoon(kicked);
    expect(returned.spoonKicked).toBe(false);
    expect(returned.spoonClatterX).toBe(0);
  });
});

describe('caught and recovery', () => {
  it('marks the player caught without changing the rest of the room', () => {
    let state = setHidden(fresh(), true);
    state = collectCheese(state);
    state = kickSpoon(state, KITCHEN);
    const caught = markCaught(state);
    expect(caught.phase).toBe('caught');
    expect(caught.mouseHidden).toBe(false);
    expect(caught.hasCheese).toBe(true);
    expect(caught.spoonKicked).toBe(true);
  });

  it('recovers with a fresh attempt', () => {
    let state = kickSpoon(fresh(), KITCHEN);
    state = collectCheese(state);
    state = markCaught(state);
    const back = recover(state);
    expect(back.phase).toBe('playing');
    expect(back.hasCheese).toBe(false);
    expect(back.cheeseStolen).toBe(false);
    expect(back.spoonKicked).toBe(false);
    expect(back.mouseHidden).toBe(false);
  });
});

describe('escape', () => {
  it('only escapes while carrying the cheese', () => {
    expect(escape(fresh()).phase).toBe('playing');
    const won = escape(collectCheese(fresh()));
    expect(won.phase).toBe('won');
  });
});
