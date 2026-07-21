export type Animal = 'rabbit' | 'hedgehog' | 'fox' | 'frog';

export const ANIMALS: readonly Animal[] = ['rabbit', 'hedgehog', 'fox', 'frog'];

export interface Card {
  readonly id: number;
  readonly animal: Animal;
  matched: boolean;
}

export interface GameState {
  readonly cards: Card[];
  readonly open: number[];
  moves: number;
  pairs: number;
}

export type PairResult = 'match' | 'mismatch' | 'invalid';

export function makeDeck(random: () => number = Math.random): Card[] {
  const deck = ANIMALS
    .flatMap((animal) => [animal, animal])
    .map((animal, id) => ({ id, animal, matched: false }));

  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex]!, deck[index]!];
  }

  return deck;
}

export function createGameState(random: () => number = Math.random): GameState {
  return {
    cards: makeDeck(random),
    open: [],
    moves: 0,
    pairs: 0,
  };
}

export function canChoose(state: GameState, index: number): boolean {
  const card = state.cards[index];
  return Number.isInteger(index)
    && card !== undefined
    && !card.matched
    && !state.open.includes(index)
    && state.open.length < 2;
}

export function resolvePair(cards: readonly Card[], first: number, second: number): PairResult {
  const firstCard = cards[first];
  const secondCard = cards[second];
  if (
    firstCard === undefined
    || secondCard === undefined
    || first === second
    || firstCard.matched
    || secondCard.matched
  ) {
    return 'invalid';
  }

  return firstCard.animal === secondCard.animal ? 'match' : 'mismatch';
}

export function markPairMatched(state: GameState, first: number, second: number): boolean {
  if (resolvePair(state.cards, first, second) !== 'match') return false;
  state.cards[first]!.matched = true;
  state.cards[second]!.matched = true;
  state.pairs += 1;
  return true;
}

export function isComplete(state: GameState): boolean {
  return state.cards.length > 0 && state.cards.every((card) => card.matched);
}
