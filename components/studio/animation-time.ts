export type AnimationTimeInput = {
  elapsedSeconds: number
  speed: number
  timeOffset: number
  playing: boolean
}

export function computeEffectiveAnimationTime({
  elapsedSeconds,
  speed,
  timeOffset,
  playing,
}: AnimationTimeInput) {
  const safeOffset = Number.isFinite(timeOffset) ? timeOffset : 0

  if (!playing || !Number.isFinite(speed) || speed === 0) {
    return safeOffset
  }

  return safeOffset + Math.max(0, elapsedSeconds) * speed
}
