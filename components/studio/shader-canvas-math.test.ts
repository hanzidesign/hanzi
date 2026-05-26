import { Vector2 } from 'three'
import { describe, expect, it } from 'vitest'

import {
  applyDeltaRotation,
  getViewportPointerUniformValue,
} from './shader-canvas-math'

describe('shader canvas math', () => {
  it('normalizes screen viewport pointer coordinates within the preview frame', () => {
    const pointer = getViewportPointerUniformValue(
      { clientX: 150, clientY: 250 },
      { left: 50, top: 200, width: 200, height: 100 },
    )

    expect(pointer).toEqual(new Vector2(0.5, 0.5))
  })

  it('clamps screen viewport pointer coordinates to the preview frame', () => {
    const pointer = getViewportPointerUniformValue(
      { clientX: 500, clientY: 50 },
      { left: 50, top: 200, width: 200, height: 100 },
    )

    expect(pointer).toEqual(new Vector2(1, 0))
  })

  it('returns the neutral pointer when the preview frame has no measurable size', () => {
    const pointer = getViewportPointerUniformValue(
      { clientX: 150, clientY: 250 },
      { left: 50, top: 200, width: 0, height: 100 },
    )

    expect(pointer).toEqual(new Vector2(0, 0))
  })

  it('applies auto-rotation using elapsed seconds instead of per-frame increments', () => {
    expect(applyDeltaRotation(1, 0.5, 1)).toBe(1.5)
    expect(applyDeltaRotation(1, 0.5, 1 / 60)).toBeCloseTo(1.008333, 6)
  })
})
