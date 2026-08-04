import { generateOrder, item, startingItems, type CustomerOrder, type Item, type KitchenState, type Station } from "./level";
export function freshKitchen(seed = 17, round = 0): KitchenState { const order = generateOrder(seed, round); return { order, tray: startingItems(order, seed, round), prep: null, phase: "building", served: false, round }; }
const remove = (tray: readonly Item[], index: number) => tray.slice(0, index).concat(tray.slice(index + 1));
const has = (values: readonly string[] | undefined, value: string) => values?.includes(value) ?? false;
const sameContents = (actual: readonly string[] | undefined, expected: readonly string[]) => { const a = [...(actual ?? [])].sort(); const b = [...expected].sort(); return a.length === b.length && a.every((value, index) => value === b[index]); };
function rawOutput(a: Item, b: Item, order: CustomerOrder): Item | null {
  if (order.family === "pizza" && ((a.kind === "dough" && b.kind === "tomato") || (a.kind === "tomato" && b.kind === "dough"))) return item("sauced-base");
  if (order.family === "pancakes" && ((a.kind === "flour" && b.kind === "milk") || (a.kind === "milk" && b.kind === "flour"))) return item("batter");
  if (order.family === "ice-cream" && ((a.kind === "cream" && b.kind === order.flavour) || (b.kind === "cream" && a.kind === order.flavour))) return item("mix");
  return null;
}
function prepOutput(holding: Item, card: Item, order: CustomerOrder): Item | null {
  const raw = rawOutput(holding, card, order);
  if (raw) return raw;
  if (order.family === "pizza") {
    const base = holding.kind === "sauced-base" ? holding : card.kind === "sauced-base" ? card : null;
    const topping = base === holding ? card.kind : holding.kind;
    if (!base || !order.toppings.includes(topping as typeof order.toppings[number]) || has(base.extras, topping)) return null;
    const extras = [...(base.extras ?? []), topping];
    // Toppings are still raw until the oven; only the oven creates a final pizza.
    return item("sauced-base", extras);
  }
  if (order.family === "pancakes") {
    const stack = holding.kind === "stack" ? holding : card.kind === "stack" ? card : null;
    const addition = stack === holding ? card.kind : holding.kind;
    if (!stack || (addition !== order.fruit && addition !== order.syrup) || has(stack.extras, addition)) return null;
    const extras = [...(stack.extras ?? []), addition];
    return item(extras.length === 2 ? "pancakes" : "stack", extras);
  }
  const scoop = holding.kind === "scoop" ? holding : card.kind === "scoop" ? card : null;
  const addition = scoop === holding ? card.kind : holding.kind;
  if (!scoop || (addition !== order.vessel && addition !== order.topping) || has(scoop.extras, addition)) return null;
  const extras = [...(scoop.extras ?? []), addition];
  return item(extras.length === 3 ? "ice-cream" : "scoop", extras);
}
function processor(input: Item, station: Station, order: CustomerOrder): Item | null {
  if (order.family === "pizza") return station === "oven" && input.kind === "sauced-base" && sameContents(input.extras, order.toppings) ? item("pizza", input.extras) : null;
  if (order.family === "pancakes") return station === "pan" && input.kind === "batter" ? item("stack") : null;
  return station === "freezer" && input.kind === "mix" ? item("scoop", [order.flavour]) : null;
}
export type ActionResult = "held" | "transformed" | "rejected" | "served";
export function cancelPrep(state: KitchenState): KitchenState { return state.prep ? { ...state, tray: [...state.tray, state.prep], prep: null } : state; }
export function useCard(state: KitchenState, index: number, station: Station): { state: KitchenState; result: ActionResult } {
  if (state.phase !== "building" || index < 0 || index >= state.tray.length) return { state, result: "rejected" };
  const card = state.tray[index]!;
  if (station === "prep") {
    if (!state.prep) return { state: { ...state, tray: remove(state.tray, index), prep: card }, result: "held" };
    const made = prepOutput(state.prep, card, state.order);
    if (!made) return { state: { ...state, tray: [...state.tray, state.prep], prep: null }, result: "rejected" };
    return { state: { ...state, tray: [...remove(state.tray, index), made], prep: null }, result: "transformed" };
  }
  const made = processor(card, station, state.order);
  if (!made) return { state, result: "rejected" };
  return { state: { ...state, tray: [...remove(state.tray, index), made] }, result: "transformed" };
}
function exactFinal(card: Item, order: CustomerOrder): boolean {
  if (order.family === "pizza") return card.kind === "pizza" && sameContents(card.extras, order.toppings);
  if (order.family === "pancakes") return card.kind === "pancakes" && sameContents(card.extras, [order.fruit, order.syrup]);
  return card.kind === "ice-cream" && sameContents(card.extras, [order.flavour, order.vessel, order.topping]);
}
export function serve(state: KitchenState, index: number): { state: KitchenState; result: ActionResult } {
  if (state.phase !== "building" || index < 0 || index >= state.tray.length || !exactFinal(state.tray[index]!, state.order)) return { state, result: "rejected" };
  return { state: { ...state, tray: remove(state.tray, index), phase: "served", served: true }, result: "served" };
}
export function completeByFamily(order: CustomerOrder): KitchenState {
  let state: KitchenState = { order, tray: startingItems(order), prep: null, phase: "building", served: false, round: 0 };
  const find = (predicate: (card: Item) => boolean) => state.tray.findIndex(predicate);
  const prepPair = (first: (card: Item) => boolean, second: (card: Item) => boolean) => { state = useCard(state, find(first), "prep").state; state = useCard(state, find(second), "prep").state; };
  if (order.family === "pizza") { prepPair(c => c.kind === "dough", c => c.kind === "tomato"); for (const topping of order.toppings) prepPair(c => c.kind === "sauced-base", c => c.kind === topping); state = useCard(state, find(c => c.kind === "sauced-base"), "oven").state; }
  else if (order.family === "pancakes") { prepPair(c => c.kind === "flour", c => c.kind === "milk"); state = useCard(state, find(c => c.kind === "batter"), "pan").state; prepPair(c => c.kind === "stack", c => c.kind === order.fruit); prepPair(c => c.kind === "stack", c => c.kind === order.syrup); }
  else { prepPair(c => c.kind === "cream", c => c.kind === order.flavour); state = useCard(state, find(c => c.kind === "mix"), "freezer").state; prepPair(c => c.kind === "scoop", c => c.kind === order.vessel); prepPair(c => c.kind === "scoop", c => c.kind === order.topping); }
  return state;
}
