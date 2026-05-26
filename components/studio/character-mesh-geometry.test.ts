import { Shape, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import {
  MIN_CHARACTER_EXTRUSION_DEPTH,
  clampCharacterExtrusionDepth,
  createCharacterMeshGeometries,
} from './character-mesh-geometry'

function rectangleShape(width: number, height: number) {
  const shape = new Shape()
  shape.moveTo(0, 0)
  shape.lineTo(width, 0)
  shape.lineTo(width, height)
  shape.lineTo(0, height)
  shape.lineTo(0, 0)
  return shape
}

describe('character mesh geometry helpers', () => {
  it('normalizes SVG y-down coordinates into centered upright object space', () => {
    const result = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 0.2,
    })

    expect(result.boundsMin).toEqual(new Vector3(-1, -1, -0.1))
    expect(result.boundsMax).toEqual(new Vector3(1, 1, 0.1))
  })

  it('pads shader bounds to preserve 1:1 shader and displacement sampling', () => {
    const result = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 250)],
      extrusionDepth: 0.2,
    })

    expect(result.boundsMin).toEqual(new Vector3(-1, -0.5, -0.1))
    expect(result.boundsMax).toEqual(new Vector3(1, 0.5, 0.1))
    expect(result.shaderBoundsMin).toEqual(new Vector3(-1, -1, -0.1))
    expect(result.shaderBoundsMax).toEqual(new Vector3(1, 1, 0.1))
  })

  it('clamps extrusion depth to a tiny positive value', () => {
    expect(clampCharacterExtrusionDepth(0)).toBe(MIN_CHARACTER_EXTRUSION_DEPTH)

    const result = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 0,
    })

    expect(result.boundsMin.z).toBeCloseTo(-MIN_CHARACTER_EXTRUSION_DEPTH / 2)
    expect(result.boundsMax.z).toBeCloseTo(MIN_CHARACTER_EXTRUSION_DEPTH / 2)
  })

  it('rejects empty SVG shape input instead of creating a blank mesh', () => {
    expect(() =>
      createCharacterMeshGeometries({
        shapes: [],
        extrusionDepth: 0.2,
      }),
    ).toThrow(/no drawable SVG shapes/i)
  })
})
