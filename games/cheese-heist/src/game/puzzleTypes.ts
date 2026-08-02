/** Level 1: visual play. Odd one out is shared with Level 2. */
export const VISUAL_PUZZLE_TYPES = [
  'colour-match',
  'light-melody',
  'shadow-fit',
  'kaleidoscope-dials',
  'find-the-twin',
  'odd-one-out',
  'toy-tower',
  'peekaboo-pairs',
] as const;

export type VisualPuzzleType = (typeof VISUAL_PUZZLE_TYPES)[number];

/** Level 2: early number play. */
export const NUMBER_PUZZLE_TYPES = [
  'count-and-match',
  'picture-addition',
  'number-train',
  'more-or-fewer',
  'number-dials',
  'number-melody',
  'find-the-group',
] as const;

export type NumberPuzzleType = (typeof NUMBER_PUZZLE_TYPES)[number];

/** The full pool of 15 distinct puzzle types. */
export const PUZZLE_TYPES = [...VISUAL_PUZZLE_TYPES, ...NUMBER_PUZZLE_TYPES] as const;

export type PuzzleType = (typeof PUZZLE_TYPES)[number];

export type RoomLevel = 'level1' | 'level2';

/** The eight clickable objects in the Level 1 room. */
export const LEVEL_1_STATIONS = [
  'teddy-shelf',
  'moon-clock',
  'block-chest',
  'music-box',
  'star-mobile',
  'dollhouse',
  'toy-train',
  'jack-in-the-box',
] as const;

export type Level1Station = (typeof LEVEL_1_STATIONS)[number];

/** The eight clickable objects in the Level 2 room. */
export const LEVEL_2_STATIONS = [
  'blocks',
  'train',
  'fishbowl',
  'balloons',
  'cookies',
  'buttons',
  'eggs',
  'shells',
] as const;

export type Level2Station = (typeof LEVEL_2_STATIONS)[number];

export type StationId = Level1Station | Level2Station;

export const ROOM_STATIONS: Readonly<Record<RoomLevel, readonly StationId[]>> = {
  level1: LEVEL_1_STATIONS,
  level2: LEVEL_2_STATIONS,
};

/** The eight puzzle types a level may assign to its eight stations. */
export const LEVEL_PUZZLE_TYPES: Readonly<Record<RoomLevel, readonly PuzzleType[]>> = {
  level1: VISUAL_PUZZLE_TYPES,
  level2: [...NUMBER_PUZZLE_TYPES, 'odd-one-out'],
};

/** Colour match: drag coloured pieces onto toys that wear that colour. */
export interface ColourMatchChallenge {
  readonly type: 'colour-match';
  /** Toy ids in display order. */
  readonly toys: readonly number[];
  /** Target colour per toy (same index). */
  readonly targets: readonly number[];
  /** Shuffled colours; piece i belongs to the toy whose target equals it. */
  readonly pieces: readonly number[];
}

/** Light melody: watch and repeat a three-light sequence. */
export interface LightMelodyChallenge {
  readonly type: 'light-melody';
  /** Three light indices (0–2) to repeat; no adjacent repeats. */
  readonly sequence: readonly number[];
}

/** Shadow fit: drag felt shapes onto their silhouettes. */
export interface ShadowFitChallenge {
  readonly type: 'shadow-fit';
  /** Shape id expected by each shadow slot. */
  readonly slots: readonly number[];
  /** Shape ids in the order the draggable tiles are shown. */
  readonly tiles: readonly number[];
}

/** Kaleidoscope dials: cycle three symbols to match the model. */
export interface KaleidoscopeDialsChallenge {
  readonly type: 'kaleidoscope-dials';
  /** Three symbol values (0–2) the dials must show. */
  readonly target: readonly number[];
  /** Starting dial values; never equal to the target. */
  readonly dials: readonly number[];
  readonly symbolCount: number;
}

/** Find the twin: choose the toy identical to the model. */
export interface FindTheTwinChallenge {
  readonly type: 'find-the-twin';
  readonly model: number;
  /** Exactly one option equals the model. */
  readonly options: readonly number[];
}

/** Odd one out: choose the one toy that differs. */
export interface OddOneOutChallenge {
  readonly type: 'odd-one-out';
  /** Four options; exactly one differs from the other three. */
  readonly options: readonly number[];
  readonly oddIndex: number;
}

/** Toy tower: place three pieces in visible size order. */
export interface ToyTowerChallenge {
  readonly type: 'toy-tower';
  /** Piece ids in display order; smaller id means smaller piece. */
  readonly pieces: readonly number[];
}

/** Peekaboo pairs: reveal and match three toy pairs. */
export interface PeekabooPairsChallenge {
  readonly type: 'peekaboo-pairs';
  /** Six card values; each of the three values appears exactly twice. */
  readonly cards: readonly number[];
}

export interface CountGroup {
  /** How many animals are in the group (1–5). */
  readonly count: number;
  /** Which animal kind to draw. */
  readonly animal: number;
}

/** Count and match: connect groups to numerals 1–5. */
export interface CountAndMatchChallenge {
  readonly type: 'count-and-match';
  readonly groups: readonly CountGroup[];
  /** Numeral tiles in display order; each equals one group count. */
  readonly numerals: readonly number[];
}

/** Picture addition: choose the sum of two small groups. */
export interface PictureAdditionChallenge {
  readonly type: 'picture-addition';
  readonly left: number;
  readonly right: number;
  readonly answer: number;
  readonly choices: readonly number[];
}

/** Number train: fill one missing numeral in an increasing sequence. */
export interface NumberTrainChallenge {
  readonly type: 'number-train';
  /** Four carriages; the blank carriage is 0. */
  readonly sequence: readonly number[];
  readonly blankIndex: number;
  readonly answer: number;
  readonly choices: readonly number[];
}

/** More or fewer: choose the visibly larger group. */
export interface MoreOrFewerChallenge {
  readonly type: 'more-or-fewer';
  readonly left: number;
  readonly right: number;
  readonly answer: 'left' | 'right';
}

/** Number dials: cycle numeral dials to match pictured groups. */
export interface NumberDialsChallenge {
  readonly type: 'number-dials';
  /** Counts (1–5) the dials must show. */
  readonly targets: readonly number[];
  /** Starting numerals (1–5); never equal to the targets. */
  readonly dials: readonly number[];
  readonly symbolCount: number;
}

/** Number melody: repeat a three-button numeral/light sequence. */
export interface NumberMelodyChallenge {
  readonly type: 'number-melody';
  /** Numerals shown on the three buttons (1–5, distinct). */
  readonly buttons: readonly number[];
  /** Three button indices (0–2) to repeat; no adjacent repeats. */
  readonly sequence: readonly number[];
}

/** Find the group: choose the animal group matching a numeral ticket. */
export interface FindTheGroupChallenge {
  readonly type: 'find-the-group';
  /** Numeral ticket (1–5). */
  readonly ticket: number;
  /** Group sizes in display order; exactly one equals the ticket. */
  readonly groups: readonly number[];
}

/** The full set of challenge payloads, discriminated by `type`. */
export type PuzzleChallenge =
  | ColourMatchChallenge
  | LightMelodyChallenge
  | ShadowFitChallenge
  | KaleidoscopeDialsChallenge
  | FindTheTwinChallenge
  | OddOneOutChallenge
  | ToyTowerChallenge
  | PeekabooPairsChallenge
  | CountAndMatchChallenge
  | PictureAdditionChallenge
  | NumberTrainChallenge
  | MoreOrFewerChallenge
  | NumberDialsChallenge
  | NumberMelodyChallenge
  | FindTheGroupChallenge;
