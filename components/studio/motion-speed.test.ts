import { describe, expect, it } from 'vitest'

import {
  getSignedRotationSpeed,
  normalizeMotionSpeed,
} from './motion-speed'

describe('3D Motion Speed', () => {
  it('automatically replaces values below the fixed 0.5 minimum', () => {
    expect(normalizeMotionSpeed(0.01)).toBe(0.5)
    expect(normalizeMotionSpeed(-1)).toBe(1)
  })

  it('keeps timeline speed positive and reverses only the rotation sign', () => {
    expect(getSignedRotationSpeed(1.25, false)).toBe(1.25)
    expect(getSignedRotationSpeed(1.25, true)).toBe(-1.25)
  })
})
