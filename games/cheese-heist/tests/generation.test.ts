import { describe, expect, it } from 'vitest';
import {
  createRoomSetup,
  generateColourMatch,
  generateCountAndMatch,
  generateFindTheGroup,
  generateFindTheTwin,
  generateKaleidoscopeDials,
  generateLightMelody,
  generateMoreOrFewer,
  generateNumberDials,
  generateNumberMelody,
  generateNumberTrain,
  generateOddOneOut,
  generatePeekabooPairs,
  generatePictureAddition,
  generateShadowFit,
  generateToyTower,
} from '../src/game/generation';
import {
  LEVEL_1_STATIONS,
  LEVEL_2_STATIONS,
  LEVEL_PUZZLE_TYPES,
  PUZZLE_TYPES,
} from '../src/game/puzzleTypes';
import { level2OddOneOutCards } from '../src/game/level2OddOneOut';
import { createRng } from '../src/game/rng';
import { findOverlappingStations, LEVEL_2_STATION_BOUNDS } from '../src/game/stationLayout';
import {
  additionAnswer,
  colourPieceMatches,
  countPieceMatches,
  cycleDial,
  cycleNumeral,
  findGroupAnswer,
  kaleidoscopeSolved,
  moreOrFewerAnswer,
  numberDialsSolved,
  oddOneOutAnswer,
  peekabooPairMatches,
  shadowTileMatches,
  towerNextExpected,
  towerPlacementCorrect,
  trainAnswer,
  twinAnswer,
} from '../src/game/checks';

const SEEDS = 60;

describe('deterministic room setup', () => {
  it('produces identical assignments and challenges for the same seed', () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      for (const level of ['level1', 'level2'] as const) {
        const first = createRoomSetup(createRng(seed), level);
        const second = createRoomSetup(createRng(seed), level);
        expect(second).toEqual(first);
      }
    }
  });

  it('assigns eight distinct puzzle types to every station', () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      for (const level of ['level1', 'level2'] as const) {
        const setup = createRoomSetup(createRng(seed), level);
        const types = [...Object.values(setup.stationTypes)].sort();
        expect(new Set(types).size).toBe(8);
        expect(types).toEqual([...LEVEL_PUZZLE_TYPES[level]].sort());
        expect(setup.stations).toEqual(level === 'level1' ? LEVEL_1_STATIONS : LEVEL_2_STATIONS);
        expect(Object.keys(setup.stationTypes)).toHaveLength(setup.stations.length);
        expect(Object.keys(setup.challenges)).toHaveLength(setup.stations.length);
        expect(JSON.parse(JSON.stringify(setup))).toEqual(setup);
        for (const station of setup.stations) {
          expect(setup.stationTypes[station]).toBeDefined();
          expect(setup.challenges[station]).toBeDefined();
        }
      }
    }
  });

  it('covers every puzzle type across a few rooms of both levels', () => {
    const seen = new Set<string>();
    for (const level of ['level1', 'level2'] as const) {
      for (let seed = 1; seed <= 40; seed += 1) {
        const setup = createRoomSetup(createRng(seed), level);
        for (const challenge of Object.values(setup.challenges)) seen.add(challenge.type);
      }
    }
    expect([...seen].sort()).toEqual([...PUZZLE_TYPES].sort());
  });
});

