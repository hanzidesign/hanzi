import { describe, expect, it } from 'vitest'

import { AnimationTimeline, computeEffectiveAnimationTime } from './animation-time'

describe('animation time', () => {
  it('uses speed and offset for effective shader time', () => {
    expect(computeEffectiveAnimationTime({ elapsedSeconds: 10, speed: 0.5, timeOffset: 2, playing: true })).toBe(7)
    expect(computeEffectiveAnimationTime({ elapsedSeconds: 10, speed: -0.5, timeOffset: 2, playing: true })).toBe(-3)
  })

  it('freezes all time driven output when speed is zero or playback is paused', () => {
    expect(computeEffectiveAnimationTime({ elapsedSeconds: 10, speed: 0, timeOffset: 2, playing: true })).toBe(2)
    expect(computeEffectiveAnimationTime({ elapsedSeconds: 10, speed: 1, timeOffset: 2, playing: false })).toBe(2)
  })

  it('holds its phase while paused and resumes from that phase', () => {
    const timeline = new AnimationTimeline(2)

    expect(timeline.advance({ deltaSeconds: 1, speed: 2, timeOffset: 2, playing: true })).toBe(4)
    expect(timeline.advance({ deltaSeconds: 10, speed: 2, timeOffset: 2, playing: false })).toBe(4)
    expect(timeline.advance({ deltaSeconds: 0.5, speed: 2, timeOffset: 2, playing: true })).toBe(5)
  })

  it('supports positive, negative, and zero speeds', () => {
    const positive = new AnimationTimeline()
    expect(positive.advance({ deltaSeconds: 2, speed: 1.5, timeOffset: 0, playing: true })).toBe(3)

    const negative = new AnimationTimeline()
    expect(negative.advance({ deltaSeconds: 2, speed: -1.5, timeOffset: 0, playing: true })).toBe(-3)

    const zero = new AnimationTimeline(4)
    expect(zero.advance({ deltaSeconds: 2, speed: 0, timeOffset: 4, playing: true })).toBe(4)
  })

  it('applies time offset changes as phase deltas', () => {
    const timeline = new AnimationTimeline(2)

    expect(timeline.advance({ deltaSeconds: 1, speed: 1, timeOffset: 2, playing: true })).toBe(3)
    expect(timeline.advance({ deltaSeconds: 0, speed: 1, timeOffset: 7, playing: false })).toBe(8)
  })
})
