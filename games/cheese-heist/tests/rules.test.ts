import { describe, expect, it } from 'vitest';
import {
  beginSteal,
  cancelSteal,
  createHeistState,
  escape,
  kickSpoon,
  markCaught,
  recover,
  returnSpoon,
  toggleHide,
  updateSteal,
  type HeistState,
} from '../src/game/rules';
import { KITCHEN } from '../src/game/room';

function fresh(): HeistState {
  return createHeistState();
}

describe('createHeistState', () => {
  it('starts playing, visible, empty-handed, spoon ready', () => {
    const state = fresh();
    expect(state.phase).toBe('playing');
    expect(state.mouseHidden).toBe(false);
    expect(state.hasCheese).toBe(false);
    expect(state.cheeseStolen).toBe(false);
    expect(state.stealing).toBe(false);
    expect(state.spoonKicked).toBe(false);
  });
});

describe('hide in the mug', () => {
  it('toggles hidden on and off without mutating the old state', () => {
    const state = fresh();
    const hidden = toggleHide(state);
    expect(hidden.mouseHidden).toBe(true);
    expect(state.mouseHidden).toBe(false);
    const out = toggleHide(hidden);
    expect(out.mouseHidden).toBe(false);
  });

  it('cancels an in-progress steal when hiding', () => {
    let state = beginSteal(fresh());
    state = updateSteal(state, 300);
    expect(state.stealProgress).toBeGreaterThan(0);
    const hidden = toggleHide(state);
    expect(hidden.mouseHidden).toBe(true);
    expect(hidden.stealing).toBe(false);
  });
});

describe('steal', () => {
  it('cannot steal twice', () => {
    let state = beginSteal(fresh());
    state = updateSteal(state, 800);
    expect(state.hasCheese).toBe(true);
    expect(state.cheeseStolen).toBe(true);
    const again = beginSteal(state);
    expect(again.stealing).toBe(false);
  });

  it('progresses with time and completes at STEAL_TIME_MS', () => {
    let state = beginSteal(fresh());
    state = updateSteal(state, 400);
    expect(state.stealing).toBe(true);
    expect(state.stealProgress).toBeCloseTo(0.5, 5);
    expect(state.hasCheese).toBe(false);
    state = updateSteal(state, 400);
    expect(state.stealing).toBe(false);
    expect(state.hasCheese).toBe(true);
    expect(state.cheeseStolen).toBe(true);
  });

  it('cancelSteal resets progress', () => {
    let state = beginSteal(fresh());
    state = updateSteal(state, 400);
    state = cancelSteal(state);
    expect(state.stealing).toBe(false);
    expect(state.stealProgress).toBe(0);
    expect(state.hasCheese).toBe(false);
  });

  it('does nothing without a beginSteal first', () => {
    const state = updateSteal(fresh(), 800);
    expect(state.hasCheese).toBe(false);
  });
});

describe('spoon', () => {
  it('kicks the spoon to the room clatter point once', () => {
    const state = fresh();
    const kicked = kickSpoon(state, KITCHEN);
    expect(kicked.spoonKicked).toBe(true);
    expect(kicked.spoonClatterX).toBe(KITCHEN.spoonClatterX);
    expect(kickSpoon(kicked, KITCHEN)).toBe(kicked);
  });

  it('returnSpoon makes the spoon kickable again', () => {
    let state = kickSpoon(fresh(), KITCHEN);
    state = returnSpoon(state);
    expect(state.spoonKicked).toBe(false);
    expect(state.spoonClatterX).toBe(0);
  });
});

describe('caught and recovery', () => {
  it('markCaught sets the caught phase and clears the steal', () => {
    let state = beginSteal(fresh());
    state = updateSteal(state, 400);
    state = markCaught(state);
    expect(state.phase).toBe('caught');
    expect(state.stealing).toBe(false);
    expect(state.mouseHidden).toBe(false);
  });

  it('recover returns everything to the start state', () => {
    let state = fresh();
    state = kickSpoon(state, KITCHEN);
    state = beginSteal(state);
    state = updateSteal(state, 800);
    state = markCaught(state);
    const back = recover(state);
    expect(back.phase).toBe('playing');
    expect(back.hasCheese).toBe(false);
    expect(back.cheeseStolen).toBe(false);
    expect(back.spoonKicked).toBe(false);
    expect(back.mouseHidden).toBe(false);
    expect(back.stealing).toBe(false);
  });
});

describe('escape', () => {
  it('only escapes while carrying the cheese', () => {
    const without = escape(fresh());
    expect(without.phase).toBe('playing');
    let state = beginSteal(fresh());
    state = updateSteal(state, 800);
    const won = escape(state);
    expect(won.phase).toBe('won');
  });
});
