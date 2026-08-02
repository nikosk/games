import type { Command } from './rules';
import { BELT_SLOTS } from './level';

export interface BeltEdit {
  readonly belt: readonly Command[];
  readonly changed: boolean;
}

/** Append a command to the next free belt slot if there is room. */
export function appendCommand(
  belt: readonly Command[],
  command: Command,
  slots: number = BELT_SLOTS,
): BeltEdit {
  if (belt.length >= slots) return { belt, changed: false };
  return { belt: [...belt, command], changed: true };
}

/** Remove the command at `index` and shift later commands left. */
export function removeCommandAt(belt: readonly Command[], index: number): BeltEdit {
  if (index < 0 || index >= belt.length) return { belt, changed: false };
  const next = belt.slice();
  next.splice(index, 1);
  return { belt: next, changed: true };
}

/** Remove the last command (Undo). */
export function removeLastCommand(belt: readonly Command[]): BeltEdit {
  if (belt.length === 0) return { belt, changed: false };
  return { belt: belt.slice(0, -1), changed: true };
}

/** Clear the whole belt (Clear). */
export function clearBelt(): readonly Command[] {
  return [];
}