describe('generated challenge invariants', () => {
  it('colour match: distinct toys and colours, exactly one correct piece per toy', () => {
    for (let seed = 1; seed <= SEEDS; seed += 1) {
      const challenge = generateColourMatch(createRng(seed));
      expect(new Set(challenge.toys).size).toBe(3);
      expect(new Set(challenge.targets).size).toBe(3);
      expect(new Set(challenge.pieces).size).toBe(3);
      challenge.toys.forEach((_toy, toy) => {
        const matches = challenge.pieces
          .map((_piece, piece) => colourPieceMatches(challenge, piece, toy))
          .filter(Boolean);
        expect(matches).toHaveLength(1);
      });
      challenge.pieces.forEach((_piece, piece) => {
        const matches = challenge.toys
          .map((_toy, toy) => colourPieceMatches(challenge, piece, toy))
          .filter(Boolean);
        expect(matches).toHaveLength(1);
      });
    }
  });

  it('light melody: three notes with no adjacent repeats', () => {
    for (let seed = 1; seed <= SEEDS; seed += 1) {
      const challenge = generateLightMelody(createRng(seed));
      expect(challenge.sequence).toHaveLength(3);
      challenge.sequence.forEach((note, index) => {
        expect(note).toBeGreaterThanOrEqual(0);
        expect(note).toBeLessThanOrEqual(2);
        if (index > 0) expect(note).not.toBe(challenge.sequence[index - 1]);
      });
    }
  });

  it('shadow fit: every tile matches exactly one slot and the display starts unsolved', () => {
    for (let seed = 1; seed <= SEEDS; seed += 1) {
      const challenge = generateShadowFit(createRng(seed));
      expect(new Set(challenge.slots).size).toBe(3);
      expect(new Set(challenge.tiles).size).toBe(3);
      expect(challenge.tiles).not.toEqual(challenge.slots);
      challenge.tiles.forEach((_tile, tile) => {
        const matches = challenge.slots
          .map((_slot, slot) => shadowTileMatches(challenge, tile, slot))
          .filter(Boolean);
        expect(matches).toHaveLength(1);
      });
    }
  });

  it('kaleidoscope dials: not solved initially, solvable in at most two taps per dial', () => {
    for (let seed = 1; seed <= SEEDS; seed += 1) {
      const challenge = generateKaleidoscopeDials(createRng(seed));
      expect(challenge.target).toHaveLength(3);
      expect(new Set(challenge.target).size).toBe(3);
      challenge.target.forEach((value, index) => {
        expect(challenge.dials[index]).not.toBe(value);
        let taps = 0;
        let dial = challenge.dials[index]!;
        while (dial !== value) {
          dial = cycleDial(dial, challenge.symbolCount);
          taps += 1;
        }
        expect(taps).toBeLessThanOrEqual(2);
      });
      expect(kaleidoscopeSolved(challenge, challenge.target)).toBe(true);
      expect(kaleidoscopeSolved(challenge, challenge.dials)).toBe(false);
    }
  });

  it('find the twin: exactly one option matches the model', () => {
    for (let seed = 1; seed <= SEEDS; seed += 1) {
      const challenge = generateFindTheTwin(createRng(seed));
      expect(challenge.options).toHaveLength(3);
      expect(challenge.options.filter((option) => option === challenge.model)).toHaveLength(1);
      expect(twinAnswer(challenge, challenge.options.indexOf(challenge.model))).toBe(true);
      expect(twinAnswer(challenge, (challenge.options.indexOf(challenge.model) + 1) % 3)).toBe(false);
    }
  });

  it('odd one out: three identical options and exactly one different', () => {
    for (let seed = 1; seed <= SEEDS; seed += 1) {
      const challenge = generateOddOneOut(createRng(seed));
      expect(challenge.options).toHaveLength(4);
      const counts = new Map<number, number>();
      for (const option of challenge.options) counts.set(option, (counts.get(option) ?? 0) + 1);
      expect([...counts.values()].sort()).toEqual([1, 3]);
      expect(challenge.options[challenge.oddIndex]).toBeDefined();
      expect(oddOneOutAnswer(challenge, challenge.oddIndex)).toBe(true);
      expect(oddOneOutAnswer(challenge, (challenge.oddIndex + 1) % 4)).toBe(false);
    }
  });

  it('Level 2 odd one out maps shared ids to 1–5 with one salient mismatch', () => {
    for (let seed = 1; seed <= SEEDS; seed += 1) {
      const challenge = generateOddOneOut(createRng(seed));
      const cards = level2OddOneOutCards(challenge);
      expect(cards).toHaveLength(4);
      cards.forEach((card) => {
        expect(card.numeral).toBeGreaterThanOrEqual(1);
        expect(card.numeral).toBeLessThanOrEqual(5);
        expect(card.groupCount).toBeGreaterThanOrEqual(1);
        expect(card.groupCount).toBeLessThanOrEqual(5);
      });
      expect(cards.filter((card) => card.numeral === card.groupCount)).toHaveLength(3);
      expect(cards[challenge.oddIndex]!.numeral).not.toBe(cards[challenge.oddIndex]!.groupCount);
    }
  });

  it('Level 2 station hit areas have no overlaps', () => {
    expect(findOverlappingStations(LEVEL_2_STATION_BOUNDS)).toEqual([]);
  });

  it('toy tower: pieces are a permutation and placement must ascend by size', () => {
    for (let seed = 1; seed <= SEEDS; seed += 1) {
      const challenge = generateToyTower(createRng(seed));
      expect([...challenge.pieces].sort()).toEqual([0, 1, 2]);
      expect(challenge.pieces).not.toEqual([2, 1, 0]);
      expect(towerNextExpected(challenge, [])).toBe(2);
      expect(towerNextExpected(challenge, [2, 1])).toBe(0);
      expect(towerPlacementCorrect(challenge, [2, 1, 0])).toBe(true);
      expect(towerPlacementCorrect(challenge, [0, 1, 2])).toBe(false);
      expect(towerPlacementCorrect(challenge, [0, 1])).toBe(false);
    }
  });

  it('peekaboo pairs: each value appears exactly twice', () => {
    for (let seed = 1; seed <= SEEDS; seed += 1) {
      const challenge = generatePeekabooPairs(createRng(seed));
      expect(challenge.cards).toHaveLength(6);
      const counts = new Map<number, number>();
      for (const card of challenge.cards) counts.set(card, (counts.get(card) ?? 0) + 1);
      expect([...counts.values()]).toEqual([2, 2, 2]);
      expect(peekabooPairMatches(challenge, 0, 1)).toBe(challenge.cards[0] === challenge.cards[1]);
    }
  });

  it('count and match: distinct counts 1–5, each numeral matches exactly one group', () => {
    for (let seed = 1; seed <= SEEDS; seed += 1) {
      const challenge = generateCountAndMatch(createRng(seed));
      expect(challenge.groups).toHaveLength(3);
      expect(new Set(challenge.groups.map((group) => group.count)).size).toBe(3);
      for (const group of challenge.groups) {
        expect(group.count).toBeGreaterThanOrEqual(1);
        expect(group.count).toBeLessThanOrEqual(5);
      }
      expect(new Set(challenge.numerals).size).toBe(3);
      challenge.numerals.forEach((_numeral, piece) => {
        const matches = challenge.groups
          .map((_group, group) => countPieceMatches(challenge, piece, group))
          .filter(Boolean);
        expect(matches).toHaveLength(1);
      });
    }
  });

  it('picture addition: sums stay within 1–5 and choices contain the answer once', () => {
    for (let seed = 1; seed <= SEEDS; seed += 1) {
      const challenge = generatePictureAddition(createRng(seed));
      expect(challenge.left).toBeGreaterThanOrEqual(1);
      expect(challenge.right).toBeGreaterThanOrEqual(1);
      expect(challenge.left + challenge.right).toBe(challenge.answer);
      expect(challenge.answer).toBeLessThanOrEqual(5);
      expect(new Set(challenge.choices).size).toBe(3);
      expect(challenge.choices.filter((choice) => choice === challenge.answer)).toHaveLength(1);
      expect(additionAnswer(challenge, challenge.answer)).toBe(true);
    }
  });

  it('number train: one blank, increasing 1–5 sequence, distinct choices', () => {
    for (let seed = 1; seed <= SEEDS; seed += 1) {
      const challenge = generateNumberTrain(createRng(seed));
      expect(challenge.sequence).toHaveLength(4);
      expect(challenge.sequence.filter((value) => value === 0)).toHaveLength(1);
      expect(challenge.sequence[challenge.blankIndex]).toBe(0);
      const filled = challenge.sequence.map((value, index) =>
        index === challenge.blankIndex ? challenge.answer : value);
      filled.forEach((value, index) => {
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(5);
        if (index > 0) expect(value).toBe(filled[index - 1]! + 1);
      });
      expect(new Set(challenge.choices).size).toBe(3);
      expect(challenge.choices.filter((choice) => choice === challenge.answer)).toHaveLength(1);
      expect(trainAnswer(challenge, challenge.answer)).toBe(true);
      expect(trainAnswer(challenge, challenge.choices.find((choice) => choice !== challenge.answer)!)).toBe(false);
    }
  });

  it('more or fewer: groups are never equal and the answer is the larger side', () => {
    for (let seed = 1; seed <= SEEDS; seed += 1) {
      const challenge = generateMoreOrFewer(createRng(seed));
      expect(challenge.left).not.toBe(challenge.right);
      const larger = challenge.left > challenge.right ? 'left' : 'right';
      expect(challenge.answer).toBe(larger);
      expect(moreOrFewerAnswer(challenge, larger)).toBe(true);
      expect(moreOrFewerAnswer(challenge, larger === 'left' ? 'right' : 'left')).toBe(false);
    }
  });

  it('number dials: not solved initially, solvable in at most two taps per dial', () => {
    for (let seed = 1; seed <= SEEDS; seed += 1) {
      const challenge = generateNumberDials(createRng(seed));
      expect(new Set(challenge.targets).size).toBe(3);
      for (const target of challenge.targets) {
        expect(target).toBeGreaterThanOrEqual(1);
        expect(target).toBeLessThanOrEqual(5);
      }
      challenge.targets.forEach((target, index) => {
        expect(challenge.dials[index]).not.toBe(target);
        let taps = 0;
        let dial = challenge.dials[index]!;
        while (dial !== target) {
          dial = cycleNumeral(dial, challenge.symbolCount);
          taps += 1;
        }
        expect(taps).toBeLessThanOrEqual(2);
      });
      expect(numberDialsSolved(challenge, challenge.targets)).toBe(true);
      expect(numberDialsSolved(challenge, challenge.dials)).toBe(false);
    }
  });

  it('number melody: distinct button numerals and a clean sequence', () => {
    for (let seed = 1; seed <= SEEDS; seed += 1) {
      const challenge = generateNumberMelody(createRng(seed));
      expect(new Set(challenge.buttons).size).toBe(3);
      for (const button of challenge.buttons) {
        expect(button).toBeGreaterThanOrEqual(1);
        expect(button).toBeLessThanOrEqual(5);
      }
      expect(challenge.sequence).toHaveLength(3);
      challenge.sequence.forEach((note, index) => {
        expect(note).toBeGreaterThanOrEqual(0);
        expect(note).toBeLessThanOrEqual(2);
        if (index > 0) expect(note).not.toBe(challenge.sequence[index - 1]);
      });
    }
  });

  it('find the group: exactly one group matches the ticket', () => {
    for (let seed = 1; seed <= SEEDS; seed += 1) {
      const challenge = generateFindTheGroup(createRng(seed));
      expect(challenge.ticket).toBeGreaterThanOrEqual(1);
      expect(challenge.ticket).toBeLessThanOrEqual(5);
      expect(challenge.groups).toHaveLength(3);
      expect(new Set(challenge.groups).size).toBe(3);
      const matches = challenge.groups
        .map((_group, index) => findGroupAnswer(challenge, index))
        .filter(Boolean);
      expect(matches).toHaveLength(1);
      expect(challenge.groups.find((group) => group === challenge.ticket)).toBeDefined();
    }
  });
});
