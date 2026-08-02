import type {
  ColourMatchChallenge,
  CountAndMatchChallenge,
  FindTheGroupChallenge,
  FindTheTwinChallenge,
  KaleidoscopeDialsChallenge,
  LightMelodyChallenge,
  MoreOrFewerChallenge,
  NumberDialsChallenge,
  NumberMelodyChallenge,
  NumberTrainChallenge,
  OddOneOutChallenge,
  PeekabooPairsChallenge,
  PictureAdditionChallenge,
  PuzzleChallenge,
  PuzzleType,
  RoomLevel,
  ShadowFitChallenge,
  StationId,
  ToyTowerChallenge,
} from './puzzleTypes';
import { LEVEL_PUZZLE_TYPES, ROOM_STATIONS } from './puzzleTypes';
import { distinctInts, rngInt, rngPick, rngShuffle, type Rng } from './rng';

export interface RoomSetup {
  readonly level: RoomLevel;
  readonly stations: readonly StationId[];
  /** Station → assigned puzzle type; eight distinct types, stable for the visit. */
  readonly stationTypes: Readonly<Record<StationId, PuzzleType>>;
  /** Station → generated challenge. */
  readonly challenges: Readonly<Record<StationId, PuzzleChallenge>>;
}

/** Assigns every station of the level a distinct puzzle type and generates its challenge. */
export function createRoomSetup(rng: Rng, level: RoomLevel): RoomSetup {
  const stations = ROOM_STATIONS[level];
  const types = rngShuffle(rng, LEVEL_PUZZLE_TYPES[level]);
  if (types.length !== stations.length) {
    throw new Error(`Puzzle pool for ${level} must contain exactly ${stations.length} types`);
  }
  const stationTypes = {} as Record<StationId, PuzzleType>;
  const challenges = {} as Record<StationId, PuzzleChallenge>;
  stations.forEach((station, index) => {
    const type = types[index]!;
    stationTypes[station] = type;
    challenges[station] = generateChallenge(type, rng);
  });
  return { level, stations, stationTypes, challenges };
}

export function generateChallenge(type: PuzzleType, rng: Rng): PuzzleChallenge {
  switch (type) {
    case 'colour-match': return generateColourMatch(rng);
    case 'light-melody': return generateLightMelody(rng);
    case 'shadow-fit': return generateShadowFit(rng);
    case 'kaleidoscope-dials': return generateKaleidoscopeDials(rng);
    case 'find-the-twin': return generateFindTheTwin(rng);
    case 'odd-one-out': return generateOddOneOut(rng);
    case 'toy-tower': return generateToyTower(rng);
    case 'peekaboo-pairs': return generatePeekabooPairs(rng);
    case 'count-and-match': return generateCountAndMatch(rng);
    case 'picture-addition': return generatePictureAddition(rng);
    case 'number-train': return generateNumberTrain(rng);
    case 'more-or-fewer': return generateMoreOrFewer(rng);
    case 'number-dials': return generateNumberDials(rng);
    case 'number-melody': return generateNumberMelody(rng);
    case 'find-the-group': return generateFindTheGroup(rng);
    default: {
      const unreachable: never = type;
      throw new Error(`Unknown puzzle type: ${unreachable}`);
    }
  }
}

/** Three toys, each wearing a distinct colour; pieces are the shuffled colours. */
export function generateColourMatch(rng: Rng): ColourMatchChallenge {
  const toys = distinctInts(rng, 3, 0, 4);
  const targets = distinctInts(rng, 3, 0, 4);
  const pieces = rngShuffle(rng, targets);
  return { type: 'colour-match', toys, targets, pieces };
}

export function generateLightMelody(rng: Rng): LightMelodyChallenge {
  return { type: 'light-melody', sequence: generateMelodySequence(rng, 3, 3) };
}

/** Three shadow slots and three draggable shapes, each shuffled. */
export function generateShadowFit(rng: Rng): ShadowFitChallenge {
  const slots = rngShuffle(rng, [0, 1, 2]);
  const tiles = rngShuffle(rng, [0, 1, 2]);
  // Never show every tile already sitting in its matching slot.
  if (tiles.every((tile, index) => tile === slots[index])) {
    [tiles[0], tiles[1]] = [tiles[1]!, tiles[0]!];
  }
  return { type: 'shadow-fit', slots, tiles };
}

/** Three distinct target symbols; dials start one or two taps away. */
export function generateKaleidoscopeDials(rng: Rng): KaleidoscopeDialsChallenge {
  const symbolCount = 3;
  const target = distinctInts(rng, 3, 0, symbolCount - 1);
  const dials = target.map((value) => (value + rngPick(rng, [1, 2])) % symbolCount);
  return { type: 'kaleidoscope-dials', target, dials, symbolCount };
}

/** A model toy and two different distractors. */
export function generateFindTheTwin(rng: Rng): FindTheTwinChallenge {
  const model = rngInt(rng, 0, 4);
  const pool = [0, 1, 2, 3, 4].filter((id) => id !== model);
  const options = rngShuffle(rng, [model, pool[0]!, pool[1]!]);
  return { type: 'find-the-twin', model, options };
}

