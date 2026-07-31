import type { KitchenRoom } from './room';

export type HeistPhase = 'playing' | 'caught' | 'won';

export interface HeistState {
  readonly phase: HeistPhase;
  readonly mouseHidden: boolean;
  /** The cheese has been taken off the counter. */
  readonly cheeseStolen: boolean;
  /** The mouse is carrying the cheese. */
  readonly hasCheese: boolean;
  readonly spoonKicked: boolean;
  readonly spoonClatterX: number;
}

export function createHeistState(): HeistState {
  return {
    phase: 'playing',
    mouseHidden: false,
    cheeseStolen: false,
    hasCheese: false,
    spoonKicked: false,
    spoonClatterX: 0,
  };
}

/** Set the mug's safe state from proximity instead of requiring a button. */
export function setHidden(state: HeistState, hidden: boolean): HeistState {
  if (state.phase !== 'playing' || state.mouseHidden === hidden) return state;
  return { ...state, mouseHidden: hidden };
}

/** Pick up the cheese as soon as the mouse lands beside it. */
export function collectCheese(state: HeistState): HeistState {
  if (state.phase !== 'playing' || state.hasCheese || state.cheeseStolen) return state;
  return { ...state, cheeseStolen: true, hasCheese: true };
}

/** Kick the spoon; the clatter point is fixed by the room. */
export function kickSpoon(state: HeistState, room: KitchenRoom): HeistState {
  if (state.phase !== 'playing' || state.spoonKicked) return state;
  return { ...state, spoonKicked: true, spoonClatterX: room.spoonClatterX };
}

/** The spoon has been put back after the investigation. */
export function returnSpoon(state: HeistState): HeistState {
  if (!state.spoonKicked) return state;
  return { ...state, spoonKicked: false, spoonClatterX: 0 };
}

export function markCaught(state: HeistState): HeistState {
  if (state.phase === 'caught') return state;
  return {
    ...state,
    phase: 'caught',
    mouseHidden: false,
  };
}

/** The funny, non-punishing reset: everything is ready for another try. */
export function recover(state: HeistState): HeistState {
  return {
    ...state,
    phase: 'playing',
    mouseHidden: false,
    cheeseStolen: false,
    hasCheese: false,
    spoonKicked: false,
    spoonClatterX: 0,
  };
}

/** Escape through the vent; only possible while carrying the cheese. */
export function escape(state: HeistState): HeistState {
  if (state.phase !== 'playing' || !state.hasCheese) return state;
  return { ...state, phase: 'won' };
}

export function heistWon(state: HeistState): boolean {
  return state.phase === 'won';
}
