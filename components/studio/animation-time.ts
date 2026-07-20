export type AnimationTimeInput = {
  elapsedSeconds: number
  speed: number
  timeOffset: number
  playing: boolean
}

export type AnimationTimelineFrame = {
  deltaSeconds: number
  speed: number
  timeOffset: number
  playing: boolean
}

/**
 * Owns the one continuous animation phase for a render pass.
 *
 * The store's offset is treated as a user adjustment: after construction only
 * offset deltas are applied, while frame time advances the phase when playing.
 */
export class AnimationTimeline {
  private currentTime: number
  private previousOffset: number

  constructor(initialTime = 0, timeOffset = initialTime) {
    this.currentTime = Number.isFinite(initialTime) ? initialTime : 0
    this.previousOffset = Number.isFinite(timeOffset) ? timeOffset : 0
  }

  advance({ deltaSeconds, speed, timeOffset, playing }: AnimationTimelineFrame) {
    const safeOffset = Number.isFinite(timeOffset) ? timeOffset : 0
    this.currentTime += safeOffset - this.previousOffset
    this.previousOffset = safeOffset

    if (playing && Number.isFinite(speed) && Number.isFinite(deltaSeconds)) {
      this.currentTime += Math.max(0, deltaSeconds) * speed
    }

    return this.currentTime
  }

  read() {
    return this.currentTime
  }
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
