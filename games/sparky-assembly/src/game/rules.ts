import { type Direction, DIRECTION_VECTORS, turnLeft, turnRight } from './direction';

export type Command = 'move' | 'turn-left' | 'turn-right' | 'grab';

/**
 * Result of executing one command.
 * `wrong-dock` means a drop was refused because the dock's type does not match
 * the carried cargo; the cargo stays held.
 */
export type StepResult = 'ok' | 'blocked' | 'no-crate' | 'wrong-dock';

/** The three factory cargo types. */
export type CargoType = 'gear' | 'battery' | 'circuit';

export interface Cell {
  readonly x: number;
  readonly y: number;
}

export interface Robot {
  readonly x: number;
  readonly y: number;
  readonly direction: Direction;
}

/** One movable cargo item. `id` matches the delivery that owns it. */
export interface Cargo {
  readonly id: string;
  readonly type: CargoType;
  readonly x: number;
  readonly y: number;
}

/** A delivery contract: pick the cargo up at `pickup` and drop it on `dock`. */
export interface Delivery {
  readonly id: string;
  readonly type: CargoType;
  readonly pickup: Cell;
  readonly dock: Cell;
}

export interface FloorState {
  readonly robot: Robot;
  readonly cargo: readonly Cargo[];
  /** Id of the carried cargo, or null when the robot carries nothing. */
  readonly heldId: string | null;
}

/** Everything `executeStep` needs to know about the factory floor. A SparkyLevel satisfies this. */
export interface Board {
  readonly cols: number;
  readonly rows: number;
  readonly walls: readonly Cell[];
  readonly deliveries: readonly Delivery[];
}

export interface StepOutcome {
  readonly state: FloorState;
  readonly result: StepResult;
}

/**
 * Execute one command deterministically.
 *
 * `move` advances the robot one cell in its facing direction; the carried
 * cargo rides along. Walking off the floor or into a wall is a clean
 * `blocked` no-op.
 *
 * `grab` is a contextual pick-up / drop:
 * - while not holding it picks up the first undelivered cargo at the robot's
 *   cell (`no-crate` when there is none);
 * - while holding, dropping on a dock of the matching type delivers the cargo
 *   (it locks there and can never be picked up again), dropping on a dock of
 *   another type is refused with `wrong-dock`, dropping on a cell occupied by
 *   another cargo is refused with `blocked`, and any other cell is an
 *   ordinary drop.
 */
export function executeStep(state: FloorState, command: Command, board: Board): StepOutcome {
  const { robot, cargo, heldId } = state;

  switch (command) {
    case 'move': {
      const next = facingCell(robot, board);
      if (next === null) return { state, result: 'blocked' };
      const movedRobot: Robot = { x: next.x, y: next.y, direction: robot.direction };
      const movedCargo = heldId === null
        ? cargo
        : cargo.map((item) => (item.id === heldId ? { ...item, x: next.x, y: next.y } : item));
      return { state: { robot: movedRobot, cargo: movedCargo, heldId }, result: 'ok' };
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
    case 'grab':
      return grabStep(state, board);
  }
}

function grabStep(state: FloorState, board: Board): StepOutcome {
  const { robot, cargo, heldId } = state;

  if (heldId !== null) {
    const held = cargo.find((item) => item.id === heldId)!;
    const dock = board.deliveries.find((d) => d.dock.x === robot.x && d.dock.y === robot.y);

    if (dock !== undefined) {
      if (dock.type !== held.type) return { state, result: 'wrong-dock' };
      if (cargo.some((item) => item.id !== heldId && item.x === robot.x && item.y === robot.y)) {
        return { state, result: 'blocked' };
      }
      // Deliver: the cargo stays on the dock and locks there.
      return { state: { ...state, heldId: null }, result: 'ok' };
    }

    if (cargo.some((item) => item.id !== heldId && item.x === robot.x && item.y === robot.y)) {
      return { state, result: 'blocked' };
    }
    return { state: { ...state, heldId: null }, result: 'ok' };
  }

  const pickup = cargo.find(
    (item) => !isDelivered(item, board) && item.x === robot.x && item.y === robot.y,
  );
  if (pickup === undefined) return { state, result: 'no-crate' };
  return { state: { ...state, heldId: pickup.id }, result: 'ok' };
}

/** A cargo is delivered once it rests on a dock of its own type. Delivered cargo cannot be picked up again. */
export function isDelivered(cargo: Cargo, board: Board): boolean {
  return board.deliveries.some(
    (d) => d.type === cargo.type && d.dock.x === cargo.x && d.dock.y === cargo.y,
  );
}

/** The level is solved when nothing is held and every dock holds a cargo of its type. */
export function isSolved(state: FloorState, level: { readonly deliveries: readonly Delivery[] }): boolean {
  if (state.heldId !== null) return false;
  return level.deliveries.every((d) =>
    state.cargo.some((c) => c.type === d.type && c.x === d.dock.x && c.y === d.dock.y),
  );
}

export function facingCell(robot: Robot, board: Board): Cell | null {
  const v = DIRECTION_VECTORS[robot.direction];
  const nx = robot.x + v.x;
  const ny = robot.y + v.y;
  if (nx < 0 || ny < 0 || nx >= board.cols || ny >= board.rows) return null;
  if (board.walls.some((w) => w.x === nx && w.y === ny)) return null;
  return { x: nx, y: ny };
}
