import { describe, expect, it } from 'vitest'

import { computeEffectiveAnimationTime } from './animation-time'

describe('animation time', () => {
  it('uses speed and offset for effective shader time', () => {
    expect(computeEffectiveAnimationTime({ elapsedSeconds: 10, speed: 0.5, timeOffset: 2, playing: true })).toBe(7)
  })

  it('freezes all time driven output when speed is zero or playback is paused', () => {
    expect(computeEffectiveAnimationTime({ elapsedSeconds: 10, speed: 0, timeOffset: 2, playing: true })).toBe(2)
    expect(computeEffectiveAnimationTime({ elapsedSeconds: 10, speed: 1, timeOffset: 2, playing: false })).toBe(2)
  })
})
