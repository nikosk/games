import { describe, expect, it } from 'vitest';
import { appendCommand, clearBelt, removeCommandAt, removeLastCommand } from '../src/game/belt';
import { BELT_SLOTS } from '../src/game/level';
import type { Command } from '../src/game/rules';

describe('belt editing', () => {
  it('appends directly in command-button order', () => {
    const first = appendCommand([], 'move');
    const second = appendCommand(first.belt, 'turn-left');
    expect(second).toEqual({ belt: ['move', 'turn-left'], changed: true });
  });

  it('does not append past the belt capacity', () => {
    const full: Command[] = Array.from({ length: BELT_SLOTS }, () => 'move');
    const edit = appendCommand(full, 'grab');
    expect(edit).toEqual({ belt: full, changed: false });
    expect(edit.belt).toBe(full);
  });

  it('removes a tapped command and shifts the tail left', () => {
    expect(removeCommandAt(['move', 'turn-left', 'grab'], 1)).toEqual({
      belt: ['move', 'grab'],
      changed: true,
    });
    expect(removeCommandAt(['move'], 4)).toEqual({ belt: ['move'], changed: false });
  });

  it('supports Undo and Clear without mutating the input', () => {
    const belt: Command[] = ['move', 'grab'];
    expect(removeLastCommand(belt)).toEqual({ belt: ['move'], changed: true });
    expect(clearBelt()).toEqual([]);
    expect(belt).toEqual(['move', 'grab']);
    expect(removeLastCommand([])).toEqual({ belt: [], changed: false });
  });
});
