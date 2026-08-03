import type { KitchenLevel, PieceKind } from "./level";
export interface KitchenState {
  readonly placements: readonly (PieceKind | null)[];
  readonly tray: readonly PieceKind[];
  readonly complete: boolean;
}
export type KitchenPhase = "editing" | "running" | "finished";
export interface RunState { readonly phase: KitchenPhase; }
export type DropResult = "placed" | "rejected" | "already-filled";
export function freshKitchen(level: KitchenLevel): KitchenState {
  return { placements: level.socketKinds.map(() => null), tray: [...level.pieceKinds], complete: false };
}
export function freshRun(): RunState {
  return { phase: "editing" };
}
export function beginRun(state: RunState): RunState {
  return { ...state, phase: "running" };
}
export function finishRun(state: RunState): RunState {
  return { ...state, phase: "finished" };
}
export function placementsReady(state: KitchenState): boolean {
  return state.placements.every((piece) => piece !== null);
}
export function placePiece(state: KitchenState, level: KitchenLevel, trayIndex: number, socket: number) {
  if (socket < 0 || socket >= state.placements.length) return { state, result: "rejected" as const };
  if (state.placements[socket] !== null) return { state, result: "already-filled" as const };
  const kind = state.tray[trayIndex];
  if (kind === undefined || level.socketKinds[socket] !== kind) return { state, result: "rejected" as const };
  const tray = state.tray.slice(); tray.splice(trayIndex, 1);
  const placements = state.placements.slice(); placements[socket] = kind;
  return { state: { placements, tray, complete: false }, result: "placed" as const };
}
export function removePiece(state: KitchenState, socket: number) {
  const kind = state.placements[socket]; if (!kind) return state;
  const placements = state.placements.slice(); placements[socket] = null;
  return { placements, tray: [...state.tray, kind], complete: false };
}
export function nextMatchingSocket(state: KitchenState, level: KitchenLevel, trayIndex = 0) {
  const kind = state.tray[trayIndex];
  return kind === undefined ? -1 : level.socketKinds.findIndex((socketKind, index) => state.placements[index] === null && socketKind === kind);
}
