export const MIN_MOTION_SPEED = 0.5
export const MAX_MOTION_SPEED = 100
export const MOTION_SPEED_STEP = 0.01

/** Normalize user or persisted input to the fixed positive Motion Speed domain. */
export function normalizeMotionSpeed(speed: number): number {
  const finiteSpeed = Number.isFinite(speed) ? speed : MIN_MOTION_SPEED
  const normalized = Math.min(MAX_MOTION_SPEED, Math.max(MIN_MOTION_SPEED, Math.abs(finiteSpeed)))

  return Math.round(normalized / MOTION_SPEED_STEP) * MOTION_SPEED_STEP
}

/** Return the signed Y-axis auto-rotation speed. Timeline speed stays positive. */
export function getSignedRotationSpeed(speed: number, reverse: boolean): number {
  const positiveSpeed = Math.abs(Number.isFinite(speed) ? speed : 0)

  return reverse ? -positiveSpeed : positiveSpeed
}

export function getRotationDirection(reverse: boolean): 1 | -1 {
  return reverse ? -1 : 1
}
