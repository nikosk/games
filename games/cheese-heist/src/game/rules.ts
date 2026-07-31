import type { KitchenRoom } from './room';

export type HeistPhase = 'playing' | 'caught' | 'won';

export interface HeistState {
  readonly phase: HeistPhase;
  readonly mouseHidden: boolean;
  /** The cheese has been taken off the pedestal. */
  readonly cheeseStolen: boolean;
  /** The mouse is carrying the cheese. */
  readonly hasCheese: boolean;
  readonly stealing: boolean;
  /** 0..1 progress of the steal interaction. */
  readonly stealProgress: number;
  readonly spoonKicked: boolean;
  readonly spoonClatterX: number;
}

/** Milliseconds the mouse must hold E near the cheese to steal it. */
export const STEAL_TIME_MS = 800;

export function createHeistState(): HeistState {
  return {
    phase: 'playing',
    mouseHidden: false,
    cheeseStolen: false,
    hasCheese: false,
    stealing: false,
    stealProgress: 0,
    spoonKicked: false,
    spoonClatterX: 0,
  };
}

/** Enter or leave the mug. Entering cancels an in-progress steal. */
export function toggleHide(state: HeistState): HeistState {
  if (state.phase !== 'playing') return state;
  if (state.mouseHidden) return { ...state, mouseHidden: false };
  return { ...state, mouseHidden: true, stealing: false, stealProgress: 0 };
}

export function beginSteal(state: HeistState): HeistState {
  if (state.phase !== 'playing' || state.hasCheese || state.cheeseStolen) return state;
  return { ...state, stealing: true, stealProgress: 0 };
}

export function cancelSteal(state: HeistState): HeistState {
  if (!state.stealing) return state;
  return { ...state, stealing: false, stealProgress: 0 };
}

/** Advance the steal interaction; completes it once progress reaches 1. */
export function updateSteal(state: HeistState, dtMs: number): HeistState {
  if (!state.stealing || state.hasCheese) return state;
  const progress = state.stealProgress + dtMs / STEAL_TIME_MS;
  if (progress < 1) return { ...state, stealProgress: progress };
  return {
    ...state,
    stealing: false,
    stealProgress: 1,
    cheeseStolen: true,
    hasCheese: true,
  };
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
    stealing: false,
    stealProgress: 0,
  };
}

/**
 * The funny, non-punishing reset: back to playing, the cheese is returned
 * to its pedestal, and the spoon is ready again.
 */
export function recover(state: HeistState): HeistState {
  return {
    ...state,
    phase: 'playing',
    mouseHidden: false,
    cheeseStolen: false,
    hasCheese: false,
    stealing: false,
    stealProgress: 0,
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
