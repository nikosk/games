import { clamp, type KitchenRoom } from './room';
import { evaluateVision } from './sight';

export type GuardStateName =
  | 'patrol'
  | 'look'
  | 'investigate'
  | 'investigate-look'
  | 'alert'
  | 'chase'
  | 'search'
  | 'search-look'
  | 'caught';

export interface Guard {
  x: number;
  y: number;
  facing: 1 | -1;
  state: GuardStateName;
  /** Milliseconds spent in the current state. */
  stateTime: number;
  waypoints: readonly number[];
  waypointIndex: number;
  /** Destination for investigate/search walking. */
  targetX: number;
  /** Last x where the player was seen (search target). */
  lastSeenX: number | null;
}

export interface PlayerProbe {
  readonly x: number;
  readonly y: number;
  readonly hidden: boolean;
}

export interface GuardEvents {
  sawPlayer: boolean;
  lostPlayer: boolean;
  caughtPlayer: boolean;
  investigationDone: boolean;
  investigationAbandoned: boolean;
}

export const GUARD_TIMINGS = {
  waypointPauseMs: 900,
  alertMs: 550,
  investigateLookMs: 2400,
  loseSightMs: 1600,
  searchLookMs: 1800,
} as const;

/** Cat visual height; the eye sits GUARD_EYE_OFFSET above the center. */
export const GUARD_HEIGHT = 80;
export const GUARD_EYE_OFFSET = 32;

/** A mouse standing on the floor counts as "on the counter" for the swipe
 *  when it is at least this far above the cat's center. */
const SWIPE_HEIGHT = 140;

export function createGuard(room: KitchenRoom): Guard {
  const first = room.guard.waypoints[0] ?? 700;
  return {
    x: first,
    y: room.floorY - GUARD_HEIGHT / 2,
    facing: 1,
    state: 'patrol',
    stateTime: 0,
    waypoints: room.guard.waypoints,
    waypointIndex: 0,
    targetX: first,
    lastSeenX: null,
  };
}

/** Send a patrolling cat to investigate a point (e.g. the kicked spoon). */
export function sendToInvestigate(guard: Guard, targetX: number): void {
  if (guard.state !== 'patrol' && guard.state !== 'look') return;
  guard.state = 'investigate';
  guard.stateTime = 0;
  guard.targetX = targetX;
}

/**
 * Advance the guard one step. Mutates the guard and returns the events that
 * happened this step. The cat never leaves the floor and never enters the
 * counter's x-range, so a mouse up on the counter is only in danger at the
 * counter's left edge (the swipe).
 */
