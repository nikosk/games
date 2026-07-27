import type { Command } from './rules';

export interface CommandMeta {
  readonly key: Command;
  readonly label: string;
  readonly hint: string;
  readonly color: number;
  readonly accent: number;
}

/**
 * Command palette metadata. `hint` is the short keyboard hint shown on the
 * command card; `color`/`accent` drive the card fill and outline.
 *
 * Grab is the contextual pick-up / drop action, hence the paired label.
 */
export const COMMANDS: readonly CommandMeta[] = [
  { key: 'move', label: 'FORWARD', hint: 'W', color: 0x6bbf67, accent: 0x4f9e4f },
  { key: 'turn-left', label: 'TURN LEFT', hint: 'A', color: 0x5aa9e6, accent: 0x3f7fb5 },
  { key: 'turn-right', label: 'TURN RIGHT', hint: 'D', color: 0x5aa9e6, accent: 0x3f7fb5 },
  { key: 'grab', label: 'GRAB / DROP', hint: 'G', color: 0xf5c542, accent: 0xd9a52e },
];

export function commandMeta(command: Command): CommandMeta {
  return COMMANDS.find((c) => c.key === command) ?? COMMANDS[0]!;
}