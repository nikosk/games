import { describe, expect, it } from 'vitest';
import {
  createToyshopState,
  cycleLens,
  doorIsOpen,
  itemMatchesTarget,
  lensesMatch,
  MELODY,
  playMelodyNote,
  PUZZLES,
  solvePuzzle,
  solvedCount,
} from '../src/game/rules';

describe('toyshop progress', () => {
  it('opens the door only after all four puzzles are solved', () => {
    let state = createToyshopState();
    expect(doorIsOpen(state)).toBe(false);

    for (const puzzle of PUZZLES) state = solvePuzzle(state, puzzle);

    expect(solvedCount(state)).toBe(4);
    expect(doorIsOpen(state)).toBe(true);
  });

  it('does not award the same star twice', () => {
    const state = solvePuzzle(createToyshopState(), 'teddies');
    expect(solvePuzzle(state, 'teddies')).toBe(state);
    expect(solvedCount(state)).toBe(1);
  });
});

describe('visual puzzle rules', () => {
  it('matches an item only with its own silhouette', () => {
    expect(itemMatchesTarget(2, 2)).toBe(true);
    expect(itemMatchesTarget(2, 1)).toBe(false);
  });

  it('accepts the visual melody in order and resets gently on a mistake', () => {
    let notes: readonly number[] = [];
    for (const note of MELODY) {
      const progress = playMelodyNote(notes, note);
      notes = progress.notes;
    }
    expect(notes).toEqual(MELODY);
    expect(playMelodyNote([], 1)).toEqual({ notes: [], mistake: true, complete: false });
  });

  it('cycles kaleidoscope symbols and recognizes the target picture', () => {
    expect(cycleLens(2)).toBe(0);
    expect(lensesMatch([2, 0, 1])).toBe(true);
    expect(lensesMatch([2, 1, 0])).toBe(false);
  });
});
