/**
 * Resolve the desired horizontal velocity for the monkey this frame.
 *
 * - Holding a single direction steers left/right at run speed. This applies
 *   on the ground and in the air (air steering after a jump or vine release).
 * - On the ground with no direction held, the monkey stops (velocity 0).
 * - Airborne with no direction held, the current velocity is preserved so
 *   vine-release and jump momentum carry the monkey across gaps instead of
 *   being zeroed on the next frame.
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