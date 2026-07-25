import { BufferAttribute, Path, Shape, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import {
  CHARACTER_MESH_BEVEL_SEGMENTS,
  MIN_CHARACTER_EXTRUSION_DEPTH,
  normalizeCharacterMeshTaper,
  clampCharacterExtrusionDepth,
  createCharacterMeshGeometries,
  sampleCharacterMeshSurfaceNoise,
} from './character-mesh-geometry'
import { DEFAULT_CHARACTER_MESH_DEFORM } from './character-mesh-deform'

function rectangleShape(width: number, height: number) {
  const shape = new Shape()
  shape.moveTo(0, 0)
  shape.lineTo(width, 0)
  shape.lineTo(width, height)
  shape.lineTo(0, height)
  shape.lineTo(0, 0)
  return shape
}

function lShape() {
  const shape = new Shape()
  shape.moveTo(0, 0)
  shape.lineTo(500, 0)
  shape.lineTo(500, 150)
  shape.lineTo(150, 150)
  shape.lineTo(150, 500)
  shape.lineTo(0, 500)
  shape.closePath()
  return shape
}

function rectangleWithHole() {
  const shape = rectangleShape(500, 500)
  const hole = new Path()
  hole.moveTo(150, 150)
  hole.lineTo(150, 350)
  hole.lineTo(350, 350)
  hole.lineTo(350, 150)
  hole.closePath()
  shape.holes.push(hole)
  return shape
}

function overlappingShapesWithHole() {
  const first = rectangleShape(500, 500)
  const second = new Shape()
  second.moveTo(250, 0)
  second.lineTo(750, 0)
  second.lineTo(750, 500)
  second.lineTo(250, 500)
  second.closePath()
  const hole = new Path()
  hole.moveTo(40, 150)
  hole.lineTo(40, 350)
  hole.lineTo(180, 350)
  hole.lineTo(180, 150)
  hole.closePath()
  first.holes.push(hole)
  return [first, second]
}

function acuteShape() {
  const shape = new Shape()
  shape.moveTo(0, 0)
  shape.lineTo(500, 0)
  shape.lineTo(20, 200)
  shape.closePath()
  return shape
}

function deformWith(
  key: 'bulgePinch' | 'squashStretch' | 'wave' | 'surfaceNoise' | 'inflate' | 'curl',
  amount: number,
  enabled = true,
) {
  return {
    ...DEFAULT_CHARACTER_MESH_DEFORM,
    bulgePinch: { ...DEFAULT_CHARACTER_MESH_DEFORM.bulgePinch },
    squashStretch: { ...DEFAULT_CHARACTER_MESH_DEFORM.squashStretch },
    wave: { ...DEFAULT_CHARACTER_MESH_DEFORM.wave },
    surfaceNoise: { ...DEFAULT_CHARACTER_MESH_DEFORM.surfaceNoise },
    inflate: { ...DEFAULT_CHARACTER_MESH_DEFORM.inflate },
    curl: { ...DEFAULT_CHARACTER_MESH_DEFORM.curl },
    [key]: key === 'wave'
      ? { ...DEFAULT_CHARACTER_MESH_DEFORM.wave, enabled, amplitude: amount }
      : key === 'curl'
        ? { ...DEFAULT_CHARACTER_MESH_DEFORM.curl, enabled, angle: amount }
        : { ...DEFAULT_CHARACTER_MESH_DEFORM[key], enabled, amount },
  }
}

function positions(result: ReturnType<typeof createCharacterMeshGeometries>) {
  return Array.from(result.geometries[0].attributes.position.array)
}

function maxPositionDelta(a: number[], b: number[]) {
  return Math.max(...a.map((value, index) => Math.abs(value - b[index])))
}

function axisDeltas(base: number[], changed: number[]) {
  const deltas = { x: [] as number[], y: [] as number[], z: [] as number[] }
  for (let index = 0; index < base.length; index += 3) {
    deltas.x.push(changed[index] - base[index])
    deltas.y.push(changed[index + 1] - base[index + 1])
    deltas.z.push(changed[index + 2] - base[index + 2])
  }
  return deltas
}

describe('character mesh geometry helpers', () => {
  it('keeps zero Thickness as an identity resize', () => {
    const implicit = createCharacterMeshGeometries({
      shapes: [rectangleWithHole()],
      extrusionDepth: 20,
    })
    const explicit = createCharacterMeshGeometries({
      shapes: [rectangleWithHole()],
      extrusionDepth: 20,
      thickness: 0,
    })

    expect(Array.from(explicit.geometries[0].attributes.position.array)).toEqual(
      Array.from(implicit.geometries[0].attributes.position.array),
    )
  })

  it('unions overlapping source Shapes into one extruded geometry and retains holes', () => {
    const result = createCharacterMeshGeometries({
      shapes: overlappingShapesWithHole(),
      extrusionDepth: 40,
    })

    expect(result.geometries).toHaveLength(1)
    expect(result.boundsMin.x).toBeCloseTo(-1)
    expect(result.boundsMax.x).toBeCloseTo(1)
    expect(Array.from(result.geometries[0].attributes.position.array).every(Number.isFinite)).toBe(true)
  })

  it('caps extrusion bevels at acute first corners without degenerate vertices', () => {
    const result = createCharacterMeshGeometries({
      shapes: [acuteShape()],
      extrusionDepth: 40,
      bevel: 20,
    })

    for (const geometry of result.geometries) {
      expect(Array.from(geometry.attributes.position.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(geometry.index?.array ?? []).every(Number.isFinite)).toBe(true)
    }
  })

  it('normalizes SVG y-down coordinates into centered upright object space', () => {
    const result = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 20,
    })

    expect(result.boundsMin).toEqual(new Vector3(-1, -1, -0.1))
    expect(result.boundsMax).toEqual(new Vector3(1, 1, 0.1))
  })

  it('pads shader bounds to preserve 1:1 shader and displacement sampling', () => {
    const result = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 250)],
      extrusionDepth: 20,
    })

    expect(result.boundsMin).toEqual(new Vector3(-1, -0.5, -0.1))
    expect(result.boundsMax).toEqual(new Vector3(1, 0.5, 0.1))
    expect(result.shaderBoundsMin).toEqual(new Vector3(-1, -1, -0.1))
    expect(result.shaderBoundsMax).toEqual(new Vector3(1, 1, 0.1))
  })

  it('maps the 1 to 100 Extrude scale to 0.01 to 1 geometry depth', () => {
    expect(clampCharacterExtrusionDepth(0)).toBe(MIN_CHARACTER_EXTRUSION_DEPTH)
    expect(clampCharacterExtrusionDepth(1)).toBe(0.01)
    expect(clampCharacterExtrusionDepth(100)).toBe(1)
    expect(clampCharacterExtrusionDepth(101)).toBe(1)

    const result = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 0,
    })

    expect(result.boundsMin.z).toBeCloseTo(-MIN_CHARACTER_EXTRUSION_DEPTH / 2)
    expect(result.boundsMax.z).toBeCloseTo(MIN_CHARACTER_EXTRUSION_DEPTH / 2)
  })

  it('rounds both contour and extrusion edges inward without making the model thicker', () => {
    const flat = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 80,
      bevel: 0,
    })
    const smallBevel = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 80,
      bevel: 2,
    })
    const largeBevel = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 80,
      bevel: 4,
    })

    expect(largeBevel.geometries[0].attributes.position.count).toBeGreaterThan(
      flat.geometries[0].attributes.position.count,
    )

    const depthProfile = (result: ReturnType<typeof createCharacterMeshGeometries>) => {
      const position = result.geometries[0].attributes.position
      const depthLayers = new Set<number>()
      for (let index = 0; index < position.count; index += 1) {
        depthLayers.add(Number(position.getZ(index).toFixed(6)))
      }
      const sortedDepthLayers = [...depthLayers].sort((a, b) => a - b)
      const layerBounds = (depth: number) => {
        const xy = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
        for (let index = 0; index < position.count; index += 1) {
          if (Math.abs(position.getZ(index) - depth) > 1e-6) {
            continue
          }
          xy.minX = Math.min(xy.minX, position.getX(index))
          xy.maxX = Math.max(xy.maxX, position.getX(index))
          xy.minY = Math.min(xy.minY, position.getY(index))
          xy.maxY = Math.max(xy.maxY, position.getY(index))
        }
        return xy
      }
      const sideSpans = sortedDepthLayers.slice(1, -1).map((depth) => {
        const bounds = layerBounds(depth)
        return bounds.maxX - bounds.minX
      })

      return {
        depthLayers: sortedDepthLayers,
        bottomCap: layerBounds(sortedDepthLayers[0]),
        topCap: layerBounds(sortedDepthLayers.at(-1)!),
        maxSideSpan: Math.max(...sideSpans),
      }
    }

    const flatProfile = depthProfile(flat)
    const smallProfile = depthProfile(smallBevel)
    const largeProfile = depthProfile(largeBevel)
    expect(flatProfile.bottomCap).toEqual({ minX: -1, maxX: 1, minY: -1, maxY: 1 })
    for (const [result, profile] of [[smallBevel, smallProfile], [largeBevel, largeProfile]] as const) {
      expect(profile.bottomCap.minX).toBeGreaterThan(-1)
      expect(profile.bottomCap.maxX).toBeLessThan(1)
      expect(profile.topCap.minX).toBeGreaterThan(-1)
      expect(profile.topCap.maxX).toBeLessThan(1)
      expect(profile.maxSideSpan).toBeCloseTo(2, 4)
      expect(result.boundsMin.x).toBeGreaterThanOrEqual(-1)
      expect(result.boundsMax.x).toBeLessThanOrEqual(1)
      expect(result.boundsMax.z - result.boundsMin.z).toBeCloseTo(0.8, 6)
      expect(result.boundsMin.z).toBeCloseTo(-0.4, 6)
      expect(result.boundsMax.z).toBeCloseTo(0.4, 6)
    }

    expect(CHARACTER_MESH_BEVEL_SEGMENTS).toBe(6)
    expect(smallProfile.depthLayers.length).toBe(CHARACTER_MESH_BEVEL_SEGMENTS * 2 + 2)
    expect(largeProfile.depthLayers.length).toBe(CHARACTER_MESH_BEVEL_SEGMENTS * 2 + 2)
    expect(largeProfile.bottomCap.maxX - largeProfile.bottomCap.minX).toBeLessThan(
      smallProfile.bottomCap.maxX - smallProfile.bottomCap.minX,
    )
  })

  it('keeps bevel geometry finite when Thickness is also active', () => {
    const result = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 50,
      thickness: 2,
      bevel: 5,
    })

    for (const geometry of result.geometries) {
      expect(Array.from(geometry.attributes.position.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(geometry.attributes.normal.array).every(Number.isFinite)).toBe(true)
    }
  })

  it('extrudes beveled reflex corners and holes without expanding or corrupting geometry', () => {
    for (const shape of [lShape(), rectangleWithHole()]) {
      const result = createCharacterMeshGeometries({
        shapes: [shape],
        extrusionDepth: 60,
        bevel: 4,
      })

      expect(result.boundsMin.x).toBeGreaterThanOrEqual(-1)
      expect(result.boundsMax.x).toBeLessThanOrEqual(1)
      expect(result.boundsMin.y).toBeGreaterThanOrEqual(-1)
      expect(result.boundsMax.y).toBeLessThanOrEqual(1)
      expect(result.boundsMax.z - result.boundsMin.z).toBeCloseTo(0.6, 6)
      for (const geometry of result.geometries) {
        expect(Array.from(geometry.attributes.position.array).every(Number.isFinite)).toBe(true)
        expect(Array.from(geometry.attributes.normal.array).every(Number.isFinite)).toBe(true)
      }
    }
  })

  it('continues increasing the rounded contour through the full Bevel range', () => {
    const low = createCharacterMeshGeometries({
      shapes: [lShape()],
      extrusionDepth: 60,
      bevel: 6,
    })
    const high = createCharacterMeshGeometries({
      shapes: [lShape()],
      extrusionDepth: 60,
      bevel: 20,
    })
    const nearHigh = createCharacterMeshGeometries({
      shapes: [lShape()],
      extrusionDepth: 60,
      bevel: 16,
    })
    const nine = createCharacterMeshGeometries({
      shapes: [lShape()],
      extrusionDepth: 60,
      bevel: 18,
    })

    const lowPositions = positions(low)
    const highPositions = positions(high)
    expect(highPositions).not.toEqual(lowPositions)
    expect(maxPositionDelta(lowPositions, highPositions)).toBeGreaterThan(0.01)
    expect(maxPositionDelta(positions(nearHigh), highPositions)).toBeGreaterThan(0.01)
    expect(maxPositionDelta(positions(nine), highPositions)).toBeGreaterThan(0.001)
  })

  it('makes Bevel20 materially rounder than Bevel10', () => {
    const ten = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 80,
      bevel: 10,
    })
    const twenty = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 80,
      bevel: 20,
    })

    expect(maxPositionDelta(positions(ten), positions(twenty))).toBeGreaterThan(0.01)
    const maxXAtFront = (result: ReturnType<typeof createCharacterMeshGeometries>) => {
      const position = result.geometries[0].attributes.position
      const maxZ = Math.max(...Array.from({ length: position.count }, (_, index) => position.getZ(index)))
      return Math.max(...Array.from({ length: position.count }, (_, index) =>
        Math.abs(position.getZ(index) - maxZ) < 1e-6 ? position.getX(index) : -Infinity,
      ))
    }
    expect(maxXAtFront(twenty)).toBeLessThan(maxXAtFront(ten))
  })

  it('twists the extruded SVG around its Y axis', () => {
    const straight = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 250)],
      extrusionDepth: 40,
      twist: 0,
    })
    const twisted = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 250)],
      extrusionDepth: 40,
      twist: 90,
    })

    expect(Array.from(twisted.geometries[0].attributes.position.array)).not.toEqual(
      Array.from(straight.geometries[0].attributes.position.array),
    )
    expect(twisted.boundsMin.y).toBeCloseTo(straight.boundsMin.y)
    expect(twisted.boundsMax.y).toBeCloseTo(straight.boundsMax.y)
    expect(twisted.boundsMax.z - twisted.boundsMin.z).toBeGreaterThan(
      straight.boundsMax.z - straight.boundsMin.z,
    )
  })

  it('tapers the SVG model so its front and back faces have different spans', () => {
    expect(normalizeCharacterMeshTaper(-10)).toBe(-1)
    expect(normalizeCharacterMeshTaper(6)).toBeCloseTo(0.6)
    expect(normalizeCharacterMeshTaper(10)).toBe(1)
    expect(normalizeCharacterMeshTaper(11)).toBe(1)

    const tapered = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 40,
      taper: 6,
    })
    const position = tapered.geometries[0].attributes.position
    const frontX: number[] = []
    const backX: number[] = []

    for (let index = 0; index < position.count; index += 1) {
      const target = position.getZ(index) > 0 ? frontX : backX
      target.push(position.getX(index))
    }

    expect(Math.max(...frontX) - Math.min(...frontX)).toBeGreaterThan(
      Math.max(...backX) - Math.min(...backX),
    )
  })

  it('bends the SVG face into depth instead of applying a flat transform', () => {
    const flat = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 20,
      bend: 0,
    })
    const bent = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 20,
      bend: 70,
    })

    expect(Array.from(bent.geometries[0].attributes.position.array)).not.toEqual(
      Array.from(flat.geometries[0].attributes.position.array),
    )
    expect(bent.boundsMax.z - bent.boundsMin.z).toBeGreaterThan(
      flat.boundsMax.z - flat.boundsMin.z,
    )
  })

  it('preserves horizontal orientation while reversing Bend depth for negative angles', () => {
    const baseOptions = {
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 20,
      displacementSubdivisionLevel: 2,
    }
    const base = positions(createCharacterMeshGeometries(baseOptions))
    const positive = positions(createCharacterMeshGeometries({ ...baseOptions, bend: 70 }))
    const negative = positions(createCharacterMeshGeometries({ ...baseOptions, bend: -70 }))

    for (let index = 0; index < base.length; index += 3) {
      expect(positive[index]).toBeCloseTo(negative[index], 6)
      expect(positive[index + 1]).toBeCloseTo(negative[index + 1], 6)
      const positiveDepthDelta = positive[index + 2] - base[index + 2]
      const negativeDepthDelta = negative[index + 2] - base[index + 2]
      expect(positiveDepthDelta + negativeDepthDelta).toBeCloseTo(0, 6)
    }
  })

  it('applies character mesh thickness as geometry, bounds, and UV-affecting planar weight', () => {
    const normal = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 20,
      thickness: 0,
    })
    const thicker = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 20,
      thickness: 3,
    })
    const normalUv = normal.geometries[0].attributes.uv.array
    const thickerUv = thicker.geometries[0].attributes.uv.array

    const thinner = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 20,
      thickness: -3,
    })

    expect(thicker.boundsMin.x).toBeLessThan(normal.boundsMin.x)
    expect(thicker.boundsMax.x).toBeGreaterThan(normal.boundsMax.x)
    expect(thinner.boundsMin.x).toBeGreaterThan(normal.boundsMin.x)
    expect(thinner.boundsMax.x).toBeLessThan(normal.boundsMax.x)
    expect(Array.from(thickerUv)).not.toEqual(Array.from(normalUv))
  })

  it('maps the negative Thickness range toward a thin but renderable stroke', () => {
    const values = [0, -2.5, -5, -7.5, -10]
    const results = values.map((thickness) => createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 20,
      thickness,
    }))
    const widths = results.map((result) => result.boundsMax.x - result.boundsMin.x)

    for (let index = 1; index < widths.length; index += 1) {
      expect(widths[index]).toBeLessThanOrEqual(widths[index - 1] + 1e-6)
    }
    expect(widths.at(-1)!).toBeGreaterThan(0)
    expect(widths.at(-1)!).toBeLessThan(0.1)
    expect(Array.from(results.at(-1)!.geometries[0].attributes.position.array).every(Number.isFinite)).toBe(true)
  })

  it('uses each original Shape collapse limit for negative Thickness', () => {
    const sourceShapes = [rectangleShape(500, 500), rectangleShape(500, 20)]
    const planarSpans = sourceShapes.map((shape) => {
      const results = [0, -1, -10].map((thickness) => createCharacterMeshGeometries({
        shapes: [shape],
        extrusionDepth: 20,
        thickness,
      }))
      return results.map((result) => Math.min(
        result.boundsMax.x - result.boundsMin.x,
        result.boundsMax.y - result.boundsMin.y,
      ))
    })

    for (const [normal, lightlyThinned, collapsed] of planarSpans) {
      expect(lightlyThinned).toBeGreaterThan(normal * 0.5)
      expect(collapsed).toBeGreaterThan(0)
      expect(collapsed).toBeLessThan(normal * 0.1)
    }
  })

  it('assigns side-wall UVs with depth variation instead of front-face XY projection', () => {
    const result = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 20,
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

  it('applies CPU Model Deforms and routes Wave and Noise to GPU attributes', () => {
    const base = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 20,
    })
    const effects = [
      ['bulgePinch', 1],
      ['squashStretch', 1],
      ['inflate', 1],
      ['curl', 90],
    ] as const

    for (const [key, amount] of effects) {
      const result = createCharacterMeshGeometries({
        shapes: [rectangleShape(500, 500)],
        extrusionDepth: 20,
        deform: deformWith(key, amount),
      })

      expect(Array.from(result.geometries[0].attributes.position.array)).not.toEqual(
        Array.from(base.geometries[0].attributes.position.array),
      )
    }

    for (const key of ['wave', 'surfaceNoise'] as const) {
      const result = createCharacterMeshGeometries({
        shapes: [rectangleShape(500, 500)],
        extrusionDepth: 20,
        deform: deformWith(key, 1),
      })
      expect(result.gpuDeformActive).toBe(true)
      expect(result.geometries[0].attributes.characterModelPosition).toBeDefined()
      expect(result.geometries[0].attributes.characterStableNormal).toBeDefined()
    }

    const disabled = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 20,
      deform: deformWith('surfaceNoise', 1, false),
    })
    expect(Array.from(disabled.geometries[0].attributes.position.array)).toEqual(
      Array.from(base.geometries[0].attributes.position.array),
    )
  })

  it('keeps surface noise deterministic and shared across duplicate XY coordinates', () => {
    const base = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 20,
      displacementSubdivisionLevel: 2,
    })
    const options = {
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 20,
      displacementSubdivisionLevel: 2,
      deform: deformWith('surfaceNoise', 1),
    }
    const first = createCharacterMeshGeometries(options)
    const second = createCharacterMeshGeometries(options)
    const deltasByXY = new Map<string, number>()
    const noisyPosition = first.geometries[0].attributes.position
    const basePosition = base.geometries[0].attributes.position

    expect(Array.from(first.geometries[0].attributes.position.array)).toEqual(
      Array.from(second.geometries[0].attributes.position.array),
    )
    for (let index = 0; index < noisyPosition.count; index += 1) {
      const key = `${basePosition.getX(index).toFixed(6)}:${basePosition.getY(index).toFixed(6)}`
      const delta = noisyPosition.getZ(index) - basePosition.getZ(index)
      const previous = deltasByXY.get(key)
      if (previous === undefined) {
        deltasByXY.set(key, delta)
      } else {
        expect(delta).toBeCloseTo(previous, 5)
      }
    }
  })

  it('auto-sizes subdivisions for animated Noise and nonlinear triggers', () => {
    const base = {
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 20,
    }
    const inactive0 = createCharacterMeshGeometries({ ...base, displacementSubdivisionLevel: 0 })
    const inactive1 = createCharacterMeshGeometries({ ...base, displacementSubdivisionLevel: 1 })
    const level2 = createCharacterMeshGeometries({ ...base, displacementSubdivisionLevel: 2 })
    const analytic0 = createCharacterMeshGeometries({
      ...base,
      displacementSubdivisionLevel: 0,
      deform: deformWith('squashStretch', 1),
    })
    const analytic1 = createCharacterMeshGeometries({
      ...base,
      displacementSubdivisionLevel: 1,
      deform: deformWith('squashStretch', 1),
    })
    const noiseOnly0 = createCharacterMeshGeometries({
      ...base,
      displacementSubdivisionLevel: 0,
      deform: deformWith('surfaceNoise', 1),
    })
    const noiseOnly2 = createCharacterMeshGeometries({
      ...base,
      displacementSubdivisionLevel: 2,
      deform: deformWith('surfaceNoise', 1),
    })

    expect(inactive1.geometries[0].attributes.position.count).toBeGreaterThan(
      inactive0.geometries[0].attributes.position.count,
    )
    expect(analytic1.geometries[0].attributes.position.count).toBe(
      inactive1.geometries[0].attributes.position.count,
    )
    expect(analytic0.geometries[0].attributes.position.count).toBe(
      inactive0.geometries[0].attributes.position.count,
    )
    expect(noiseOnly0.geometries[0].attributes.position.count).toBe(
      inactive1.geometries[0].attributes.position.count,
    )
    expect(noiseOnly2.geometries[0].attributes.position.count).toBe(
      level2.geometries[0].attributes.position.count,
    )

    const squashWithFalloff = deformWith('squashStretch', 1)
    const nonuniformInflate = deformWith('inflate', 1)
    const triggers: Array<{
      name: string
      deform: typeof DEFAULT_CHARACTER_MESH_DEFORM
      twist?: number
      bend?: number
    }> = [
      {
        name: 'Bulge',
        deform: deformWith('bulgePinch', 1),
      },
      {
        name: 'Squash+falloff',
        deform: {
          ...squashWithFalloff,
          squashStretch: { ...squashWithFalloff.squashStretch, falloff: 1 },
        },
      },
      {
        name: 'Wave',
        deform: deformWith('wave', 1),
      },
      {
        name: 'nonuniform Inflate',
        deform: {
          ...nonuniformInflate,
          inflate: { ...nonuniformInflate.inflate, uniform: false },
        },
      },
      {
        name: 'Curl',
        deform: deformWith('curl', 90),
      },
      {
        name: 'Twist',
        deform: DEFAULT_CHARACTER_MESH_DEFORM,
        twist: 90,
      },
      {
        name: 'Bend',
        deform: DEFAULT_CHARACTER_MESH_DEFORM,
        bend: 70,
      },
    ]

    for (const trigger of triggers) {
      const combined = createCharacterMeshGeometries({
        ...base,
        displacementSubdivisionLevel: 0,
        twist: trigger.twist,
        bend: trigger.bend,
        deform: {
          ...DEFAULT_CHARACTER_MESH_DEFORM,
          ...trigger.deform,
          surfaceNoise: {
            ...DEFAULT_CHARACTER_MESH_DEFORM.surfaceNoise,
            enabled: true,
            amount: 1,
          },
        },
      })
      expect(combined.geometries[0].attributes.position.count, trigger.name).toBe(
        level2.geometries[0].attributes.position.count,
      )
    }

    const wave0 = createCharacterMeshGeometries({
      ...base,
      displacementSubdivisionLevel: 0,
      deform: deformWith('wave', 1),
    })
    expect(wave0.geometries[0].attributes.position.count).toBe(
      level2.geometries[0].attributes.position.count,
    )
  })

  it('increases geometry density when displacement subdivision is raised', () => {
    const base = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 20,
      displacementSubdivisionLevel: 0,
    })
    const subdivided = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 20,
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
      extrusionDepth: 20,
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
        extrusionDepth: 20,
      }),
    ).toThrow(/no drawable SVG shapes/i)
  })

  it('keeps neutral and disabled advanced signals exactly unchanged', () => {
    const base = createCharacterMeshGeometries({ shapes: [rectangleShape(500, 500)], extrusionDepth: 20 })
    const disabled = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 20,
      deform: deformWith('wave', 1, false),
    })
    const zero = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 20,
      deform: deformWith('wave', 0),
    })
    expect(positions(disabled)).toEqual(positions(base))
    expect(positions(zero)).toEqual(positions(base))
  })

  it('keeps GPU Noise settings out of static position buffers', () => {
    const options = {
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 20,
      displacementSubdivisionLevel: 2,
      deform: {
        ...DEFAULT_CHARACTER_MESH_DEFORM,
        surfaceNoise: {
          ...DEFAULT_CHARACTER_MESH_DEFORM.surfaceNoise,
          enabled: true,
          amount: 1,
        },
      },
    }
    const first = createCharacterMeshGeometries(options)
    const second = createCharacterMeshGeometries(options)
    const changedSeed = createCharacterMeshGeometries({
      ...options,
      deform: { ...options.deform, surfaceNoise: { ...options.deform.surfaceNoise, seed: 12 } },
    })
    const changedOffset = createCharacterMeshGeometries({
      ...options,
      deform: { ...options.deform, surfaceNoise: { ...options.deform.surfaceNoise, offsetX: 1 } },
    })
    expect(positions(first)).toEqual(positions(second))
    expect(positions(changedSeed)).toEqual(positions(first))
    expect(positions(changedOffset)).toEqual(positions(first))
    expect(Array.from(first.geometries[0].attributes.characterModelPosition.array)).toEqual(
      Array.from(changedSeed.geometries[0].attributes.characterModelPosition.array),
    )
  })

  it('authors stable GPU attributes and pads animated deform bounds once', () => {
    const result = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 20,
      displacementSubdivisionLevel: 2,
      deform: {
        ...DEFAULT_CHARACTER_MESH_DEFORM,
        surfaceNoise: {
          ...DEFAULT_CHARACTER_MESH_DEFORM.surfaceNoise,
          enabled: true,
          amount: 1,
          speed: 1,
        },
      },
    })
    const geometry = result.geometries[0]
    const positionAttribute = geometry.attributes.position as BufferAttribute
    const positionVersion = positionAttribute.version

    expect(result.gpuDeformActive).toBe(true)
    expect(geometry.attributes.characterModelPosition.count).toBe(geometry.attributes.position.count)
    expect(geometry.attributes.characterStableNormal.count).toBe(geometry.attributes.position.count)
    expect(geometry.boundingBox?.min.x).toBeCloseTo(-1.36, 6)
    expect(geometry.boundingBox?.max.x).toBeCloseTo(1.36, 6)
    expect(positionAttribute.version).toBe(positionVersion)
  })

  it('samples deterministic fBm noise with detail, roughness, scale and contrast controls', () => {
    expect(sampleCharacterMeshSurfaceNoise(0.25, -0.5, 7, 3, 0.65, 1.2)).toBeCloseTo(0.11326955, 6)
    expect(sampleCharacterMeshSurfaceNoise(0.25, -0.5, 7, 1, 0.65, 1)).not.toBe(
      sampleCharacterMeshSurfaceNoise(0.25, -0.5, 7, 4, 0.65, 1),
    )
    expect(sampleCharacterMeshSurfaceNoise(0.25, -0.5, 7, 3, 0, 1)).not.toBe(
      sampleCharacterMeshSurfaceNoise(0.25, -0.5, 7, 3, 0.9, 1),
    )
    expect(sampleCharacterMeshSurfaceNoise(0.25, -0.5, 7, 3, 0.65, 0.5)).not.toBe(
      sampleCharacterMeshSurfaceNoise(0.25, -0.5, 7, 3, 0.65, 1.5),
    )
  })

  it('authors averaged stable surface normals for GPU Noise at duplicate seams', () => {
    const baseOptions = {
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 20,
      displacementSubdivisionLevel: 2,
    }
    const radial = createCharacterMeshGeometries({
      ...baseOptions,
      deform: {
        ...DEFAULT_CHARACTER_MESH_DEFORM,
        surfaceNoise: { ...DEFAULT_CHARACTER_MESH_DEFORM.surfaceNoise, enabled: true, amount: 1, direction: 'radial' },
      },
    })
    const normal = createCharacterMeshGeometries({
      ...baseOptions,
      deform: {
        ...DEFAULT_CHARACTER_MESH_DEFORM,
        surfaceNoise: { ...DEFAULT_CHARACTER_MESH_DEFORM.surfaceNoise, enabled: true, amount: 1, direction: 'normal' },
      },
    })
    expect(positions(normal)).toEqual(positions(radial))

    const source = normal.geometries[0].attributes.characterModelPosition
    const stableNormal = normal.geometries[0].attributes.characterStableNormal
    const deltasBySourcePosition = new Map<string, [number, number, number]>()
    for (let index = 0; index < source.count; index += 1) {
      const key = `${source.getX(index).toFixed(6)}:${source.getY(index).toFixed(6)}:${source.getZ(index).toFixed(6)}`
      const delta: [number, number, number] = [
        stableNormal.getX(index),
        stableNormal.getY(index),
        stableNormal.getZ(index),
      ]
      const previous = deltasBySourcePosition.get(key)
      if (previous) {
        expect(delta[0]).toBeCloseTo(previous[0], 5)
        expect(delta[1]).toBeCloseTo(previous[1], 5)
        expect(delta[2]).toBeCloseTo(previous[2], 5)
      } else {
        deltasBySourcePosition.set(key, delta)
      }
    }
  })

  it('uses radial bulge falloff and leaves outside-radius vertices neutral', () => {
    const base = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 20,
      displacementSubdivisionLevel: 2,
    })
    const broad = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 20,
      displacementSubdivisionLevel: 2,
      deform: {
        ...DEFAULT_CHARACTER_MESH_DEFORM,
        bulgePinch: { ...DEFAULT_CHARACTER_MESH_DEFORM.bulgePinch, enabled: true, amount: 1, radius: 2 },
      },
    })
    const narrow = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 20,
      displacementSubdivisionLevel: 2,
      deform: {
        ...DEFAULT_CHARACTER_MESH_DEFORM,
        bulgePinch: { ...DEFAULT_CHARACTER_MESH_DEFORM.bulgePinch, enabled: true, amount: 1, radius: 0.05 },
      },
    })
    expect(maxPositionDelta(positions(broad), positions(base))).toBeGreaterThan(
      maxPositionDelta(positions(narrow), positions(base)),
    )
  })

  it('keeps Bulge axis and center semantics isolated to their selected coordinates', () => {
    const baseOptions = { shapes: [rectangleShape(500, 500)], extrusionDepth: 20, displacementSubdivisionLevel: 2 }
    const base = positions(createCharacterMeshGeometries(baseOptions))
    const xAxis = positions(createCharacterMeshGeometries({
      ...baseOptions,
      deform: { ...DEFAULT_CHARACTER_MESH_DEFORM, bulgePinch: { ...DEFAULT_CHARACTER_MESH_DEFORM.bulgePinch, enabled: true, amount: 1, axis: 'x', radius: 2 } },
    }))
    const yAxis = positions(createCharacterMeshGeometries({
      ...baseOptions,
      deform: { ...DEFAULT_CHARACTER_MESH_DEFORM, bulgePinch: { ...DEFAULT_CHARACTER_MESH_DEFORM.bulgePinch, enabled: true, amount: 1, axis: 'y', radius: 2 } },
    }))
    const xDeltas = axisDeltas(base, xAxis)
    const yDeltas = axisDeltas(base, yAxis)
    expect(Math.max(...xDeltas.y.map(Math.abs))).toBe(0)
    expect(Math.max(...xDeltas.z.map(Math.abs))).toBe(0)
    expect(Math.max(...yDeltas.x.map(Math.abs))).toBe(0)
    expect(Math.max(...yDeltas.z.map(Math.abs))).toBe(0)

    const centeredIndex = base.findIndex((value, index) => index % 3 === 0
      && Math.abs(value) < 1e-6
      && Math.abs(base[index + 1]) < 1e-6)
    expect(centeredIndex).toBeGreaterThanOrEqual(0)
    expect(xAxis[centeredIndex]).toBeCloseTo(base[centeredIndex], 6)
    expect(xAxis[centeredIndex + 1]).toBeCloseTo(base[centeredIndex + 1], 6)
  })

  it('supports Squash axis, pivot, local falloff, preserve volume and secondary scale', () => {
    const baseOptions = { shapes: [rectangleShape(500, 500)], extrusionDepth: 20, displacementSubdivisionLevel: 2 }
    const base = positions(createCharacterMeshGeometries(baseOptions))
    const xAxis = positions(createCharacterMeshGeometries({
      ...baseOptions,
      deform: { ...DEFAULT_CHARACTER_MESH_DEFORM, squashStretch: { ...DEFAULT_CHARACTER_MESH_DEFORM.squashStretch, enabled: true, amount: 1, axis: 'x', preserveVolume: false, secondaryScale: 1 } },
    }))
    const xDeltas = axisDeltas(base, xAxis)
    expect(Math.max(...xDeltas.y.map(Math.abs))).toBe(0)
    expect(Math.max(...xDeltas.z.map(Math.abs))).toBe(0)

    const local = positions(createCharacterMeshGeometries({
      ...baseOptions,
      deform: { ...DEFAULT_CHARACTER_MESH_DEFORM, squashStretch: { ...DEFAULT_CHARACTER_MESH_DEFORM.squashStretch, enabled: true, amount: 1, axis: 'y', pivot: -1, falloff: 0.1 } },
    }))
    const localDeltas = axisDeltas(base, local)
    const farFromPivot = base.reduce<number[]>((indexes, value, index) => {
      if (index % 3 === 1 && value > 0.5) indexes.push(index)
      return indexes
    }, [])
    expect(farFromPivot.length).toBeGreaterThan(0)
    expect(Math.max(...farFromPivot.map((index) => Math.abs(localDeltas.y[Math.floor(index / 3)])))).toBe(0)

    const preserve = positions(createCharacterMeshGeometries({
      ...baseOptions,
      deform: { ...DEFAULT_CHARACTER_MESH_DEFORM, squashStretch: { ...DEFAULT_CHARACTER_MESH_DEFORM.squashStretch, enabled: true, amount: 1, preserveVolume: true } },
    }))
    const secondary = positions(createCharacterMeshGeometries({
      ...baseOptions,
      deform: { ...DEFAULT_CHARACTER_MESH_DEFORM, squashStretch: { ...DEFAULT_CHARACTER_MESH_DEFORM.squashStretch, enabled: true, amount: 1, preserveVolume: false, secondaryScale: 2 } },
    }))
    expect(secondary).not.toEqual(preserve)
  })

  it('keeps GPU Wave settings out of static position buffers', () => {
    const baseOptions = { shapes: [rectangleShape(500, 500)], extrusionDepth: 20, displacementSubdivisionLevel: 2 }
    const wave = (partial: Partial<typeof DEFAULT_CHARACTER_MESH_DEFORM.wave>) => positions(createCharacterMeshGeometries({
      ...baseOptions,
      deform: { ...DEFAULT_CHARACTER_MESH_DEFORM, wave: { ...DEFAULT_CHARACTER_MESH_DEFORM.wave, enabled: true, amplitude: 1, ...partial } },
    }))
    expect(wave({ direction: 'x' })).toEqual(wave({ direction: 'y' }))
    expect(wave({ waveform: 'sine' })).toEqual(wave({ waveform: 'square' }))
    expect(wave({ phase: 90, speed: 20, decay: 1 })).toEqual(wave({ phase: 0, speed: 1, decay: 0 }))
  })

  it('keeps squash amount zero neutral and matches Curl angle 360 to one turn', () => {
    const base = { shapes: [rectangleShape(500, 500)], extrusionDepth: 20, displacementSubdivisionLevel: 2 }
    const neutralSquash = createCharacterMeshGeometries({
      ...base,
      deform: { ...DEFAULT_CHARACTER_MESH_DEFORM, squashStretch: { ...DEFAULT_CHARACTER_MESH_DEFORM.squashStretch, enabled: true, amount: 0, pivot: 0.4 } },
    })
    const angle = createCharacterMeshGeometries({
      ...base,
      deform: { ...DEFAULT_CHARACTER_MESH_DEFORM, curl: { ...DEFAULT_CHARACTER_MESH_DEFORM.curl, enabled: true, angle: 360 } },
    })
    const turn = createCharacterMeshGeometries({
      ...base,
      deform: { ...DEFAULT_CHARACTER_MESH_DEFORM, curl: { ...DEFAULT_CHARACTER_MESH_DEFORM.curl, enabled: true, turns: 1 } },
    })
    const negativeAngle = createCharacterMeshGeometries({
      ...base,
      deform: { ...DEFAULT_CHARACTER_MESH_DEFORM, curl: { ...DEFAULT_CHARACTER_MESH_DEFORM.curl, enabled: true, angle: -360 } },
    })
    const negativeTurn = createCharacterMeshGeometries({
      ...base,
      deform: { ...DEFAULT_CHARACTER_MESH_DEFORM, curl: { ...DEFAULT_CHARACTER_MESH_DEFORM.curl, enabled: true, turns: -1 } },
    })
    expect(positions(neutralSquash)).toEqual(positions(createCharacterMeshGeometries(base)))
    expect(positions(angle)).toEqual(positions(turn))
    expect(positions(negativeAngle)).toEqual(positions(negativeTurn))
  })

  it('keeps uniform Inflate independent of its center and radius controls', () => {
    const base = { shapes: [rectangleShape(500, 500)], extrusionDepth: 20, displacementSubdivisionLevel: 1 }
    const first = createCharacterMeshGeometries({
      ...base,
      deform: { ...DEFAULT_CHARACTER_MESH_DEFORM, inflate: { ...DEFAULT_CHARACTER_MESH_DEFORM.inflate, enabled: true, amount: 1, uniform: true, centerX: -1, centerY: -1, radius: 0.05 } },
    })
    const second = createCharacterMeshGeometries({
      ...base,
      deform: { ...DEFAULT_CHARACTER_MESH_DEFORM, inflate: { ...DEFAULT_CHARACTER_MESH_DEFORM.inflate, enabled: true, amount: 1, uniform: true, centerX: 1, centerY: 1, radius: 2 } },
    })
    expect(positions(first)).toEqual(positions(second))
  })

  it('anchors Inflate balance, deflate sign, falloff and nonuniform cutoff', () => {
    const baseOptions = { shapes: [rectangleShape(500, 500)], extrusionDepth: 20, displacementSubdivisionLevel: 2 }
    const base = positions(createCharacterMeshGeometries(baseOptions))
    const depthOnly = positions(createCharacterMeshGeometries({
      ...baseOptions,
      deform: { ...DEFAULT_CHARACTER_MESH_DEFORM, inflate: { ...DEFAULT_CHARACTER_MESH_DEFORM.inflate, enabled: true, amount: 1, balance: 1 } },
    }))
    const xyOnly = positions(createCharacterMeshGeometries({
      ...baseOptions,
      deform: { ...DEFAULT_CHARACTER_MESH_DEFORM, inflate: { ...DEFAULT_CHARACTER_MESH_DEFORM.inflate, enabled: true, amount: 1, balance: 0 } },
    }))
    const depthDeltas = axisDeltas(base, depthOnly)
    const xyDeltas = axisDeltas(base, xyOnly)
    expect(Math.max(...depthDeltas.x.map(Math.abs))).toBe(0)
    expect(Math.max(...depthDeltas.y.map(Math.abs))).toBe(0)
    expect(Math.max(...xyDeltas.z.map(Math.abs))).toBe(0)

    const deflated = positions(createCharacterMeshGeometries({
      ...baseOptions,
      deform: { ...DEFAULT_CHARACTER_MESH_DEFORM, inflate: { ...DEFAULT_CHARACTER_MESH_DEFORM.inflate, enabled: true, amount: 1, balance: 0, deflate: true } },
    }))
    const deflateDeltas = axisDeltas(base, deflated)
    expect(deflateDeltas.x.some((delta, index) => delta * xyDeltas.x[index] < 0)).toBe(true)

    const cutoff = positions(createCharacterMeshGeometries({
      ...baseOptions,
      deform: { ...DEFAULT_CHARACTER_MESH_DEFORM, inflate: { ...DEFAULT_CHARACTER_MESH_DEFORM.inflate, enabled: true, amount: 1, uniform: false, radius: 0.2, falloff: 1, centerX: 0, centerY: 0 } },
    }))
    const cutoffPosition = base.findIndex((value, index) => index % 3 === 0
      && Math.abs(value) > 0.9
      && Math.abs(base[index + 1]) > 0.9)
    expect(cutoffPosition).toBeGreaterThanOrEqual(0)
    expect(cutoff[cutoffPosition]).toBeCloseTo(base[cutoffPosition], 6)
    expect(cutoff[cutoffPosition + 1]).toBeCloseTo(base[cutoffPosition + 1], 6)
  })

  it('anchors Curl axis planes, pivot with nonzero offset, tightness, falloff and clamp', () => {
    const baseOptions = { shapes: [rectangleShape(500, 500)], extrusionDepth: 20, displacementSubdivisionLevel: 2 }
    const base = positions(createCharacterMeshGeometries(baseOptions))
    const curl = (partial: Partial<typeof DEFAULT_CHARACTER_MESH_DEFORM.curl>) => positions(createCharacterMeshGeometries({
      ...baseOptions,
      deform: { ...DEFAULT_CHARACTER_MESH_DEFORM, curl: { ...DEFAULT_CHARACTER_MESH_DEFORM.curl, enabled: true, angle: 180, ...partial } },
    }))
    const xAxis = axisDeltas(base, curl({ axis: 'x' }))
    const yAxis = axisDeltas(base, curl({ axis: 'y' }))
    const zAxis = axisDeltas(base, curl({ axis: 'z' }))
    expect(Math.max(...xAxis.x.map(Math.abs))).toBe(0)
    expect(Math.max(...yAxis.y.map(Math.abs))).toBe(0)
    expect(Math.max(...zAxis.z.map(Math.abs))).toBe(0)

    const offset = curl({ pivot: 0, offset: 0.5 })
    const pivotIndex = base.findIndex((value, index) => index % 3 === 0
      && Math.abs(value) < 1e-6
      && Math.abs(base[index + 1]) < 1e-6)
    expect(pivotIndex).toBeGreaterThanOrEqual(0)
    expect(offset[pivotIndex]).toBeCloseTo(base[pivotIndex], 6)
    expect(offset[pivotIndex + 1]).toBeCloseTo(base[pivotIndex + 1], 6)

    expect(curl({ tightness: 0.5 })).not.toEqual(curl({ tightness: 2 }))
    expect(curl({ falloff: 1 })).not.toEqual(curl({ falloff: 0 }))
    expect(curl({ offset: 1, clamp: true })).not.toEqual(curl({ offset: 1, clamp: false }))
  })

  it('preserves longitudinal orientation while reversing Curl depth for negative angles', () => {
    const baseOptions = { shapes: [rectangleShape(500, 500)], extrusionDepth: 20, displacementSubdivisionLevel: 2 }
    const base = positions(createCharacterMeshGeometries(baseOptions))
    const curl = (angle: number) => positions(createCharacterMeshGeometries({
      ...baseOptions,
      deform: { ...DEFAULT_CHARACTER_MESH_DEFORM, curl: { ...DEFAULT_CHARACTER_MESH_DEFORM.curl, enabled: true, angle, axis: 'x' } },
    }))
    const positive = curl(120)
    const negative = curl(-120)

    for (let index = 0; index < base.length; index += 3) {
      expect(positive[index + 1]).toBeCloseTo(negative[index + 1], 6)
      const positiveDepthDelta = positive[index + 2] - base[index + 2]
      const negativeDepthDelta = negative[index + 2] - base[index + 2]
      expect(positiveDepthDelta + negativeDepthDelta).toBeCloseTo(0, 6)
    }
  })
})
