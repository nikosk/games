import { describe, expect, it } from 'vitest';
import {
  ANIMALS,
  canChoose,
  createGameState,
  isComplete,
  makeDeck,
  markPairMatched,
  resolvePair,
  type GameState,
} from '../src/game/rules';

function orderedState(): GameState {
  return {
    cards: ANIMALS.flatMap((animal, pair) => [
      { id: pair * 2, animal, matched: false },
      { id: pair * 2 + 1, animal, matched: false },
    ]),
    open: [],
    moves: 0,
    pairs: 0,
  };
}

describe('pair generation', () => {
  it('creates exactly two cards for each animal', () => {
    const deck = makeDeck(() => 0.4);

    expect(deck).toHaveLength(8);
    for (const animal of ANIMALS) {
      expect(deck.filter((card) => card.animal === animal)).toHaveLength(2);
    }
  });

  it('is deterministic when given a deterministic random source', () => {
    expect(makeDeck(() => 0.4).map((card) => card.animal)).toEqual([
      'fox',
      'rabbit',
      'frog',
      'rabbit',
      'fox',
      'frog',
      'hedgehog',
      'hedgehog',
    ]);
  });
});

describe('matching rules', () => {
  it('rejects invalid, duplicate, matched, and input-locked choices', () => {
    const state = orderedState();

    expect(canChoose(state, -1)).toBe(false);
    expect(canChoose(state, 99)).toBe(false);
    state.open.push(0);
    expect(canChoose(state, 0)).toBe(false);
    state.open.push(2);
    expect(canChoose(state, 3)).toBe(false);
    state.cards[4]!.matched = true;
    state.open.length = 0;
    expect(canChoose(state, 4)).toBe(false);
  });

  it('distinguishes valid matches, mismatches, and invalid pairs', () => {
    const state = orderedState();

    expect(resolvePair(state.cards, 0, 1)).toBe('match');
    expect(resolvePair(state.cards, 0, 2)).toBe('mismatch');
    expect(resolvePair(state.cards, 0, 0)).toBe('invalid');
    expect(resolvePair(state.cards, -1, 0)).toBe('invalid');
  });

  it('marks pairs and recognizes a completed board', () => {
    const state = orderedState();

    for (let index = 0; index < state.cards.length; index += 2) {
      expect(markPairMatched(state, index, index + 1)).toBe(true);
    }

    expect(state.pairs).toBe(4);
    expect(isComplete(state)).toBe(true);
  });

  it('creates a replay-safe fresh state', () => {
    const state = createGameState(() => 0.2);
    state.open.push(0, 1);
    state.moves = 5;
    state.pairs = 1;
    state.cards[0]!.matched = true;

    const replay = createGameState(() => 0.2);

    expect(replay.open).toEqual([]);
    expect(replay.moves).toBe(0);
    expect(replay.pairs).toBe(0);
    expect(replay.cards.every((card) => !card.matched)).toBe(true);
  });
});
