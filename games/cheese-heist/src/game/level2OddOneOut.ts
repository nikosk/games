import type { OddOneOutChallenge } from './puzzleTypes';

export interface Level2OddOneOutCard {
  /** Numeral shown above the animal group. */
  readonly numeral: number;
  /** Number of animals drawn in the group. */
  readonly groupCount: number;
}

/**
 * Converts shared visual toy ids (0–4) into the Level 2 numeral range (1–5).
 * The three ordinary cards keep the common count; only the odd card's numeral differs.
 */
export function level2OddOneOutCards(challenge: OddOneOutChallenge): readonly Level2OddOneOutCard[] {
  const commonId = challenge.options.find((_value, index) => index !== challenge.oddIndex);
  if (commonId === undefined) throw new Error('Odd-one-out challenge has no common option');
  const groupCount = toyIdToLevel2Numeral(commonId);
  return challenge.options.map((value) => ({
    numeral: toyIdToLevel2Numeral(value),
    groupCount,
  }));
}

function toyIdToLevel2Numeral(id: number): number {
  if (!Number.isInteger(id) || id < 0 || id > 4) throw new Error(`Invalid shared toy id: ${id}`);
  return id + 1;
}
