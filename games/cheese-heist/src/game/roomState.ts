import type { RoomLevel, StationId } from './puzzleTypes';
import { ROOM_STATIONS } from './puzzleTypes';

export interface RoomState {
  readonly level: RoomLevel;
  readonly solved: Readonly<Record<StationId, boolean>>;
}

/** A fresh room with every station unsolved. */
export function createRoomState(level: RoomLevel): RoomState {
  const solved = {} as Record<StationId, boolean>;
  for (const station of ROOM_STATIONS[level]) solved[station] = false;
  return { level, solved };
}

/** Marks a station solved; returns the same state when it was already solved. */
export function solveRoomStation(state: RoomState, station: StationId): RoomState {
  if (!ROOM_STATIONS[state.level].includes(station)) {
    throw new Error(`Station ${station} does not belong to ${state.level}`);
  }
  if (state.solved[station]) return state;
  return { ...state, solved: { ...state.solved, [station]: true } };
}

export function roomSolvedCount(state: RoomState): number {
  return ROOM_STATIONS[state.level].filter((station) => state.solved[station]).length;
}

export function roomComplete(state: RoomState): boolean {
  return roomSolvedCount(state) === ROOM_STATIONS[state.level].length;
}
