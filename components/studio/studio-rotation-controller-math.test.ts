import { describe, expect, it } from 'vitest'

import {
  applyRotationDrag,
  projectRotationRings,
} from './studio-rotation-controller-math'

describe('Studio rotation controller math', () => {
  it('uses free orbit drag to update the combined Euler rotation', () => {
    const next = applyRotationDrag(
      { x: 0.35, y: -0.2, z: 0.15 },
      48,
      -32,
    )

    expect(next.x).not.toBeCloseTo(0.35)
    expect(next.y).not.toBeCloseTo(-0.2)
    expect(next.z).not.toBeCloseTo(0.15)
  })

  it('projects deterministic local ring paths in the identity orientation', () => {
    const paths = projectRotationRings({ x: 0, y: 0, z: 0 })

    expect(paths).toEqual(projectRotationRings({ x: 0, y: 0, z: 0 }))
    expect(paths.x).toMatch(/^M 64 14 L /)
    expect(paths.y).toMatch(/^M 64 64 L /)
    expect(paths.z).toMatch(/^M 114 64 L /)
  })

  it('changes every projected ring when the model has non-zero XYZ rotation', () => {
    const identity = projectRotationRings({ x: 0, y: 0, z: 0 })
    const rotated = projectRotationRings({ x: 0.35, y: -0.2, z: 0.15 })

    expect(rotated.x).not.toBe(identity.x)
    expect(rotated.y).not.toBe(identity.y)
    expect(rotated.z).not.toBe(identity.z)
  })
})
