export const TRAIL_DIRECTION_DECAY = 1
export const TRAIL_DIRECTION_DEADZONE = 0.02
export const TRAIL_MAX_DISPLACEMENT = 0.16
export const TRAIL_BLUR_TEXELS = 1.5

export type TrailDirection = {
  x: number
  y: number
}

/** Decode an RG-encoded signed direction without discarding its magnitude. */
export function decodeTrailDirection(red: number, green: number): TrailDirection {
  const x = red * 2 - 1
  const y = green * 2 - 1
  const magnitude = Math.hypot(x, y)

  return magnitude > TRAIL_DIRECTION_DEADZONE ? { x, y } : { x: 0, y: 0 }
}

/** Encode a signed direction, capping only vectors outside the unit circle. */
export function encodeTrailDirection(direction: TrailDirection): [number, number] {
  const magnitude = Math.hypot(direction.x, direction.y)
  const scale = magnitude > 1 ? 1 / magnitude : 1

  return [direction.x * scale * 0.5 + 0.5, direction.y * scale * 0.5 + 0.5]
}

export function retainTrailMagnitude(magnitude: number, deltaSeconds: number): number {
  return magnitude * Math.exp(-TRAIL_DIRECTION_DECAY * deltaSeconds)
}

export function retainTrailDirection(
  direction: TrailDirection,
  deltaSeconds: number
): TrailDirection {
  const retention = Math.exp(-TRAIL_DIRECTION_DECAY * deltaSeconds)
  return { x: direction.x * retention, y: direction.y * retention }
}
