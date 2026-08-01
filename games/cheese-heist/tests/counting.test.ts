import { describe, expect, it } from 'vitest';
import {
  ADDITION_ROUNDS,
  COUNT_GROUPS,
  COUNTING_STATIONS,
  TRAIN_ROUNDS,
  additionRoundAnswer,
  countMatches,
  countingComplete,
  countingSolvedCount,
  createCountingState,
  solveCountingStation,
  trainRoundAnswer,
  trainSequenceWithAnswer,
} from '../src/game/counting';

describe('authored level 2 rounds', () => {
  it('has three count groups with sizes 1–5 and unique answers', () => {
    expect(COUNT_GROUPS).toHaveLength(3);
    const counts = COUNT_GROUPS.map((group) => group.count);
    expect(new Set(counts).size).toBe(counts.length);
    for (const group of COUNT_GROUPS) {
      expect(group.count).toBeGreaterThanOrEqual(1);
      expect(group.count).toBeLessThanOrEqual(5);
    }
  });

  it('addition rounds sum to their answer without exceeding 5', () => {
    expect(ADDITION_ROUNDS).toHaveLength(3);
    for (const round of ADDITION_ROUNDS) {
      expect(round.left + round.right).toBe(round.answer);
      expect(round.answer).toBeLessThanOrEqual(5);
      expect(round.choices).toContain(round.answer);
      expect(new Set(round.choices).size).toBe(round.choices.length);
    }
  });

  it('moves the correct addition answer across all three answer positions', () => {
    const positions = ADDITION_ROUNDS.map((round) => round.choices.indexOf(round.answer));
    expect(new Set(positions).size).toBe(3);
    expect(positions).toEqual(expect.arrayContaining([0, 1, 2]));
  });

  it('train rounds hide exactly one carriage and choices contain the answer', () => {
    expect(TRAIN_ROUNDS).toHaveLength(3);
    for (const round of TRAIN_ROUNDS) {
      expect(round.sequence).toHaveLength(4);
      expect(round.sequence[round.blankIndex]).toBe(0);
      expect(round.sequence.filter((value) => value === 0)).toHaveLength(1);
      expect(round.choices).toContain(round.answer);
      expect(new Set(round.choices).size).toBe(round.choices.length);

      const filled = trainSequenceWithAnswer(round);
      filled.forEach((value, index) => {
        if (index > 0) expect(value).toBe(filled[index - 1]! + 1);
      });
    }
  });
});

describe('level 2 progress', () => {
  it('completes only after all three stations are solved', () => {
    let state = createCountingState();
    expect(countingComplete(state)).toBe(false);

    for (const station of COUNTING_STATIONS) {
      state = solveCountingStation(state, station);
    }

    expect(countingSolvedCount(state)).toBe(3);
    expect(countingComplete(state)).toBe(true);
  });

  it('does not award the same star twice', () => {
    const state = solveCountingStation(createCountingState(), 'count');
    expect(solveCountingStation(state, 'count')).toBe(state);
    expect(countingSolvedCount(state)).toBe(1);
  });
});

describe('answer checks', () => {
  it('matches numerals to group counts', () => {
    expect(countMatches(COUNT_GROUPS[0]!, 2)).toBe(true);
    expect(countMatches(COUNT_GROUPS[0]!, 3)).toBe(false);
    expect(countMatches(COUNT_GROUPS[2]!, 4)).toBe(true);
  });

  it('checks addition and train choices', () => {
    expect(additionRoundAnswer(ADDITION_ROUNDS[0]!, 2)).toBe(true);
    expect(additionRoundAnswer(ADDITION_ROUNDS[0]!, 3)).toBe(false);
    expect(additionRoundAnswer(ADDITION_ROUNDS[2]!, 4)).toBe(true);

    expect(trainRoundAnswer(TRAIN_ROUNDS[0]!, 3)).toBe(true);
    expect(trainRoundAnswer(TRAIN_ROUNDS[0]!, 1)).toBe(false);
    expect(trainRoundAnswer(TRAIN_ROUNDS[1]!, 1)).toBe(true);
  });
});
