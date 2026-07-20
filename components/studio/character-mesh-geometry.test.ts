import { BufferAttribute, Shape, Vector3 } from 'three'
import { describe, expect, it, vi } from 'vitest'

import {
  MIN_CHARACTER_EXTRUSION_DEPTH,
  clampCharacterExtrusionDepth,
  createCharacterMeshGeometries,
  sampleCharacterMeshSurfaceNoise,
  updateCharacterMeshGeometryAnimation,
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

  it('adds real SVG extrusion bevel geometry when Model Bevel is raised', () => {
    const flat = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 0.2,
      bevel: 0,
    })
    const beveled = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 0.2,
      bevel: 0.08,
    })

    expect(beveled.geometries[0].attributes.position.count).toBeGreaterThan(
      flat.geometries[0].attributes.position.count,
    )
  })

  it('twists the extruded SVG around its Y axis', () => {
    const straight = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 250)],
      extrusionDepth: 0.4,
      twist: 0,
    })
    const twisted = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 250)],
      extrusionDepth: 0.4,
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
    const tapered = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 0.4,
      taper: 0.6,
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
      extrusionDepth: 0.2,
      bend: 0,
    })
    const bent = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 0.2,
      bend: 70,
    })

    expect(Array.from(bent.geometries[0].attributes.position.array)).not.toEqual(
      Array.from(flat.geometries[0].attributes.position.array),
    )
    expect(bent.boundsMax.z - bent.boundsMin.z).toBeGreaterThan(
      flat.boundsMax.z - flat.boundsMin.z,
    )
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

  it('applies each enabled Model Deform effect while disabled controls stay neutral', () => {
    const base = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 0.2,
    })
    const effects = [
      ['bulgePinch', 1],
      ['squashStretch', 1],
      ['wave', 1],
      ['surfaceNoise', 1],
      ['inflate', 1],
      ['curl', 90],
    ] as const

    for (const [key, amount] of effects) {
      const result = createCharacterMeshGeometries({
        shapes: [rectangleShape(500, 500)],
        extrusionDepth: 0.2,
        deform: deformWith(key, amount),
      })

      expect(Array.from(result.geometries[0].attributes.position.array)).not.toEqual(
        Array.from(base.geometries[0].attributes.position.array),
      )
    }

    const disabled = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 0.2,
      deform: deformWith('surfaceNoise', 1, false),
    })
    expect(Array.from(disabled.geometries[0].attributes.position.array)).toEqual(
      Array.from(base.geometries[0].attributes.position.array),
    )
  })

  it('keeps surface noise deterministic and shared across duplicate XY coordinates', () => {
    const base = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 0.2,
      displacementSubdivisionLevel: 2,
    })
    const options = {
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 0.2,
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
      extrusionDepth: 0.2,
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

  it('keeps neutral and disabled advanced signals exactly unchanged', () => {
    const base = createCharacterMeshGeometries({ shapes: [rectangleShape(500, 500)], extrusionDepth: 0.2 })
    const disabled = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 0.2,
      deform: deformWith('wave', 1, false),
    })
    const zero = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 0.2,
      deform: deformWith('wave', 0),
    })
    expect(positions(disabled)).toEqual(positions(base))
    expect(positions(zero)).toEqual(positions(base))
  })

  it('keeps surface noise deterministic while changing seed and lattice controls', () => {
    const options = {
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 0.2,
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
    expect(positions(changedSeed)).not.toEqual(positions(first))
    expect(positions(changedOffset)).not.toEqual(positions(first))
  })

  it('advances animated Noise in place, deterministically, and marks GPU positions dirty', () => {
    const result = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 0.2,
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
    const initial = positions(result)

    expect(result.animationData).toBeDefined()
    expect(updateCharacterMeshGeometryAnimation(result, 0)).toBe(false)
    expect(positions(result)).toEqual(initial)

    const positionAttribute = geometry.attributes.position as BufferAttribute
    const previousVersion = positionAttribute.version
    expect(updateCharacterMeshGeometryAnimation(result, 1)).toBe(true)
    const atOne = positions(result)
    expect(atOne).not.toEqual(initial)
    expect(positionAttribute.version).toBeGreaterThan(previousVersion)
    expect(updateCharacterMeshGeometryAnimation(result, 1)).toBe(false)

    expect(updateCharacterMeshGeometryAnimation(result, 0)).toBe(true)
    expect(positions(result)).toEqual(initial)
    expect(updateCharacterMeshGeometryAnimation(result, 1)).toBe(true)
    expect(positions(result)).toEqual(atOne)
  })

  it('pads animated Noise bounds once and avoids per-frame bounds recomputation', () => {
    const result = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 0.2,
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
    const boundingBox = geometry.boundingBox?.clone()
    const boundingSphere = geometry.boundingSphere?.clone()
    const unpaddedGeometry = geometry.clone()
    unpaddedGeometry.computeBoundingBox()
    unpaddedGeometry.computeBoundingSphere()
    const computeBoundingBox = vi.spyOn(geometry, 'computeBoundingBox')
    const computeBoundingSphere = vi.spyOn(geometry, 'computeBoundingSphere')

    expect(boundingBox).toBeDefined()
    expect(boundingSphere).toBeDefined()
    expect(boundingBox?.min.x).toBeCloseTo(unpaddedGeometry.boundingBox!.min.x - 0.2, 6)
    expect(boundingBox?.max.x).toBeCloseTo(unpaddedGeometry.boundingBox!.max.x + 0.2, 6)
    expect(boundingSphere?.radius).toBeCloseTo(unpaddedGeometry.boundingSphere!.radius + 0.2, 6)
    expect(updateCharacterMeshGeometryAnimation(result, 1)).toBe(true)
    expect(computeBoundingBox).not.toHaveBeenCalled()
    expect(computeBoundingSphere).not.toHaveBeenCalled()

    const position = geometry.attributes.position
    for (let index = 0; index < position.count; index += 1) {
      const point = new Vector3(position.getX(index), position.getY(index), position.getZ(index))
      expect(boundingBox?.containsPoint(point)).toBe(true)
      expect(boundingSphere?.distanceToPoint(point)).toBeLessThanOrEqual(
        (boundingSphere?.radius ?? 0) + 1e-6,
      )
    }
    unpaddedGeometry.dispose()
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

  it('uses averaged stable surface normals for Noise normal direction at duplicate seams', () => {
    const baseOptions = {
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 0.2,
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
    expect(positions(normal)).not.toEqual(positions(radial))

    const source = createCharacterMeshGeometries(baseOptions).geometries[0].attributes.position
    const noisy = normal.geometries[0].attributes.position
    const deltasBySourcePosition = new Map<string, [number, number, number]>()
    for (let index = 0; index < source.count; index += 1) {
      const key = `${source.getX(index).toFixed(6)}:${source.getY(index).toFixed(6)}:${source.getZ(index).toFixed(6)}`
      const delta: [number, number, number] = [
        noisy.getX(index) - source.getX(index),
        noisy.getY(index) - source.getY(index),
        noisy.getZ(index) - source.getZ(index),
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
      extrusionDepth: 0.2,
      displacementSubdivisionLevel: 2,
    })
    const broad = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 0.2,
      displacementSubdivisionLevel: 2,
      deform: {
        ...DEFAULT_CHARACTER_MESH_DEFORM,
        bulgePinch: { ...DEFAULT_CHARACTER_MESH_DEFORM.bulgePinch, enabled: true, amount: 1, radius: 2 },
      },
    })
    const narrow = createCharacterMeshGeometries({
      shapes: [rectangleShape(500, 500)],
      extrusionDepth: 0.2,
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
    const baseOptions = { shapes: [rectangleShape(500, 500)], extrusionDepth: 0.2, displacementSubdivisionLevel: 2 }
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
    const baseOptions = { shapes: [rectangleShape(500, 500)], extrusionDepth: 0.2, displacementSubdivisionLevel: 2 }
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

  it('supports Wave direction, waveform, phase, offset and edge decay', () => {
    const baseOptions = { shapes: [rectangleShape(500, 500)], extrusionDepth: 0.2, displacementSubdivisionLevel: 2 }
    const base = positions(createCharacterMeshGeometries(baseOptions))
    const wave = (partial: Partial<typeof DEFAULT_CHARACTER_MESH_DEFORM.wave>) => positions(createCharacterMeshGeometries({
      ...baseOptions,
      deform: { ...DEFAULT_CHARACTER_MESH_DEFORM, wave: { ...DEFAULT_CHARACTER_MESH_DEFORM.wave, enabled: true, amplitude: 1, ...partial } },
    }))
    expect(wave({ direction: 'x' })).not.toEqual(wave({ direction: 'y' }))
    expect(wave({ direction: 'diagonal' })).not.toEqual(wave({ direction: 'radial' }))
    expect(wave({ waveform: 'sine' })).not.toEqual(wave({ waveform: 'square' }))
    expect(wave({ phase: 90 })).not.toEqual(wave({ phase: 0 }))
    expect(wave({ offset: 0.25 })).not.toEqual(wave({ offset: 0 }))

    const decay = axisDeltas(base, wave({ decay: 1, direction: 'x', frequency: 0.5 }))
    const edgeMagnitudes: number[] = []
    const centerMagnitudes: number[] = []
    const source = base
    for (let index = 0; index < source.length; index += 3) {
      const x = Math.abs(source[index])
      if (x > 0.9) edgeMagnitudes.push(Math.abs(decay.z[index / 3]))
      if (x < 0.1) centerMagnitudes.push(Math.abs(decay.z[index / 3]))
    }
    expect(edgeMagnitudes.length).toBeGreaterThan(0)
    expect(centerMagnitudes.length).toBeGreaterThan(0)
    expect(Math.max(...edgeMagnitudes)).toBeLessThanOrEqual(Math.max(...centerMagnitudes))
  })

  it('keeps squash amount zero neutral and matches Curl angle 360 to one turn', () => {
    const base = { shapes: [rectangleShape(500, 500)], extrusionDepth: 0.2, displacementSubdivisionLevel: 2 }
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
    const base = { shapes: [rectangleShape(500, 500)], extrusionDepth: 0.2, displacementSubdivisionLevel: 1 }
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
    const baseOptions = { shapes: [rectangleShape(500, 500)], extrusionDepth: 0.2, displacementSubdivisionLevel: 2 }
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
    const baseOptions = { shapes: [rectangleShape(500, 500)], extrusionDepth: 0.2, displacementSubdivisionLevel: 2 }
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
    const baseOptions = { shapes: [rectangleShape(500, 500)], extrusionDepth: 0.2, displacementSubdivisionLevel: 2 }
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
