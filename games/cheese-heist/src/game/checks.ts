import type {
  ColourMatchChallenge,
  CountAndMatchChallenge,
  FindTheGroupChallenge,
  FindTheTwinChallenge,
  KaleidoscopeDialsChallenge,
  MoreOrFewerChallenge,
  NumberDialsChallenge,
  NumberTrainChallenge,
  OddOneOutChallenge,
  PeekabooPairsChallenge,
  PictureAdditionChallenge,
  ShadowFitChallenge,
  ToyTowerChallenge,
} from './puzzleTypes';

export interface MelodyProgress {
  readonly notes: readonly number[];
  readonly mistake: boolean;
  readonly complete: boolean;
}

/** Advances the repeated sequence; a wrong note resets the attempt. */
export function playMelody(
  sequence: readonly number[],
  notes: readonly number[],
  note: number,
): MelodyProgress {
  const expected = sequence[notes.length];
  if (expected === undefined || note !== expected) {
    return { notes: [], mistake: true, complete: false };
  }
  const next = [...notes, note];
  return { notes: next, mistake: false, complete: next.length === sequence.length };
}

/** Whether this colour piece belongs on this toy. */
export function colourPieceMatches(challenge: ColourMatchChallenge, piece: number, toy: number): boolean {
  return challenge.pieces[piece] === challenge.targets[toy];
}

/** Whether this shape tile belongs in this shadow slot. */
export function shadowTileMatches(challenge: ShadowFitChallenge, tile: number, slot: number): boolean {
  return challenge.tiles[tile] === challenge.slots[slot];
}

/** Advances a visual dial through symbols numbered 0 to symbolCount - 1. */
export function cycleDial(value: number, symbolCount: number): number {
  return (value + 1) % symbolCount;
}

export function kaleidoscopeSolved(challenge: KaleidoscopeDialsChallenge, dials: readonly number[]): boolean {
  return dials.length === challenge.target.length
    && dials.every((value, index) => value === challenge.target[index]);
}

export function twinAnswer(challenge: FindTheTwinChallenge, option: number): boolean {
  return challenge.options[option] === challenge.model;
}

export function oddOneOutAnswer(challenge: OddOneOutChallenge, option: number): boolean {
  return option === challenge.oddIndex;
}

/** The physical tower is built largest-to-smallest: largest base, smallest top. */
export function towerOrder(challenge: ToyTowerChallenge): readonly number[] {
  return [...challenge.pieces].sort((a, b) => b - a);
}

/** The next piece a correct placement should place. */
export function towerNextExpected(challenge: ToyTowerChallenge, placed: readonly number[]): number | undefined {
  return towerOrder(challenge)[placed.length];
}

/** True when every piece has been placed in largest-to-smallest order. */
export function towerPlacementCorrect(challenge: ToyTowerChallenge, placed: readonly number[]): boolean {
  const order = towerOrder(challenge);
  return placed.length === order.length && placed.every((piece, index) => piece === order[index]);
}

export function peekabooPairMatches(challenge: PeekabooPairsChallenge, first: number, second: number): boolean {
  return first !== second && challenge.cards[first] === challenge.cards[second];
}

/** Whether this numeral tile matches this animal group. */
export function countPieceMatches(challenge: CountAndMatchChallenge, piece: number, group: number): boolean {
  return challenge.numerals[piece] === challenge.groups[group]!.count;
}

export function additionAnswer(challenge: PictureAdditionChallenge, choice: number): boolean {
  return choice === challenge.answer;
}

export function trainAnswer(challenge: NumberTrainChallenge, choice: number): boolean {
  return choice === challenge.answer;
}

export function moreOrFewerAnswer(challenge: MoreOrFewerChallenge, side: 'left' | 'right'): boolean {
  return side === challenge.answer;
}

/** Advances one number dial by one numeral (wraps 1–symbolCount). */
export function cycleNumeral(value: number, symbolCount: number): number {
  return (value % symbolCount) + 1;
}

export function numberDialsSolved(challenge: NumberDialsChallenge, dials: readonly number[]): boolean {
  return dials.length === challenge.targets.length
    && dials.every((value, index) => value === challenge.targets[index]);
}

export function findGroupAnswer(challenge: FindTheGroupChallenge, group: number): boolean {
  return challenge.groups[group] === challenge.ticket;
}
