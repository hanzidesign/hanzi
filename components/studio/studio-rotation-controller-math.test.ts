import { describe, expect, it } from 'vitest'

import { applyRotationDrag } from './studio-rotation-controller-math'

describe('Studio rotation controller math', () => {
  it('uses free orbit drag to update the combined Euler rotation', () => {
    const next = applyRotationDrag(
      { x: 0.35, y: -0.2, z: 0.15 },
      'orbit',
      48,
      -32,
    )

    expect(next.x).not.toBeCloseTo(0.35)
    expect(next.y).not.toBeCloseTo(-0.2)
    expect(next.z).not.toBeCloseTo(0.15)
  })

  it.each(['x', 'y', 'z'] as const)('lets the %s ring adjust only its axis', (axis) => {
    const start = { x: 0.1, y: 0.2, z: 0.3 }
    const next = applyRotationDrag(start, axis, 30, -20)

    expect(next[axis]).not.toBeCloseTo(start[axis])

    for (const otherAxis of ['x', 'y', 'z'] as const) {
      if (otherAxis !== axis) {
        expect(next[otherAxis]).toBeCloseTo(start[otherAxis])
      }
    }
  })
})
