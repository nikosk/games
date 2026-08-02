import { describe, expect, it } from 'vitest';
import {
  createRoomState,
  roomComplete,
  roomSolvedCount,
  solveRoomStation,
} from '../src/game/roomState';
import {
  LEVEL_1_STATIONS,
  LEVEL_2_STATIONS,
} from '../src/game/puzzleTypes';
import { generateLightMelody } from '../src/game/generation';
import { createRng } from '../src/game/rng';
import { playMelody } from '../src/game/checks';

describe('room state', () => {
  it('starts with every station unsolved and completes after all eight', () => {
    for (const level of ['level1', 'level2'] as const) {
      let state = createRoomState(level);
      expect(roomSolvedCount(state)).toBe(0);
      expect(roomComplete(state)).toBe(false);
      const stations = level === 'level1' ? LEVEL_1_STATIONS : LEVEL_2_STATIONS;
      for (const station of stations) {
        expect(state.solved[station]).toBe(false);
        state = solveRoomStation(state, station);
      }
      expect(roomSolvedCount(state)).toBe(8);
      expect(roomComplete(state)).toBe(true);
    }
  });

  it('rejects stations from another level', () => {
    expect(() => solveRoomStation(createRoomState('level1'), 'blocks')).toThrow(/level1/);
    expect(() => solveRoomStation(createRoomState('level2'), 'teddy-shelf')).toThrow(/level2/);
  });

  it('is idempotent and never loses solved progress', () => {
    let state = createRoomState('level1');
    state = solveRoomStation(state, 'teddy-shelf');
    expect(solveRoomStation(state, 'teddy-shelf')).toBe(state);
    expect(roomSolvedCount(state)).toBe(1);

    state = solveRoomStation(state, 'moon-clock');
    expect(roomSolvedCount(state)).toBe(2);
    expect(state.solved['teddy-shelf']).toBe(true);
    expect(state.solved['moon-clock']).toBe(true);
  });
});

describe('melody step helper', () => {
  it('accepts the full generated sequence and resets gently on a mistake', () => {
    for (let seed = 1; seed <= 60; seed += 1) {
      const challenge = generateLightMelody(createRng(seed));
      let progress = { notes: [] as readonly number[], mistake: false, complete: false };
      for (const note of challenge.sequence) {
        progress = playMelody(challenge.sequence, progress.notes, note);
        expect(progress.mistake).toBe(false);
      }
      expect(progress.complete).toBe(true);

      const wrong = (challenge.sequence[0]! + 1) % 3;
      const reset = playMelody(challenge.sequence, [], wrong);
      expect(reset).toEqual({ notes: [], mistake: true, complete: false });
    }
  });
});
