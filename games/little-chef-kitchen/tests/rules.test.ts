import { describe, expect, it } from "vitest";
import { generateOrder, item, startingItems, type CustomerOrder, type Item, type KitchenState } from "../src/game/level";
import { cancelPrep, completeByFamily, freshKitchen, serve, useCard } from "../src/game/rules";

const kinds = (cards: readonly Item[]) => cards.map(card => card.kind).sort();
const take = (state: ReturnType<typeof freshKitchen>, kind: string, station: "prep" | "oven" | "pan" | "freezer") => useCard(state, state.tray.findIndex(card => card.kind === kind), station);
function make(order: CustomerOrder, seed = 3): KitchenState { return { order, tray: startingItems(order, seed, 4), prep: null, phase: "building", served: false, round: 4 }; }
function pair(state: KitchenState, first: string, second: string) { state = useCard(state, state.tray.findIndex(card => card.kind === first), "prep").state; return useCard(state, state.tray.findIndex(card => card.kind === second), "prep").state; }

describe("order generation", () => {
  it("is deterministic and shuffles each complete family bag", () => {
    for (let seed = 0; seed < 100; seed++) for (let round = 0; round < 300; round++) expect(generateOrder(seed, round)).toEqual(generateOrder(seed, round));
    for (let seed = 0; seed < 30; seed++) for (let bag = 0; bag < 100; bag++) expect(new Set([0, 1, 2].map(offset => generateOrder(seed, bag * 3 + offset).family)).size).toBe(3);
    const orders = new Set(Array.from({ length: 30 }, (_, seed) => [0, 1, 2].map(round => generateOrder(seed, round).family).join(",")));
    expect(orders.size).toBeGreaterThan(1);
  });
  it("covers variants and gives stable, shuffled starting trays", () => {
    const variants = new Set(Array.from({ length: 500 }, (_, n) => JSON.stringify(generateOrder(n, n))));
    expect(variants.size).toBeGreaterThan(20);
    for (let seed = 0; seed < 100; seed++) for (let round = 0; round < 30; round++) {
      const order = generateOrder(seed, round);
      expect(startingItems(order, seed, round)).toEqual(startingItems(order, seed, round));
      expect(kinds(startingItems(order, seed, round))).toEqual(kinds(startingItems(order)));
    }
    expect(startingItems(generateOrder(8, 0), 8, 0)).not.toEqual(startingItems(generateOrder(8, 0)));
  });
});

describe("prep and processors", () => {
  it("accepts every raw and processed pair in either order", () => {
    const orders: CustomerOrder[] = [
      { family: "pizza", toppings: ["cheese", "pepper"] },
      { family: "pancakes", fruit: "banana", syrup: "maple" },
      { family: "ice-cream", flavour: "mint", vessel: "bowl", topping: "wafer" },
    ];
    for (const order of orders) {
      for (const reverse of [false, true]) {
        let state = make(order);
        state = reverse ? pair(state, order.family === "pizza" ? "tomato" : order.family === "pancakes" ? "milk" : order.flavour, order.family === "pizza" ? "dough" : order.family === "pancakes" ? "flour" : "cream") : pair(state, order.family === "pizza" ? "dough" : order.family === "pancakes" ? "flour" : "cream", order.family === "pizza" ? "tomato" : order.family === "pancakes" ? "milk" : order.flavour);
        if (order.family === "pizza") { for (const topping of order.toppings) state = pair(state, reverse ? topping : "sauced-base", reverse ? "sauced-base" : topping); state = take(state, "sauced-base", "oven").state; }
        if (order.family === "pancakes") { state = take(state, "batter", "pan").state; state = pair(state, reverse ? "banana" : "stack", reverse ? "stack" : "banana"); state = pair(state, reverse ? "maple" : "stack", reverse ? "stack" : "maple"); }
        if (order.family === "ice-cream") { state = take(state, "mix", "freezer").state; state = pair(state, reverse ? "bowl" : "scoop", reverse ? "scoop" : "bowl"); state = pair(state, reverse ? "wafer" : "scoop", reverse ? "scoop" : "wafer"); }
        expect(state.tray.some(card => card.kind === (order.family === "pizza" ? "pizza" : order.family === "pancakes" ? "pancakes" : "ice-cream"))).toBe(true);
      }
    }
  });
  it("recovers an invalid second prep card without consuming anything", () => {
    const state = make({ family: "pizza", toppings: ["cheese", "pepper"] }); const heldIndex = state.tray.findIndex(card => card.kind === "dough"); const held = state.tray[heldIndex]!; const before = kinds(state.tray);
    const after = useCard(useCard(state, heldIndex, "prep").state, state.tray.findIndex(card => card.kind === "pepper"), "prep").state;
    expect(after.prep).toBeNull(); expect(kinds(after.tray)).toEqual(before); expect(after.tray).toContain(held);
    const heldState = useCard(state, heldIndex, "prep").state; expect(cancelPrep(heldState).prep).toBeNull(); expect(kinds(cancelPrep(heldState).tray)).toEqual(before);
  });
  it("does not mutate state for wrong processors", () => {
    for (let round = 0; round < 3; round++) { const state = freshKitchen(12, round); const before = JSON.stringify(state); expect(useCard(state, 0, round === 0 ? "pan" : "oven").result).toBe("rejected"); expect(JSON.stringify(state)).toBe(before); }
  });
});

describe("serving and solvability", () => {
  it("keeps a fully topped pizza raw until the oven", () => {
    const order = { family: "pizza" as const, toppings: ["cheese", "pepper"] as const };
    let state = pair(make(order), "dough", "tomato");
    state = pair(state, "sauced-base", "cheese");
    state = pair(state, "sauced-base", "pepper");
    const rawIndex = state.tray.findIndex(card => card.kind === "sauced-base");
    expect(rawIndex).toBeGreaterThanOrEqual(0);
    expect(serve(state, rawIndex).result).toBe("rejected");
    const baked = useCard(state, rawIndex, "oven");
    expect(baked.result).toBe("transformed");
    const bakedIndex = baked.state.tray.findIndex(card => card.kind === "pizza");
    expect(serve(baked.state, bakedIndex).result).toBe("served");
  });
  it("requires exact generated contents", () => {
    const state = completeByFamily({ family: "pizza", toppings: ["cheese", "pepper"] }); const index = state.tray.findIndex(card => card.kind === "pizza");
    expect(serve({ ...state, tray: state.tray.map((card, i) => i === index ? item("pizza", ["cheese", "mushroom"]) : card) }, index).result).toBe("rejected");
    expect(serve(state, index).result).toBe("served");
  });
  it("has a complete solution for every generated order", () => {
    for (let seed = 0; seed < 100; seed++) for (let round = 0; round < 30; round++) { const state = completeByFamily(generateOrder(seed, round)); const index = state.tray.findIndex(card => card.kind === (state.order.family === "pizza" ? "pizza" : state.order.family === "pancakes" ? "pancakes" : "ice-cream")); expect(index).toBeGreaterThanOrEqual(0); expect(serve(state, index).result).toBe("served"); }
  });
});