/** Three identical options and one different one. */
export function generateOddOneOut(rng: Rng): OddOneOutChallenge {
  const common = rngInt(rng, 0, 4);
  let odd = rngInt(rng, 0, 3);
  if (odd >= common) odd += 1;
  const options = rngShuffle(rng, [common, common, common, odd]);
  return { type: 'odd-one-out', options, oddIndex: options.indexOf(odd) };
}

/** Three pieces in display order; piece id is its size (0 smallest). */
export function generateToyTower(rng: Rng): ToyTowerChallenge {
  const pieces = rngShuffle(rng, [0, 1, 2]);
  // A fresh tower must require an action; largest-to-smallest is the physical solution.
  if (pieces.every((piece, index) => piece === 2 - index)) {
    [pieces[0], pieces[1]] = [pieces[1]!, pieces[0]!];
  }
  return { type: 'toy-tower', pieces };
}

/** Six cards: each of the three values appears exactly twice. */
export function generatePeekabooPairs(rng: Rng): PeekabooPairsChallenge {
  return { type: 'peekaboo-pairs', cards: rngShuffle(rng, [0, 0, 1, 1, 2, 2]) };
}

/** Three groups with distinct counts 1–5; numerals are the shuffled counts. */
export function generateCountAndMatch(rng: Rng): CountAndMatchChallenge {
  const counts = distinctInts(rng, 3, 1, 5);
  const groups = counts.map((count, index) => ({ count, animal: index }));
  return { type: 'count-and-match', groups, numerals: rngShuffle(rng, counts) };
}

/** Two small groups whose sum never exceeds 5; three distinct choices. */
export function generatePictureAddition(rng: Rng): PictureAdditionChallenge {
  let left = 1;
  let right = 1;
  do {
    left = rngInt(rng, 1, 3);
    right = rngInt(rng, 1, 3);
  } while (left + right > 5);
  const answer = left + right;
  const distractors = rngShuffle(rng, [1, 2, 3, 4, 5].filter((value) => value !== answer)).slice(0, 2);
  return {
    type: 'picture-addition',
    left,
    right,
    answer,
    choices: rngShuffle(rng, [answer, distractors[0]!, distractors[1]!]),
  };
}

/** Four consecutive carriages within 1–5 with exactly one blank. */
export function generateNumberTrain(rng: Rng): NumberTrainChallenge {
  const start = rngInt(rng, 1, 2);
  const full = [start, start + 1, start + 2, start + 3];
  const blankIndex = rngInt(rng, 0, 3);
  const answer = full[blankIndex]!;
  const distractors = rngShuffle(rng, [1, 2, 3, 4, 5].filter((value) => value !== answer)).slice(0, 2);
  return {
    type: 'number-train',
    sequence: full.map((value, index) => (index === blankIndex ? 0 : value)),
    blankIndex,
    answer,
    choices: rngShuffle(rng, [answer, distractors[0]!, distractors[1]!]),
  };
}

/** Two groups of 1–5 that are never equal; the answer is the larger side. */
export function generateMoreOrFewer(rng: Rng): MoreOrFewerChallenge {
  const left = rngInt(rng, 1, 5);
  let right = rngInt(rng, 1, 5);
  while (right === left) right = rngInt(rng, 1, 5);
  return { type: 'more-or-fewer', left, right, answer: left > right ? 'left' : 'right' };
}

/** Three distinct target counts; dials start one or two taps away. */
export function generateNumberDials(rng: Rng): NumberDialsChallenge {
  const symbolCount = 5;
  const targets = distinctInts(rng, 3, 1, symbolCount);
  const dials = targets.map((value) => numberDialStart(value, symbolCount, rng));
  return { type: 'number-dials', targets, dials, symbolCount };
}

/** A start numeral that reaches the target in one or two forward taps. */
function numberDialStart(target: number, symbolCount: number, rng: Rng): number {
  const offset = rngPick(rng, [1, 2]);
  return ((target - offset + symbolCount - 1) % symbolCount) + 1;
}

/** Three distinct button numerals and a three-tap sequence. */
export function generateNumberMelody(rng: Rng): NumberMelodyChallenge {
  return {
    type: 'number-melody',
    buttons: distinctInts(rng, 3, 1, 5),
    sequence: generateMelodySequence(rng, 3, 3),
  };
}

/** A ticket numeral and three distinct group sizes, exactly one matching. */
export function generateFindTheGroup(rng: Rng): FindTheGroupChallenge {
  const ticket = rngInt(rng, 1, 5);
  const groups: number[] = [ticket];
  while (groups.length < 3) {
    const value = rngInt(rng, 1, 5);
    if (!groups.includes(value)) groups.push(value);
  }
  return { type: 'find-the-group', ticket, groups: rngShuffle(rng, groups) };
}

/** A note/button sequence of the given length with no adjacent repeats. */
function generateMelodySequence(rng: Rng, length: number, buttonCount: number): number[] {
  const sequence: number[] = [];
  let previous = -1;
  for (let index = 0; index < length; index += 1) {
    let note = rngInt(rng, 0, buttonCount - 1);
    while (note === previous) note = rngInt(rng, 0, buttonCount - 1);
    sequence.push(note);
    previous = note;
  }
  return sequence;
}
