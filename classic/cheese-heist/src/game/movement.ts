/**
 * Resolve the desired horizontal velocity for the mouse this frame.
 *
 * - Holding a single direction steers left/right at run speed (ground and
 *   air).
 * - On the ground with no direction held, the mouse stops.
 * - Airborne with no direction held, current velocity is preserved so jump
 *   momentum carries the mouse across the bread loaf or onto the counter.
 */
export function resolveHorizontalVelocity(
  moveLeft: boolean,
  moveRight: boolean,
  onGround: boolean,
  currentVx: number,
  runSpeed: number,
): number {
  if (moveLeft && !moveRight) return -runSpeed;
  if (moveRight && !moveLeft) return runSpeed;
  if (onGround) return 0;
  return currentVx;
}
