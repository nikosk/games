export const ANIMALS = [
  'rabbit',
  'hedgehog',
  'fox',
  'frog',
  'badger',
  'deer',
  'owl',
  'squirrel',
  'otter',
  'bear',
  'wolf',
  'raccoon',
  'beaver',
  'lynx',
  'boar',
  'hare',
  'marten',
  'stoat',
] as const;

export type Animal = (typeof ANIMALS)[number];
export type DifficultyId = '2x4' | '3x4' | '4x4' | '6x6';

export interface DifficultyConfig {
  readonly id: DifficultyId;
  readonly label: string;
  readonly rows: number;
  readonly columns: number;
  readonly pairs: number;
}

export const DIFFICULTIES: readonly DifficultyConfig[] = [
  { id: '2x4', label: '2 × 4', rows: 2, columns: 4, pairs: 4 },
  { id: '3x4', label: '3 × 4', rows: 3, columns: 4, pairs: 6 },
  { id: '4x4', label: '4 × 4', rows: 4, columns: 4, pairs: 8 },
  { id: '6x6', label: '6 × 6', rows: 6, columns: 6, pairs: 18 },
];

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

export function getDifficulty(id: DifficultyId): DifficultyConfig {
  return DIFFICULTIES.find((difficulty) => difficulty.id === id) ?? DIFFICULTIES[0]!;
}

export function makeDeck(
  random: () => number = Math.random,
  difficulty: DifficultyConfig = DIFFICULTIES[0]!,
): Card[] {
  const deck = ANIMALS
    .slice(0, difficulty.pairs)
    .flatMap((animal) => [animal, animal])
    .map((animal, id) => ({ id, animal, matched: false }));

  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex]!, deck[index]!];
  }

  return deck;
}

export function createGameState(
  random: () => number = Math.random,
  difficulty: DifficultyConfig = DIFFICULTIES[0]!,
): GameState {
  return {
    cards: makeDeck(random, difficulty),
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
