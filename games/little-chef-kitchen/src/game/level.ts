export type CardKind = "bread" | "tomato" | "cheese" | "toaster" | "board";
export type SocketKind = CardKind;
export type RecipePhase = "building" | "cooking" | "serving" | "served";
export interface RecipeSocket { readonly id: SocketKind; readonly label: string; readonly accepts: CardKind; }
export interface KitchenLevel { readonly id: 1; readonly title: "Tilly's Tomato-Cheese Toast"; readonly customer: "Tilly"; readonly cards: readonly CardKind[]; readonly sockets: readonly RecipeSocket[]; }
export const LEVEL: KitchenLevel = { id: 1, title: "Tilly's Tomato-Cheese Toast", customer: "Tilly", cards: ["bread", "tomato", "cheese", "toaster", "board"], sockets: [
 { id:"bread", label:"Bread", accepts:"bread" }, { id:"toaster", label:"Toaster", accepts:"toaster" }, { id:"tomato", label:"Tomato", accepts:"tomato" }, { id:"board", label:"Cutting board", accepts:"board" }, { id:"cheese", label:"Cheese", accepts:"cheese" }
]};
