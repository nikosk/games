export type PieceKind = "straight";
export interface Point { readonly x: number; readonly y: number; }
export interface KitchenLevel {
  readonly id: 1;
  readonly title: "Toast for Tilly";
  readonly customer: "Tilly";
  readonly pieceKinds: readonly [PieceKind, PieceKind];
  readonly socketKinds: readonly [PieceKind, PieceKind];
  readonly path: readonly Point[];
}
export const LEVEL: KitchenLevel = {
  id: 1,
  title: "Toast for Tilly",
  customer: "Tilly",
  pieceKinds: ["straight", "straight"],
  socketKinds: ["straight", "straight"],
  path: [
    { x: 0.14, y: 0.52 },
    { x: 0.39, y: 0.52 },
    { x: 0.61, y: 0.52 },
    { x: 0.86, y: 0.52 },
  ],
};
