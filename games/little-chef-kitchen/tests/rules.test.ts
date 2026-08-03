import { describe, it, expect } from "vitest";
import { LEVEL } from "../src/game/level";
import {
  beginRun,
  finishRun,
  freshKitchen,
  freshRun,
  nextMatchingSocket,
  placePiece,
  placementsReady,
  removePiece,
} from "../src/game/rules";
describe("drag kitchen rules", () => {
  it("starts with two matching straight pieces", () => {
    const s=freshKitchen(LEVEL);
    expect(s.tray).toEqual(["straight","straight"]);
    expect(s.placements).toHaveLength(2);
    expect(LEVEL.pieceKinds).toEqual(LEVEL.socketKinds);
  });
  it("accepts both matching pieces and completes", () => {
    const a=freshKitchen(LEVEL), b=placePiece(a,LEVEL,0,0);
    expect(b.result).toBe("placed"); expect(b.state.complete).toBe(false);
    const c=placePiece(b.state,LEVEL,0,1);
    expect(c.result).toBe("placed");
    expect(placementsReady(c.state)).toBe(true);
    expect(c.state.complete).toBe(false);
  });
  it("rejects outside socket without losing the tray", () => {
    const s=freshKitchen(LEVEL), wrong=placePiece(s,LEVEL,0,8);
    expect(wrong.result).toBe("rejected"); expect(wrong.state).toEqual(s);
  });
  it("supports run phases", () => {
    const editing=freshRun(); expect(editing.phase).toBe("editing");
    expect(beginRun(editing).phase).toBe("running");
    expect(finishRun(beginRun(editing)).phase).toBe("finished");
  });
  it("resets placed pieces for play again", () => {
    const s=placePiece(freshKitchen(LEVEL),LEVEL,0,0).state;
    expect(removePiece(s,0).tray).toHaveLength(2);
  });
  it("finds the next socket after placement", () => {
    const s = freshKitchen(LEVEL);
    expect(placementsReady(s)).toBe(false);
    expect(nextMatchingSocket(s, LEVEL)).toBe(0);
    const placed=placePiece(s,LEVEL,0,0).state; expect(nextMatchingSocket(placed,LEVEL)).toBe(1);
  });
});
