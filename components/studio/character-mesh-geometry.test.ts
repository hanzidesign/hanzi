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

  it('applies character mesh thickness as geometry, bounds, and UV-affecting planar weight', () => {
    const normal = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 0.2,
      thickness: 0,
    })
    const thicker = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 0.2,
      thickness: 0.12,
    })
    const normalUv = normal.geometries[0].attributes.uv.array
    const thickerUv = thicker.geometries[0].attributes.uv.array

    expect(thicker.boundsMin.x).toBeLessThan(normal.boundsMin.x)
    expect(thicker.boundsMax.x).toBeGreaterThan(normal.boundsMax.x)
    expect(Array.from(thickerUv)).not.toEqual(Array.from(normalUv))
  })

  it('assigns side-wall UVs with depth variation instead of front-face XY projection', () => {
    const result = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 0.2,
    })
    const geometry = result.geometries[0]
    const position = geometry.attributes.position
    const normal = geometry.attributes.normal
    const uv = geometry.attributes.uv
    const sideDepthUvs = new Set<number>()

    for (let index = 0; index < position.count; index += 1) {
      if (Math.abs(normal.getZ(index)) < 0.5) {
        sideDepthUvs.add(Number(uv.getY(index).toFixed(4)))
      }
    }

    expect(sideDepthUvs.size).toBeGreaterThan(1)
  })

  it('increases geometry density when displacement subdivision is raised', () => {
    const base = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 0.2,
      displacementSubdivisionLevel: 0,
    })
    const subdivided = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 0.2,
      displacementSubdivisionLevel: 2,
    })

    expect(subdivided.geometries[0].attributes.position.count).toBeGreaterThan(
      base.geometries[0].attributes.position.count,
    )
    expect(subdivided.boundsMin).toEqual(base.boundsMin)
    expect(subdivided.boundsMax).toEqual(base.boundsMax)
  })

  it('preserves displacement UV sampling after subdivision', () => {
    const result = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 0.2,
      displacementSubdivisionLevel: 2,
    })
    const geometry = result.geometries[0]

    expect(geometry.attributes.uv.count).toBe(
      geometry.attributes.position.count,
    )
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