export function stepGuard(
  guard: Guard,
  dtMs: number,
  player: PlayerProbe,
  room: KitchenRoom,
): GuardEvents {
  const events: GuardEvents = {
    sawPlayer: false,
    lostPlayer: false,
    caughtPlayer: false,
    investigationDone: false,
    investigationAbandoned: false,
  };

  const vision = evaluateVision(
    guard.x,
    guard.y - GUARD_EYE_OFFSET,
    guard.facing,
    room.guard.viewHalfAngleDeg,
    room.guard.viewRange,
    player.x,
    player.y,
    room.cover,
    player.hidden,
  );

  switch (guard.state) {
    case 'patrol': {
      if (vision.visible) return alertAt(guard, player.x, events);
      const target = guard.waypoints[guard.waypointIndex] ?? guard.x;
      if (walkToward(guard, dtMs, target, room.guard.patrolSpeed, room)) {
        guard.waypointIndex = guard.waypointIndex >= guard.waypoints.length - 1
          ? 0
          : guard.waypointIndex + 1;
        const next = guard.waypoints[guard.waypointIndex] ?? target;
        guard.facing = next >= guard.x ? 1 : -1;
        guard.state = 'look';
        guard.stateTime = 0;
      }
      break;
    }
    case 'look': {
      if (vision.visible) return alertAt(guard, player.x, events);
      guard.stateTime += dtMs;
      if (guard.stateTime >= GUARD_TIMINGS.waypointPauseMs) guard.state = 'patrol';
      break;
    }
    case 'investigate': {
      if (vision.visible) {
        const result = alertAt(guard, player.x, events);
        result.investigationAbandoned = true;
        return result;
      }
      if (walkToward(guard, dtMs, guard.targetX, room.guard.patrolSpeed, room)) {
        guard.state = 'investigate-look';
        guard.stateTime = 0;
      }
      break;
    }
    case 'investigate-look': {
      if (vision.visible) {
        const result = alertAt(guard, player.x, events);
        result.investigationAbandoned = true;
        return result;
      }
      guard.stateTime += dtMs;
      if (guard.stateTime >= GUARD_TIMINGS.investigateLookMs) {
        guard.state = 'patrol';
        events.investigationDone = true;
      }
      break;
    }
    case 'alert': {
      guard.stateTime += dtMs;
      if (vision.visible) {
        guard.lastSeenX = player.x;
        if (guard.stateTime >= GUARD_TIMINGS.alertMs) {
          guard.state = 'chase';
          guard.stateTime = 0;
        }
      } else if (guard.stateTime >= GUARD_TIMINGS.alertMs) {
        guard.state = 'search';
        guard.stateTime = 0;
        guard.targetX = clamp(guard.lastSeenX ?? guard.x, room.guard.minX, room.guard.maxX);
        events.lostPlayer = true;
      }
      break;
    }
    case 'chase': {
      if (catchesPlayer(guard, player, room.guard.catchRadius, room.guard.swipeRange)) {
        guard.state = 'caught';
        events.caughtPlayer = true;
        return events;
      }
      walkToward(
        guard,
        dtMs,
        clamp(player.x, room.guard.minX, room.guard.maxX),
        room.guard.chaseSpeed,
        room,
      );
      guard.facing = player.x >= guard.x ? 1 : -1;
      if (vision.visible) {
        guard.lastSeenX = player.x;
        guard.stateTime = 0;
      } else {
        guard.stateTime += dtMs;
        if (guard.stateTime >= GUARD_TIMINGS.loseSightMs) {
          guard.state = 'search';
          guard.stateTime = 0;
          guard.targetX = clamp(guard.lastSeenX ?? guard.x, room.guard.minX, room.guard.maxX);
          events.lostPlayer = true;
        }
      }
      break;
    }
    case 'search': {
      if (vision.visible) return alertAt(guard, player.x, events);
      if (walkToward(guard, dtMs, guard.targetX, room.guard.patrolSpeed, room)) {
        guard.state = 'search-look';
        guard.stateTime = 0;
      }
      break;
    }
    case 'search-look': {
      if (vision.visible) return alertAt(guard, player.x, events);
      guard.stateTime += dtMs;
      if (guard.stateTime >= GUARD_TIMINGS.searchLookMs) guard.state = 'patrol';
      break;
    }
    case 'caught': {
      break;
    }
  }
  return events;
}

function alertAt(guard: Guard, playerX: number, events: GuardEvents): GuardEvents {
  guard.state = 'alert';
  guard.stateTime = 0;
  guard.lastSeenX = playerX;
  events.sawPlayer = true;
  return events;
}

/**
 * Walk toward a floor x at the given speed. Returns true on arrival.
 * The cat never walks outside [minX, maxX].
 */
function walkToward(
  guard: Guard,
  dtMs: number,
  targetX: number,
  speed: number,
  room: KitchenRoom,
): boolean {
  const target = clamp(targetX, room.guard.minX, room.guard.maxX);
  const dx = target - guard.x;
  const step = speed * (dtMs / 1000);
  if (Math.abs(dx) <= step) {
    guard.x = target;
    return true;
  }
  guard.x += Math.sign(dx) * step;
  guard.facing = dx >= 0 ? 1 : -1;
  guard.x = clamp(guard.x, room.guard.minX, room.guard.maxX);
  return false;
}

/**
 * Catch rules:
 * - same floor (vertical difference < 140): caught within catchRadius;
 * - mouse well above the cat (on the counter or jump apex): the cat swipes
 *   and catches within swipeRange horizontally;
 * - a mouse well above the cat avoids the floor catch radius, but the cat
 *   can still swipe when it is close enough to the counter edge.
 */
function catchesPlayer(
  guard: Guard,
  player: PlayerProbe,
  catchRadius: number,
  swipeRange: number,
): boolean {
  const dx = Math.abs(player.x - guard.x);
  if (dx > swipeRange) return false;
  const dy = guard.y - player.y;
  if (dy >= SWIPE_HEIGHT) return true;
  if (dy < -46) return false;
  return dx <= catchRadius;
}
