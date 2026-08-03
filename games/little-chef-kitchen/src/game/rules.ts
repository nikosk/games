import type { CardKind, KitchenLevel, RecipePhase } from "./level";

export const SOCKET = { bread: 0, toaster: 1, tomato: 2, board: 3, cheese: 4 } as const;
export const PLATE = "plate" as const;
export type SocketIndex = 0 | 1 | 2 | 3 | 4;
export type Endpoint = SocketIndex | typeof PLATE;
export const RECIPE_CONNECTIONS: readonly (readonly [SocketIndex, SocketIndex | typeof PLATE])[] = [
  [SOCKET.bread, SOCKET.toaster], [SOCKET.toaster, PLATE],
  [SOCKET.tomato, SOCKET.board], [SOCKET.board, PLATE], [SOCKET.cheese, PLATE],
];

export interface KitchenState { readonly placements: readonly (CardKind | null)[]; readonly tray: readonly CardKind[]; readonly phase: RecipePhase; readonly served: boolean; }
export type DropResult = "placed" | "rejected" | "already-filled";

export function freshKitchen(level: KitchenLevel): KitchenState { return { placements: level.sockets.map(() => null), tray: [...level.cards], phase: "building", served: false }; }
export function placeCard(state: KitchenState, level: KitchenLevel, cardIndex: number, socket: number): { state: KitchenState; result: DropResult } {
  if (state.phase !== "building" || socket < 0 || socket >= level.sockets.length || state.placements[socket] !== null) return { state, result: "already-filled" };
  const card = state.tray[cardIndex];
  if (!card || card !== level.sockets[socket]?.accepts) return { state, result: "rejected" };
  const tray = state.tray.slice(); tray.splice(cardIndex, 1);
  const placements = state.placements.slice(); placements[socket] = card;
  return { state: { placements, tray, phase: "building", served: false }, result: "placed" };
}
export function readyToCook(state: KitchenState): boolean { return state.phase === "building" && state.tray.length === 0 && state.placements.every(Boolean); }
export function beginCooking(state: KitchenState): KitchenState { return readyToCook(state) ? { ...state, phase: "cooking" } : state; }
export function finishCooking(state: KitchenState): KitchenState { return state.phase === "cooking" ? { ...state, phase: "serving" } : state; }
export function readyToServe(state: KitchenState): boolean { return state.phase === "serving"; }
export function serve(state: KitchenState): KitchenState { return readyToServe(state) ? { ...state, phase: "served", served: true } : state; }

/** Connection readiness is deliberately socket-based: card placement order never matters. */
export function connectionReady(state: KitchenState, from: SocketIndex, to: Endpoint): boolean {
  if (!RECIPE_CONNECTIONS.some(([a, b]) => a === from && b === to)) return false;
  if (to === PLATE) {
    const branch = from === SOCKET.toaster ? [SOCKET.bread, SOCKET.toaster] : from === SOCKET.board ? [SOCKET.tomato, SOCKET.board] : [SOCKET.cheese];
    return branch.every((socket) => Boolean(state.placements[socket]));
  }
  return Boolean(state.placements[from]) && Boolean(state.placements[to]);
}
export function resetKitchen(level: KitchenLevel): KitchenState { return freshKitchen(level); }
