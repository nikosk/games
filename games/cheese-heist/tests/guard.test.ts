import { describe, expect, it } from 'vitest';
import {
  createGuard,
  GUARD_TIMINGS,
  sendToInvestigate,
  stepGuard,
  type Guard,
  type GuardEvents,
  type PlayerProbe,
} from '../src/game/guard';
import { KITCHEN } from '../src/game/room';

function step(guard: Guard, dtMs: number, player: PlayerProbe): GuardEvents {
  return stepGuard(guard, dtMs, player, KITCHEN);
}

/** A player far away, hidden in the start pocket where the cat never looks. */
const SAFE_PLAYER: PlayerProbe = { x: 180, y: 800, hidden: false };

describe('patrol', () => {
  it('pauses at the first waypoint, then walks to the second', () => {
    const guard = createGuard(KITCHEN);
    // first step arrives at waypoint 700 immediately and starts the pause
    step(guard, 16, SAFE_PLAYER);
    expect(guard.state).toBe('look');
    expect(guard.facing).toBe(1);
    step(guard, GUARD_TIMINGS.waypointPauseMs + 10, SAFE_PLAYER);
    expect(guard.state).toBe('patrol');
    step(guard, 1000, SAFE_PLAYER);
    expect(guard.x).toBeCloseTo(700 + KITCHEN.guard.patrolSpeed, 3);
  });

  it('reverses direction at the far waypoint', () => {
    const guard = createGuard(KITCHEN);
    // settle the pause, then walk the full distance to 1020
    step(guard, 16, SAFE_PLAYER);
    step(guard, GUARD_TIMINGS.waypointPauseMs + 10, SAFE_PLAYER);
    const distance = 1020 - 700;
    step(guard, (distance / KITCHEN.guard.patrolSpeed) * 1000 + 100, SAFE_PLAYER);
    expect(guard.x).toBe(1020);
    expect(guard.state).toBe('look');
    expect(guard.facing).toBe(-1);
  });
});

describe('detection and chase', () => {
  it('spots a visible player: alert, then chase', () => {
    const guard = createGuard(KITCHEN);
    step(guard, 16, SAFE_PLAYER); // settle at start waypoint
    const events = step(guard, 100, { x: 800, y: 800, hidden: false });
    expect(events.sawPlayer).toBe(true);
    expect(guard.state).toBe('alert');
    step(guard, GUARD_TIMINGS.alertMs + 10, { x: 800, y: 800, hidden: false });
    expect(guard.state).toBe('chase');
  });

  it('catches a player it reaches on the floor', () => {
    const guard = createGuard(KITCHEN);
    step(guard, 16, SAFE_PLAYER);
    step(guard, 100, { x: 800, y: 800, hidden: false });
    step(guard, GUARD_TIMINGS.alertMs + 10, { x: 800, y: 800, hidden: false });
    // the chase step reaches the player's spot (catch is checked before
    // moving, so arriving does not catch yet)
    let events = step(guard, 1000, { x: 800, y: 800, hidden: false });
    expect(events.caughtPlayer).toBe(false);
    expect(guard.x).toBe(800);
    // standing on the player means caught
    events = step(guard, 16, { x: 800, y: 800, hidden: false });
    expect(events.caughtPlayer).toBe(true);
    expect(guard.state).toBe('caught');
  });

  it('swipes a player standing on the counter at the left edge', () => {
    const guard = createGuard(KITCHEN);
    guard.x = 1060;
    guard.state = 'chase';
    const events = step(guard, 16, { x: 1115, y: 628, hidden: false });
    expect(events.caughtPlayer).toBe(true);
    expect(guard.state).toBe('caught');
  });

  it('cannot swipe a player far from the counter edge', () => {
    const guard = createGuard(KITCHEN);
    guard.x = 1060;
    guard.state = 'chase';
    const events = step(guard, 16, { x: 1300, y: 628, hidden: false });
    expect(events.caughtPlayer).toBe(false);
    expect(guard.state).toBe('chase');
  });

  it('loses a hidden player and searches the last seen spot', () => {
    const guard = createGuard(KITCHEN);
    guard.x = 700;
    guard.state = 'chase';
    guard.lastSeenX = 760;
    const hiddenPlayer: PlayerProbe = { x: 800, y: 800, hidden: true };
    let events = step(guard, GUARD_TIMINGS.loseSightMs + 100, hiddenPlayer);
    expect(events.lostPlayer).toBe(true);
    expect(guard.state).toBe('search');
    expect(guard.targetX).toBe(760);
    // walk to the search spot, look around, then patrol again
    events = step(guard, 5000, hiddenPlayer);
    expect(guard.state).toBe('search-look');
    events = step(guard, GUARD_TIMINGS.searchLookMs + 10, hiddenPlayer);
    expect(guard.state).toBe('patrol');
    expect(events.sawPlayer).toBe(false);
  });
});

describe('investigate', () => {
  it('walks to the spoon clatter, looks around, then returns to patrol', () => {
    const guard = createGuard(KITCHEN);
    step(guard, 16, SAFE_PLAYER);
    sendToInvestigate(guard, KITCHEN.spoonClatterX);
    expect(guard.state).toBe('investigate');
    const distance = 700 - KITCHEN.spoonClatterX;
    step(guard, (distance / KITCHEN.guard.patrolSpeed) * 1000 + 100, SAFE_PLAYER);
    expect(guard.x).toBe(KITCHEN.spoonClatterX);
    expect(guard.state).toBe('investigate-look');
    const events = step(guard, GUARD_TIMINGS.investigateLookMs + 10, SAFE_PLAYER);
    expect(events.investigationDone).toBe(true);
    expect(guard.state).toBe('patrol');
  });

  it('abandons the investigation when it spots the player', () => {
    const guard = createGuard(KITCHEN);
    step(guard, 16, SAFE_PLAYER);
    sendToInvestigate(guard, KITCHEN.spoonClatterX);
    step(guard, 500, SAFE_PLAYER);
    const events = step(guard, 100, { x: 600, y: 800, hidden: false });
    expect(events.sawPlayer).toBe(true);
    expect(events.investigationAbandoned).toBe(true);
    expect(guard.state).toBe('alert');
  });

  it('ignores an investigate order while chasing', () => {
    const guard = createGuard(KITCHEN);
    guard.state = 'chase';
    sendToInvestigate(guard, KITCHEN.spoonClatterX);
    expect(guard.state).toBe('chase');
  });
});

describe('bounds', () => {
  it('never walks outside the guard bounds', () => {
    const guard = createGuard(KITCHEN);
    guard.state = 'chase';
    step(guard, 60000, { x: 10, y: 800, hidden: false });
    expect(guard.x).toBeGreaterThanOrEqual(KITCHEN.guard.minX);
    step(guard, 60000, { x: 5000, y: 800, hidden: false });
    expect(guard.x).toBeLessThanOrEqual(KITCHEN.guard.maxX);
  });
});
