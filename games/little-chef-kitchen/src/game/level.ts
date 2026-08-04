export type Family = "pizza" | "pancakes" | "ice-cream";
export type Fruit = "strawberry" | "banana" | "blueberry";
export type Syrup = "maple" | "chocolate" | "berry";
export type Flavour = "strawberry" | "chocolate" | "mint";
export type PizzaTopping = "cheese" | "mushroom" | "pepper";
export type IceCreamTopping = "sprinkles" | "berries" | "wafer";
export type Topping = PizzaTopping | IceCreamTopping;
export type Vessel = "cone" | "bowl";
export type ItemKind = "dough" | "tomato" | PizzaTopping | "sauced-base" | "pizza" | "flour" | "milk" | Fruit | Syrup | "batter" | "stack" | "pancakes" | "cream" | Flavour | Vessel | "mix" | "scoop" | IceCreamTopping | "ice-cream";
export interface Item { readonly kind: ItemKind; readonly label: string; readonly extras?: readonly string[]; }
export interface PizzaOrder { readonly family: "pizza"; readonly toppings: readonly PizzaTopping[]; }
export interface PancakeOrder { readonly family: "pancakes"; readonly fruit: Fruit; readonly syrup: Syrup; }
export interface IceCreamOrder { readonly family: "ice-cream"; readonly flavour: Flavour; readonly vessel: Vessel; readonly topping: IceCreamTopping; }
export type CustomerOrder = PizzaOrder | PancakeOrder | IceCreamOrder;
export type RecipePhase = "building" | "serving" | "served";
export type Station = "prep" | "oven" | "pan" | "freezer";
export interface KitchenState { readonly order: CustomerOrder; readonly tray: readonly Item[]; readonly prep: Item | null; readonly phase: RecipePhase; readonly served: boolean; readonly round: number; }
const labels: Record<ItemKind, string> = { dough:"DOUGH", tomato:"TOMATO", cheese:"CHEESE", mushroom:"MUSHROOM", pepper:"PEPPER", "sauced-base":"SAUCED BASE", pizza:"PIZZA", flour:"FLOUR", milk:"MILK", strawberry:"STRAWBERRY", banana:"BANANA", blueberry:"BLUEBERRY", maple:"MAPLE SYRUP", chocolate:"CHOCOLATE", berry:"BERRY SYRUP", batter:"BATTER", stack:"PANCAKE STACK", pancakes:"PANCAKES", cream:"CREAM", mint:"MINT", cone:"CONE", bowl:"BOWL", mix:"ICE CREAM MIX", scoop:"SCOOP", sprinkles:"SPRINKLES", berries:"BERRIES", wafer:"WAFER", "ice-cream":"ICE CREAM" };
export const item = (kind: ItemKind, extras: readonly string[] = []): Item => ({ kind, label: extras.length ? `${labels[kind]} + ${extras.join(" + ").toUpperCase()}` : labels[kind], extras });
function hash(seed: number, n: number) { let x = (seed ^ Math.imul(n, 0x9e3779b9)) >>> 0; x ^= x >>> 16; x = Math.imul(x, 0x45d9f3b) >>> 0; x ^= x >>> 16; return x >>> 0; }
function pick<T>(values: readonly T[], seed: number, n: number) { return values[hash(seed, n) % values.length]!; }
function shuffled<T>(values: readonly T[], seed: number, salt: number): T[] { const result = [...values]; for (let i = result.length - 1; i > 0; i--) { const j = hash(seed, salt * 17 + i) % (i + 1); [result[i], result[j]] = [result[j]!, result[i]!]; } return result; }
export function generateOrder(seed: number, round: number): CustomerOrder {
  const family = shuffled(["pizza", "pancakes", "ice-cream"] as const, seed, Math.floor(round / 3))[round % 3]!;
  if (family === "pizza") { const choices = ["cheese", "mushroom", "pepper"] as const; const first = pick(choices, seed, round * 5 + 1); const second = choices[(choices.indexOf(first) + 1 + hash(seed, round * 5 + 2) % 2) % choices.length]!; return { family, toppings: [first, second] }; }
  if (family === "pancakes") return { family, fruit: pick(["strawberry", "banana", "blueberry"], seed, round * 5 + 3), syrup: pick(["maple", "chocolate", "berry"], seed, round * 5 + 4) };
  return { family, flavour: pick(["strawberry", "chocolate", "mint"], seed, round * 5 + 5), vessel: pick(["cone", "bowl"], seed, round * 5 + 6), topping: pick(["sprinkles", "berries", "wafer"], seed, round * 5 + 7) };
}
export function orderTitle(order: CustomerOrder) { return order.family === "pizza" ? `PIZZA · ${order.toppings.join(" + ").toUpperCase()}` : order.family === "pancakes" ? `PANCAKES · ${order.fruit.toUpperCase()} · ${order.syrup.toUpperCase()}` : `ICE CREAM · ${order.flavour.toUpperCase()} · ${order.vessel.toUpperCase()}`; }
export function startingItems(order: CustomerOrder, seed = 0, round = 0): Item[] {
  const cards = order.family === "pizza" ? [item("dough"), item("tomato"), ...order.toppings.map((kind) => item(kind))] : order.family === "pancakes" ? [item("flour"), item("milk"), item(order.fruit), item(order.syrup)] : [item("cream"), item(order.flavour), item(order.vessel), item(order.topping)];
  return shuffled(cards, seed, round + 101);
}
