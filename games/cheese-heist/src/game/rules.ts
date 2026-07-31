export const PUZZLES = ['teddies', 'melody', 'picture', 'kaleidoscope'] as const;

export type PuzzleId = (typeof PUZZLES)[number];

export interface ToyshopState {
  readonly solved: Readonly<Record<PuzzleId, boolean>>;
}

export const MELODY = [0, 2, 1] as const;
export const LENS_TARGET = [2, 0, 1] as const;

export interface MelodyProgress {
  readonly notes: readonly number[];
  readonly mistake: boolean;
  readonly complete: boolean;
}

export function createToyshopState(): ToyshopState {
  return {
    solved: {
      teddies: false,
      melody: false,
      picture: false,
      kaleidoscope: false,
    },
  };
}

export function solvePuzzle(state: ToyshopState, puzzle: PuzzleId): ToyshopState {
  if (state.solved[puzzle]) return state;
  return {
    solved: {
      ...state.solved,
      [puzzle]: true,
    },
  };
}

export function solvedCount(state: ToyshopState): number {
  return PUZZLES.filter((puzzle) => state.solved[puzzle]).length;
}

export function doorIsOpen(state: ToyshopState): boolean {
  return solvedCount(state) === PUZZLES.length;
}

export function itemMatchesTarget(item: number, target: number): boolean {
  return item === target;
}

export function playMelodyNote(notes: readonly number[], note: number): MelodyProgress {
  const expected = MELODY[notes.length];
  if (expected === undefined || note !== expected) {
    return { notes: [], mistake: true, complete: false };
  }

  const next = [...notes, note];
  return {
    notes: next,
    mistake: false,
    complete: next.length === MELODY.length,
  };
}

export function cycleLens(value: number, symbolCount = 3): number {
  return (value + 1) % symbolCount;
}

export function lensesMatch(values: readonly number[]): boolean {
  return values.length === LENS_TARGET.length
    && values.every((value, index) => value === LENS_TARGET[index]);
}
