import { type Direction, DIRECTION_VECTORS, turnLeft, turnRight } from './direction';

export type Command = 'move' | 'turn-left' | 'turn-right' | 'grab';
export type StepResult = 'ok' | 'blocked' | 'no-crate';

export interface Robot {
  readonly x: number;
  readonly y: number;
  readonly direction: Direction;
}

export interface FloorState {
  readonly robot: Robot;
  readonly crate: { readonly x: number; readonly y: number };
  readonly holding: boolean;
}

export interface StepOutcome {
  readonly state: FloorState;
  readonly result: StepResult;
}

/**
 * Execute one command deterministically.
 *
 * `move` advances the robot one cell in its facing direction; when it is
 * carrying the crate, the crate rides along with it. Walking off the floor is
 * a clean `blocked` no-op.
 *
 * `grab` is a contextual toggle: while not holding it picks up a crate at the
 * robot's cell, and while holding it drops the crate where the robot stands.
 */
export function executeStep(
  state: FloorState,
  command: Command,
  cols: number,
  rows: number,
): StepOutcome {
  const { robot, crate, holding } = state;

  switch (command) {
    case 'move': {
      const next = facingCell(robot, cols, rows);
      if (next === null) return { state, result: 'blocked' };
      const movedRobot: Robot = { x: next.x, y: next.y, direction: robot.direction };
      return {
        state: {
          robot: movedRobot,
          crate: holding ? { x: next.x, y: next.y } : crate,
          holding,
        },
        result: 'ok',
      };
    }
    case 'turn-left':
      return {
        state: { ...state, robot: { ...robot, direction: turnLeft(robot.direction) } },
        result: 'ok',
      };
    case 'turn-right':
      return {
        state: { ...state, robot: { ...robot, direction: turnRight(robot.direction) } },
        result: 'ok',
      };
    case 'grab': {
      if (holding) return { state: { ...state, holding: false }, result: 'ok' };
      if (robot.x === crate.x && robot.y === crate.y) {
        return { state: { ...state, holding: true }, result: 'ok' };
      }
      return { state, result: 'no-crate' };
    }
  }
}

export function isSolved(state: FloorState, goal: { x: number; y: number }): boolean {
  return !state.holding && state.crate.x === goal.x && state.crate.y === goal.y;
}

export function facingCell(
  robot: { x: number; y: number; direction: Direction },
  cols: number,
  rows: number,
): { x: number; y: number } | null {
  const v = DIRECTION_VECTORS[robot.direction];
  const nx = robot.x + v.x;
  const ny = robot.y + v.y;
  if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) return null;
  return { x: nx, y: ny };
}