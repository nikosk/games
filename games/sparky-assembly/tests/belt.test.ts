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

  it('does not append past the default belt capacity', () => {
    const full: Command[] = Array.from({ length: BELT_SLOTS }, () => 'move');
    const edit = appendCommand(full, 'grab');
    expect(edit).toEqual({ belt: full, changed: false });
    expect(edit.belt).toBe(full);
  });

  it('accepts a custom capacity larger than the default', () => {
    const nine: Command[] = Array.from({ length: 9 }, () => 'move');
    const edit = appendCommand(nine, 'grab', 10);
    expect(edit.changed).toBe(true);
    expect(edit.belt).toEqual([...nine, 'grab']);
  });

  it('caps at the custom capacity', () => {
    const full: Command[] = Array.from({ length: 10 }, () => 'move');
    const edit = appendCommand(full, 'grab', 10);
    expect(edit).toEqual({ belt: full, changed: false });
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
