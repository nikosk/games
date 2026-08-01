export const COUNTING_STATIONS = ['count', 'add', 'train'] as const;

export type CountingStationId = (typeof COUNTING_STATIONS)[number];

export interface CountingState {
  readonly solved: Readonly<Record<CountingStationId, boolean>>;
}

/** One authored group of animals for the count-and-match station. */
export interface CountGroup {
  /** How many animals are in the group (1–5). */
  readonly count: number;
  /** Which animal kind to draw (0 rabbit, 1 duck, 2 fish). */
  readonly animal: number;
}

export interface AdditionRound {
  readonly left: number;
  readonly right: number;
  readonly answer: number;
  readonly choices: readonly number[];
}

export interface TrainRound {
  /** 4 carriage values; the blank carriage is stored as 0. */
  readonly sequence: readonly number[];
  readonly blankIndex: number;
  readonly answer: number;
  readonly choices: readonly number[];
}

/** Count station: three groups, numerals 2, 3 and 4 are the correct answers. */
export const COUNT_GROUPS: readonly CountGroup[] = [
  { count: 2, animal: 0 },
  { count: 3, animal: 1 },
  { count: 4, animal: 2 },
];

/** Addition station: three rounds, sums never exceed 5. The correct answer moves between the left, right and middle positions across rounds. */
export const ADDITION_ROUNDS: readonly AdditionRound[] = [
  { left: 1, right: 1, answer: 2, choices: [3, 1, 2] },
  { left: 1, right: 2, answer: 3, choices: [3, 2, 4] },
  { left: 2, right: 2, answer: 4, choices: [3, 4, 5] },
];

/** Train station: three rounds, missing number in a 1–5 sequence. */
export const TRAIN_ROUNDS: readonly TrainRound[] = [
  { sequence: [1, 2, 0, 4], blankIndex: 2, answer: 3, choices: [1, 3, 5] },
  { sequence: [0, 2, 3, 4], blankIndex: 0, answer: 1, choices: [1, 2, 4] },
  { sequence: [2, 3, 0, 5], blankIndex: 2, answer: 4, choices: [3, 4, 5] },
];

export function createCountingState(): CountingState {
  return {
    solved: {
      count: false,
      add: false,
      train: false,
    },
  };
}

export function solveCountingStation(state: CountingState, station: CountingStationId): CountingState {
  if (state.solved[station]) return state;
  return {
    solved: {
      ...state.solved,
      [station]: true,
    },
  };
}

export function countingSolvedCount(state: CountingState): number {
  return COUNTING_STATIONS.filter((station) => state.solved[station]).length;
}

export function countingComplete(state: CountingState): boolean {
  return countingSolvedCount(state) === COUNTING_STATIONS.length;
}

export function countMatches(group: CountGroup, numeral: number): boolean {
  return group.count === numeral;
}

export function additionRoundAnswer(round: AdditionRound, choice: number): boolean {
  return choice === round.answer;
}

export function trainRoundAnswer(round: TrainRound, choice: number): boolean {
  return choice === round.answer;
}

/** The full train sequence with the missing number filled in. */
export function trainSequenceWithAnswer(round: TrainRound): readonly number[] {
  return round.sequence.map((value, index) => (index === round.blankIndex ? round.answer : value));
}
