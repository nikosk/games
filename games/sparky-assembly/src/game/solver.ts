import { initialState, type SparkyLevel } from './level';
import { executeStep, isSolved, type Command, type FloorState } from './rules';

/** Fixed neighbour order keeps BFS deterministic: results depend only on the level. */
export const SOLVER_COMMAND_ORDER: readonly Command[] = ['turn-left', 'turn-right', 'move', 'grab'];

/**
 * Shortest command program (breadth-first search over real rule states) that
 * solves the level, or null when no program of length <= maxDepth exists.
 * `maxDepth` defaults to the level's belt capacity, so "fits on the belt" is
 * exactly what is checked. Non-`ok` steps never change the state, so they are
 * skipped safely.
 */
export function solveLevel(level: SparkyLevel, maxDepth: number = level.beltSlots): readonly Command[] | null {
  const start = initialState(level);
  if (isSolved(start, level)) return [];

  const queue: Array<{ state: FloorState; program: readonly Command[] }> = [{ state: start, program: [] }];
  const seen = new Set<string>([stateKey(start)]);
  let head = 0;

  while (head < queue.length) {
    const { state, program } = queue[head]!;
    head += 1;
    if (program.length >= maxDepth) continue;
    for (const command of SOLVER_COMMAND_ORDER) {
      const outcome = executeStep(state, command, level);
      if (outcome.result !== 'ok') continue;
      const nextProgram = [...program, command];
      if (isSolved(outcome.state, level)) return nextProgram;
      const key = stateKey(outcome.state);
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({ state: outcome.state, program: nextProgram });
    }
  }
  return null;
}

function stateKey(state: FloorState): string {
  const cargo = state.cargo.map((c) => `${c.id}:${c.x},${c.y}`).join(';');
  return `${state.robot.x},${state.robot.y},${state.robot.direction},${state.heldId ?? '-'},${cargo}`;
}
