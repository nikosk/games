import { describe, expect, it } from "vitest";
import { LEVEL } from "../src/game/level";
import { beginCooking, connectionReady, finishCooking, freshKitchen, placeCard, readyToCook, readyToServe, serve, SOCKET, PLATE } from "../src/game/rules";

function placeInOrder(order: readonly number[]) {
  let state = freshKitchen(LEVEL);
  for (const socket of order) {
    const card = LEVEL.sockets[socket]!.accepts;
    const result = placeCard(state, LEVEL, state.tray.indexOf(card), socket);
    expect(result.result).toBe("placed");
    state = result.state;
  }
  return state;
}

describe("recipe graph", () => {
  it.each([{ order: [0, 1, 2, 3, 4] }, { order: [4, 3, 2, 1, 0] }, { order: [2, 4, 0, 3, 1] }, { order: [1, 3, 0, 4, 2] }])("accepts placement order $order", ({ order }) => {
    expect(readyToCook(placeInOrder(order))).toBe(true);
  });

  it("retains a wrong card and exposes each edge only when its endpoints are ready", () => {
    let state = freshKitchen(LEVEL);
    const wrong = placeCard(state, LEVEL, 0, SOCKET.cheese);
    expect(wrong.result).toBe("rejected");
    expect(wrong.state).toEqual(state);
    expect(connectionReady(state, SOCKET.bread, SOCKET.toaster)).toBe(false);
    state = placeInOrder([SOCKET.bread, SOCKET.toaster]);
    expect(connectionReady(state, SOCKET.bread, SOCKET.toaster)).toBe(true);
    expect(connectionReady(state, SOCKET.toaster, PLATE)).toBe(true);
    expect(connectionReady(state, SOCKET.board, PLATE)).toBe(false);
    state = placeInOrder([SOCKET.tomato, SOCKET.board, SOCKET.cheese]);
    expect(connectionReady(state, SOCKET.tomato, SOCKET.board)).toBe(true);
    expect(connectionReady(state, SOCKET.board, PLATE)).toBe(true);
    expect(connectionReady(state, SOCKET.cheese, PLATE)).toBe(true);
  });

  it("rejects incomplete cooking and serving", () => {
    let state = freshKitchen(LEVEL);
    expect(beginCooking(state).phase).toBe("building");
    expect(readyToServe(state)).toBe(false);
    state = placeInOrder([0, 1, 2, 3, 4]);
    state = beginCooking(state);
    expect(state.phase).toBe("cooking");
    expect(serve(state)).toBe(state);
  });

  it("finishes, serves exactly once, and replays", () => {
    let state = finishCooking(placeInOrder([4, 2, 0, 3, 1]));
    expect(state.phase).toBe("building");
    state = finishCooking(beginCooking(placeInOrder([4, 2, 0, 3, 1])));
    expect(state.phase).toBe("serving");
    const served = serve(state);
    expect(served.phase).toBe("served");
    expect(serve(served)).toBe(served);
    expect(freshKitchen(LEVEL).tray).toHaveLength(5);
  });
});
