import {
  Box2,
  Box3,
  BufferAttribute,
  BufferGeometry,
  ExtrudeGeometry,
  Vector2,
  Vector3,
  type Shape,
} from 'three'
import {
  DEFAULT_CHARACTER_MESH_DEFORM,
  sanitizeCharacterMeshDeformSettings,
  type CharacterMeshLegacyDeformSettings,
  type CharacterMeshDeformSettings,
  type CharacterMeshBulgeProfile,
} from '@/components/studio/character-mesh-deform'

export const MIN_CHARACTER_EXTRUSION_DEPTH = 0.01
export const MIN_DISPLACEMENT_SUBDIVISION_LEVEL = 0
export const MAX_DISPLACEMENT_SUBDIVISION_LEVEL = 2
const CHARACTER_GPU_DEFORM_BOUNDS_PADDING = 0.36

export { DEFAULT_CHARACTER_MESH_DEFORM }

type CreateCharacterMeshGeometriesOptions = {
  shapes: Shape[]
  extrusionDepth: number
  thickness?: number
  bevel?: number
  twist?: number
  taper?: number
  bend?: number
  deform?: CharacterMeshDeformSettings | CharacterMeshLegacyDeformSettings
  displacementSubdivisionLevel?: number
}

export type CharacterMeshGeometryResult = {
  geometries: BufferGeometry[]
  boundsMin: Vector3
  boundsMax: Vector3
  shaderBoundsMin: Vector3
  shaderBoundsMax: Vector3
  gpuDeformActive: boolean
}

export function clampCharacterExtrusionDepth(extrusionDepth: number) {
  return Math.max(extrusionDepth, MIN_CHARACTER_EXTRUSION_DEPTH)
}

export function createCharacterMeshGeometries({
  shapes,
  extrusionDepth,
  thickness = 0,
  bevel = 0,
  twist = 0,
  taper = 0,
  bend = 0,
  deform = DEFAULT_CHARACTER_MESH_DEFORM,
  displacementSubdivisionLevel = 0,
}: CreateCharacterMeshGeometriesOptions): CharacterMeshGeometryResult {
  if (shapes.length === 0) {
    throw new Error('Character SVG contains no drawable SVG shapes.')
  }

  const safeDeform = sanitizeCharacterMeshDeformSettings(deform)
  const depth = clampCharacterExtrusionDepth(extrusionDepth)
  const safeBevel = Math.max(0, bevel)
  const sourceBevelSize = safeBevel * getShapeSpan(shapes) / 2
  let geometries: BufferGeometry[] = shapes.map(
    (shape) =>
      new ExtrudeGeometry(shape, {
        depth,
        steps: taper === 0 ? 1 : 8,
        bevelEnabled: safeBevel > 0,
        bevelSize: sourceBevelSize,
        bevelThickness: Math.min(safeBevel, depth / 2),
        bevelSegments: 2,
      }),
  )

  try {
    const sourceBounds = getCombinedBounds(geometries)
    const sourceSize = sourceBounds.getSize(new Vector3())
    const sourceCenter = sourceBounds.getCenter(new Vector3())
    const sourceSpan = Math.max(sourceSize.x, sourceSize.y)

    if (sourceSpan <= 0) {
      throw new Error('Character SVG contains no drawable SVG area.')
    }

    const xyScale = sourceSpan / 2

    for (const geometry of geometries) {
      normalizeGeometry(geometry, sourceCenter, xyScale, depth)
      applyCharacterMeshThickness(geometry, thickness)
    }

    const sourceDeformationBounds = getCombinedBounds(geometries)
    const requestedSubdivisionLevel = sanitizeDisplacementSubdivisionLevel(displacementSubdivisionLevel)
    const totalCurlDegrees = safeDeform.curl.angle + safeDeform.curl.turns * 360
    const bulgeSignal = safeDeform.bulgePinch.enabled ? safeDeform.bulgePinch.amount : 0
    const squashSignal = safeDeform.squashStretch.enabled ? safeDeform.squashStretch.amount : 0
    const waveSignal = safeDeform.wave.enabled ? safeDeform.wave.amplitude : 0
    const noiseSignal = safeDeform.surfaceNoise.enabled ? safeDeform.surfaceNoise.amount : 0
    const inflateSignal = safeDeform.inflate.enabled ? safeDeform.inflate.amount : 0
    const curlSignal = safeDeform.curl.enabled ? totalCurlDegrees : 0
    const advancedActive = bulgeSignal !== 0
      || squashSignal !== 0
      || waveSignal !== 0
      || noiseSignal !== 0
      || inflateSignal !== 0
      || curlSignal !== 0
    const gpuDeformActive = waveSignal !== 0 || noiseSignal !== 0
    const nonNoiseNonlinearActive = (
      bulgeSignal !== 0
      || (squashSignal !== 0 && safeDeform.squashStretch.falloff > 0)
      || waveSignal !== 0
      || (inflateSignal !== 0 && !safeDeform.inflate.uniform)
      || curlSignal !== 0
    )
    const noiseOnlyAnimatedActive = noiseSignal !== 0
      && safeDeform.surfaceNoise.speed > 0
      && !nonNoiseNonlinearActive
      && twist === 0
      && bend === 0
    const autoSubdivisionLevel = noiseOnlyAnimatedActive
      ? 1
      : nonNoiseNonlinearActive || noiseSignal !== 0 || twist !== 0 || bend !== 0
        ? 2
        : 0
    const subdivisionLevel = Math.max(requestedSubdivisionLevel, autoSubdivisionLevel)
    geometries = geometries.map((geometry) =>
      subdivideGeometryTriangles(
        geometry,
        subdivisionLevel,
      ),
    )

    const stableBounds = advancedActive ? getCombinedBounds(geometries) : sourceDeformationBounds
    const stableSamples = advancedActive
      ? captureStableSamples(geometries, stableBounds)
      : undefined

    for (const geometry of geometries) {
      applyCharacterMeshDeformation(
        geometry,
        depth,
        twist,
        taper,
        bend,
        stableBounds.min.y,
        stableBounds.max.y,
      )
    }

    if (advancedActive && stableSamples) {
      geometries.forEach((geometry, geometryIndex) => {
        applyCharacterMeshDeformations(
          geometry,
          safeDeform,
          stableSamples[geometryIndex],
          stableBounds,
        )
        if (gpuDeformActive) {
          assignCharacterMeshGpuDeformAttributes(geometry, stableSamples[geometryIndex])
        }
      })
      for (const geometry of geometries) {
        geometry.computeVertexNormals()
        geometry.computeBoundingBox()
        geometry.computeBoundingSphere()
      }
    }

    const normalizedBounds = getCombinedBounds(geometries)
    const boundsMin = roundVector(normalizedBounds.min)
    const boundsMax = roundVector(normalizedBounds.max)
    const shaderBounds = getAspectPreservingShaderBounds(boundsMin, boundsMax)

    for (const geometry of geometries) {
      assignCharacterMeshUvs(
        geometry,
        shaderBounds.min,
        shaderBounds.max,
        boundsMin,
        boundsMax,
      )
    }

    if (gpuDeformActive) {
      for (const geometry of geometries) {
        geometry.boundingBox?.expandByScalar(CHARACTER_GPU_DEFORM_BOUNDS_PADDING)
        if (geometry.boundingSphere) {
          geometry.boundingSphere.radius += CHARACTER_GPU_DEFORM_BOUNDS_PADDING
        }
      }
    }

    return {
      geometries,
      boundsMin,
      boundsMax,
      shaderBoundsMin: shaderBounds.min,
      shaderBoundsMax: shaderBounds.max,
      gpuDeformActive,
    }
  } catch (error) {
    disposeGeometries(geometries)
    throw error
  }
}

function applyCharacterMeshDeformation(
  geometry: BufferGeometry,
  depth: number,
  twistDegrees: number,
  taper: number,
  bendDegrees: number,
  twistMinY: number,
  twistMaxY: number,
) {
  if (twistDegrees === 0 && taper === 0 && bendDegrees === 0) {
    return
  }

  const position = geometry.attributes.position
  const twistRadians = (twistDegrees * Math.PI) / 180
  const bendRadians = (bendDegrees * Math.PI) / 180
  const bendRadius = bendRadians === 0 ? 0 : 2 / Math.abs(bendRadians)
  const bendDirection = Math.sign(bendRadians)
  const twistSpanY = Math.max(twistMaxY - twistMinY, Number.EPSILON)

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const depthPosition = z / Math.max(depth, MIN_CHARACTER_EXTRUSION_DEPTH)
    const twistPosition = (y - twistMinY) / twistSpanY
    const angle = twistRadians * twistPosition
    const cosine = Math.cos(angle)
    const sine = Math.sin(angle)
    const taperedScale = Math.max(0.15, 1 + taper * depthPosition)
    const taperedX = x * taperedScale
    const twistedX = taperedX * cosine + z * sine
    const twistedY = y * taperedScale
    const twistedZ = -taperedX * sine + z * cosine
    const bendAngle = bendRadians * twistedX / 2
    const bentX = bendRadians === 0
      ? twistedX
      : Math.sin(bendAngle) * bendRadius
    const bentZ = bendRadians === 0
      ? twistedZ
      : twistedZ + (1 - Math.cos(bendAngle)) * bendRadius * bendDirection

    position.setXYZ(
      index,
      bentX,
      twistedY,
      bentZ,
    )
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
}

const STABLE_SAMPLE_STRIDE = 6

function captureStableSamples(geometries: BufferGeometry[], bounds: Box3): Float32Array[] {
  const center = bounds.getCenter(new Vector3())
  const size = bounds.getSize(new Vector3())
  const halfX = Math.max(size.x / 2, Number.EPSILON)
  const halfY = Math.max(size.y / 2, Number.EPSILON)
  const halfZ = Math.max(size.z / 2, Number.EPSILON)
  const samples = geometries.map((geometry) => new Float32Array(geometry.attributes.position.count * STABLE_SAMPLE_STRIDE))
  const normalSums = new Map<string, [number, number, number, number]>()

  geometries.forEach((geometry, geometryIndex) => {
    const position = geometry.attributes.position
    const normal = geometry.attributes.normal
    const packed = samples[geometryIndex]

    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index)
      const y = position.getY(index)
      const z = position.getZ(index)
      const offset = index * STABLE_SAMPLE_STRIDE
      packed[offset] = (x - center.x) / halfX
      packed[offset + 1] = (y - center.y) / halfY
      packed[offset + 2] = clamp((z - center.z) / halfZ, -1, 1)

      const key = stablePositionKey(x, y, z)
      const sum = normalSums.get(key) ?? [0, 0, 0, 0]
      sum[0] += normal.getX(index)
      sum[1] += normal.getY(index)
      sum[2] += normal.getZ(index)
      sum[3] += 1
      normalSums.set(key, sum)
    }
  })

  geometries.forEach((geometry, geometryIndex) => {
    const position = geometry.attributes.position
    const packed = samples[geometryIndex]

    for (let index = 0; index < position.count; index += 1) {
      const offset = index * STABLE_SAMPLE_STRIDE
      const sum = normalSums.get(stablePositionKey(
        position.getX(index),
        position.getY(index),
        position.getZ(index),
      ))
      const normalLength = sum
        ? Math.hypot(sum[0], sum[1], sum[2])
        : 0
      if (!sum || normalLength <= Number.EPSILON) {
        packed[offset + 3] = 0
        packed[offset + 4] = 0
        packed[offset + 5] = 1
      } else {
        packed[offset + 3] = sum[0] / normalLength
        packed[offset + 4] = sum[1] / normalLength
        packed[offset + 5] = sum[2] / normalLength
      }
    }
  })

  return samples
}

function assignCharacterMeshGpuDeformAttributes(
  geometry: BufferGeometry,
  stableSamples: Float32Array,
) {
  const modelPositions = new Float32Array(geometry.attributes.position.count * 3)
  const stableNormals = new Float32Array(geometry.attributes.position.count * 3)
  for (let index = 0; index < geometry.attributes.position.count; index += 1) {
    const sampleOffset = index * STABLE_SAMPLE_STRIDE
    const attributeOffset = index * 3
    modelPositions[attributeOffset] = stableSamples[sampleOffset]
    modelPositions[attributeOffset + 1] = stableSamples[sampleOffset + 1]
    modelPositions[attributeOffset + 2] = stableSamples[sampleOffset + 2]
    stableNormals[attributeOffset] = stableSamples[sampleOffset + 3]
    stableNormals[attributeOffset + 1] = stableSamples[sampleOffset + 4]
    stableNormals[attributeOffset + 2] = stableSamples[sampleOffset + 5]
  }
  geometry.setAttribute('characterModelPosition', new BufferAttribute(modelPositions, 3))
  geometry.setAttribute('characterStableNormal', new BufferAttribute(stableNormals, 3))
}

function applyCharacterMeshDeformations(
  geometry: BufferGeometry,
  deform: CharacterMeshDeformSettings,
  stableSamples: Float32Array,
  bounds: Box3,
) {
  const position = geometry.attributes.position
  const center = bounds.getCenter(new Vector3())
  const size = bounds.getSize(new Vector3())
  const halfX = Math.max(size.x / 2, Number.EPSILON)
  const halfY = Math.max(size.y / 2, Number.EPSILON)
  const halfZ = Math.max(size.z / 2, Number.EPSILON)
  const totalCurlDegrees = deform.curl.angle + deform.curl.turns * 360

  for (let index = 0; index < position.count; index += 1) {
    const stableOffset = index * STABLE_SAMPLE_STRIDE
    const u = stableSamples[stableOffset]
    const v = stableSamples[stableOffset + 1]
    const w = stableSamples[stableOffset + 2]
    let x = position.getX(index)
    let y = position.getY(index)
    let z = position.getZ(index)

    if (deform.bulgePinch.enabled && deform.bulgePinch.amount !== 0) {
      const { amount, radius, falloff, centerX, centerY, axis, profile } = deform.bulgePinch
      const dx = u - centerX
      const dy = v - centerY
      const distance = axis === 'radial' ? Math.hypot(dx, dy) : axis === 'x' ? Math.abs(dy) : Math.abs(dx)
      const weight = profileWeight(distance, radius, falloff, profile)
      const scale = Math.max(0.15, 1 + amount * 0.35 * weight)
      if (axis === 'radial' || axis === 'x') {
        x += dx * halfX * (scale - 1)
      }
      if (axis === 'radial' || axis === 'y') {
        y += dy * halfY * (scale - 1)
      }
    }

    if (deform.squashStretch.enabled && deform.squashStretch.amount !== 0) {
      const { amount, axis, pivot, preserveVolume, secondaryScale, falloff } = deform.squashStretch
      const selected = axis === 'x' ? u : axis === 'y' ? v : w
      const half = axis === 'x' ? halfX : axis === 'y' ? halfY : halfZ
      const pivotWorld = (axis === 'x' ? center.x : axis === 'y' ? center.y : center.z) + pivot * half
      const weight = falloff === 0
        ? 1
        : 1 - smoothstep01(clamp(Math.abs(selected - pivot) / Math.max(falloff, Number.EPSILON), 0, 1))
      const selectedScale = clamp(1 + amount * 0.55, 0.45, 1.55)
      const localScale = 1 + (selectedScale - 1) * weight
      if (axis === 'x') x = pivotWorld + (x - pivotWorld) * localScale
      if (axis === 'y') y = pivotWorld + (y - pivotWorld) * localScale
      if (axis === 'z') z = pivotWorld + (z - pivotWorld) * localScale
      const secondary = preserveVolume
        ? 1 / Math.sqrt(Math.max(localScale, Number.EPSILON))
        : 1 + (secondaryScale - 1) * Math.abs(amount) * weight
      if (axis !== 'x') x = center.x + (x - center.x) * secondary
      if (axis !== 'y') y = center.y + (y - center.y) * secondary
      if (axis !== 'z') z = center.z + (z - center.z) * secondary
    }

    if (deform.inflate.enabled && deform.inflate.amount !== 0) {
      const { amount, balance, radius, falloff, centerX, centerY, uniform, deflate } = deform.inflate
      const sign = deflate ? -1 : 1
      const dx = uniform ? u : u - centerX
      const dy = uniform ? v : v - centerY
      const distance = Math.hypot(dx, dy)
      const weight = uniform ? 1 : profileWeight(distance, radius, falloff, 'smooth')
      const xyAmount = sign * amount * (1 - balance) * 0.16 * weight
      const depthAmount = sign * amount * balance * 0.8 * weight
      x += dx * halfX * xyAmount
      y += dy * halfY * xyAmount
      z += w * halfZ * depthAmount
    }

    if (deform.curl.enabled && totalCurlDegrees !== 0) {
      const { axis, tightness, pivot, offset, falloff, clamp: clampPhase } = deform.curl
      const isAxisX = axis === 'x'
      const isAxisY = axis === 'y'
      const q = isAxisX ? v : u
      const half = isAxisX ? halfY : halfX
      const baseQ = q - pivot
      const phaseCoordinate = clampPhase ? clamp(baseQ + offset, -1, 1) : baseQ + offset
      const baselineCoordinate = clampPhase ? clamp(offset, -1, 1) : offset
      const envelope = (value: number) => (1 - falloff) + falloff * (1 - smoothstep01(clamp(Math.abs(value), 0, 1)))
      const curlSign = Math.sign(totalCurlDegrees)
      const curlRadians = Math.abs(totalCurlDegrees * Math.PI / 180)
      const phase = (value: number) => curlRadians * 0.5 * value * envelope(value)
      const theta = phase(phaseCoordinate)
      const theta0 = phase(baselineCoordinate)
      const radius = (2 * half / Math.max(curlRadians, Number.EPSILON)) / tightness
      const flatLongitudinal = baseQ * half
      const curvedLongitudinal = (Math.sin(theta) - Math.sin(theta0)) * radius
      const curvedDepth = (Math.cos(theta0) - Math.cos(theta)) * radius * curlSign
      const longitudinalDelta = curvedLongitudinal - flatLongitudinal
      if (isAxisX) {
        y += longitudinalDelta
        z += curvedDepth
      } else if (isAxisY) {
        x += longitudinalDelta
        z += curvedDepth
      } else {
        x += longitudinalDelta
        y += curvedDepth
      }
    }

    position.setXYZ(index, x, y, z)
  }

  position.needsUpdate = true
}

function profileWeight(distance: number, radius: number, falloff: number, profile: CharacterMeshBulgeProfile) {
  const t = clamp(distance / Math.max(radius, Number.EPSILON), 0, 1)
  const smooth = 1 - t * t * (3 - 2 * t)
  const profileValue = profile === 'sharp'
    ? 1 - t
    : profile === 'gaussian'
      ? (Math.exp(-4 * t * t) - Math.exp(-4)) / (1 - Math.exp(-4))
      : smooth
  return Math.max(profileValue, 0) ** (0.5 + 3.5 * falloff)
}

function smoothstep01(value: number) {
  const t = clamp(value, 0, 1)
  return t * t * (3 - 2 * t)
}

export function sampleCharacterMeshSurfaceNoise(
  x: number,
  y: number,
  seed: number,
  detail: number,
  roughness: number,
  contrast: number,
) {
  return signedPower(fbmNoise(x, y, seed, detail, roughness), 2 ** (contrast - 1))
}

function fbmNoise(x: number, y: number, seed: number, detail: number, roughness: number) {
  let frequency = 1
  let amplitude = 1
  let total = 0
  let amplitudeTotal = 0
  for (let octave = 0; octave < detail; octave += 1) {
    total += valueNoise(x * frequency, y * frequency, seed) * amplitude
    amplitudeTotal += amplitude
    frequency *= 2
    amplitude *= roughness
  }
  return amplitudeTotal > Number.EPSILON ? total / amplitudeTotal : 0
}

function valueNoise(x: number, y: number, seed: number) {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const tx = smoothstep01(x - x0)
  const ty = smoothstep01(y - y0)
  const n00 = latticeNoise(x0, y0, seed)
  const n10 = latticeNoise(x0 + 1, y0, seed)
  const n01 = latticeNoise(x0, y0 + 1, seed)
  const n11 = latticeNoise(x0 + 1, y0 + 1, seed)
  return lerp(lerp(n00, n10, tx), lerp(n01, n11, tx), ty)
}

function latticeNoise(x: number, y: number, seed: number) {
  return fract(Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123) * 2 - 1
}

function signedPower(value: number, exponent: number) {
  return Math.sign(value) * Math.abs(value) ** exponent
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function fract(value: number) {
  return value - Math.floor(value)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getShapeSpan(shapes: Shape[]) {
  const bounds = new Box2()

  for (const shape of shapes) {
    for (const point of shape.getPoints()) {
      bounds.expandByPoint(new Vector2(point.x, point.y))
    }
  }

  const size = bounds.getSize(new Vector2())
  return Math.max(size.x, size.y, 1)
}

export function sanitizeDisplacementSubdivisionLevel(value: number) {
  if (!Number.isFinite(value)) {
    return MIN_DISPLACEMENT_SUBDIVISION_LEVEL
  }

  return Math.trunc(
    Math.min(
      MAX_DISPLACEMENT_SUBDIVISION_LEVEL,
      Math.max(MIN_DISPLACEMENT_SUBDIVISION_LEVEL, value),
    ),
  )
}

function applyCharacterMeshThickness(
  geometry: BufferGeometry,
  thickness: number,
) {
  if (thickness === 0) {
    return
  }

  const position = geometry.attributes.position
  const normal = geometry.attributes.normal
  const sideNormals = new Map<string, { x: number; y: number; count: number }>()

  for (let index = 0; index < position.count; index += 1) {
    if (Math.abs(normal.getZ(index)) >= 0.5) {
      continue
    }

    const key = xyKey(position.getX(index), position.getY(index))
    const current = sideNormals.get(key) ?? { x: 0, y: 0, count: 0 }
    current.x += normal.getX(index)
    current.y += normal.getY(index)
    current.count += 1
    sideNormals.set(key, current)
  }

  for (let index = 0; index < position.count; index += 1) {
    const key = xyKey(position.getX(index), position.getY(index))
    const offset = sideNormals.get(key)

    if (!offset || offset.count === 0) {
      continue
    }

    const length = Math.hypot(offset.x, offset.y) || 1

    position.setXY(
      index,
      position.getX(index) - (offset.x / length) * thickness,
      position.getY(index) - (offset.y / length) * thickness,
    )
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
}

function assignCharacterMeshUvs(
  geometry: BufferGeometry,
  shaderBoundsMin: Vector3,
  shaderBoundsMax: Vector3,
  boundsMin: Vector3,
  boundsMax: Vector3,
) {
  const position = geometry.attributes.position
  const normal = geometry.attributes.normal
  const boundsSize = shaderBoundsMax.clone().sub(shaderBoundsMin)
  const zSize = Math.max(boundsMax.z - boundsMin.z, 0.0001)
  const uvs = new Float32Array(position.count * 2)

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const uvIndex = index * 2

    if (Math.abs(normal.getZ(index)) >= 0.5) {
      uvs[uvIndex] = normalizeUv(x, shaderBoundsMin.x, boundsSize.x)
      uvs[uvIndex + 1] = normalizeUv(y, shaderBoundsMin.y, boundsSize.y)
      continue
    }

    const followsY = Math.abs(normal.getX(index)) >= Math.abs(normal.getY(index))
    uvs[uvIndex] = followsY
      ? normalizeUv(y, shaderBoundsMin.y, boundsSize.y)
      : normalizeUv(x, shaderBoundsMin.x, boundsSize.x)
    uvs[uvIndex + 1] = normalizeUv(z, boundsMin.z, zSize)
  }

  geometry.setAttribute('uv', new BufferAttribute(uvs, 2))
}

function normalizeGeometry(
  geometry: BufferGeometry,
  sourceCenter: Vector3,
  xyScale: number,
  depth: number,
) {
  const position = geometry.attributes.position

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)

    position.setXYZ(
      index,
      (x - sourceCenter.x) / xyScale,
      -(y - sourceCenter.y) / xyScale,
      z - depth / 2,
    )
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
}

function subdivideGeometryTriangles(
  geometry: BufferGeometry,
  subdivisionLevel: number,
) {
  if (subdivisionLevel <= 0) {
    return geometry
  }

  const sourceGeometry = geometry.index ? geometry.toNonIndexed() : geometry
  const position = sourceGeometry.attributes.position
  const vertices: number[] = []

  for (let index = 0; index < position.count; index += 3) {
    pushSubdividedTriangle(
      vertices,
      readPosition(position, index),
      readPosition(position, index + 1),
      readPosition(position, index + 2),
      subdivisionLevel,
    )
  }

  const subdividedGeometry = new BufferGeometry()
  subdividedGeometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array(vertices), 3),
  )
  subdividedGeometry.computeVertexNormals()
  subdividedGeometry.computeBoundingBox()
  subdividedGeometry.computeBoundingSphere()

  if (sourceGeometry !== geometry) {
    sourceGeometry.dispose()
  }

  geometry.dispose()

  return subdividedGeometry
}

function pushSubdividedTriangle(
  vertices: number[],
  a: Vector3,
  b: Vector3,
  c: Vector3,
  depth: number,
) {
  if (depth <= 0) {
    pushTriangle(vertices, a, b, c)
    return
  }

  const ab = midpoint(a, b)
  const bc = midpoint(b, c)
  const ca = midpoint(c, a)

  pushSubdividedTriangle(vertices, a, ab, ca, depth - 1)
  pushSubdividedTriangle(vertices, ab, b, bc, depth - 1)
  pushSubdividedTriangle(vertices, ca, bc, c, depth - 1)
  pushSubdividedTriangle(vertices, ab, bc, ca, depth - 1)
}

function pushTriangle(vertices: number[], a: Vector3, b: Vector3, c: Vector3) {
  vertices.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z)
}

type ReadablePositionAttribute = {
  getX: (index: number) => number
  getY: (index: number) => number
  getZ: (index: number) => number
}

function readPosition(position: ReadablePositionAttribute, index: number) {
  return new Vector3(position.getX(index), position.getY(index), position.getZ(index))
}

function midpoint(a: Vector3, b: Vector3) {
  return new Vector3((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2)
}

function getCombinedBounds(geometries: BufferGeometry[]) {
  const bounds = new Box3()

  for (const geometry of geometries) {
    geometry.computeBoundingBox()

    if (geometry.boundingBox) {
      bounds.union(geometry.boundingBox)
    }
  }

  if (bounds.isEmpty()) {
    throw new Error('Character SVG contains no drawable SVG shapes.')
  }

  return bounds
}

function getAspectPreservingShaderBounds(boundsMin: Vector3, boundsMax: Vector3) {
  const size = boundsMax.clone().sub(boundsMin)
  const squareSize = Math.max(size.x, size.y)
  const centerX = (boundsMin.x + boundsMax.x) / 2
  const centerY = (boundsMin.y + boundsMax.y) / 2
  const halfSize = squareSize / 2

  return {
    min: roundVector(
      new Vector3(centerX - halfSize, centerY - halfSize, boundsMin.z),
    ),
    max: roundVector(
      new Vector3(centerX + halfSize, centerY + halfSize, boundsMax.z),
    ),
  }
}

function disposeGeometries(geometries: BufferGeometry[]) {
  for (const geometry of geometries) {
    geometry.dispose()
  }
}

function roundVector(vector: Vector3) {
  return new Vector3(
    roundNumber(vector.x),
    roundNumber(vector.y),
    roundNumber(vector.z),
  )
}

function roundNumber(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000
}

function normalizeUv(value: number, min: number, size: number) {
  return Math.min(1, Math.max(0, (value - min) / Math.max(size, 0.0001)))
}

function xyKey(x: number, y: number) {
  return `${roundNumber(x)}:${roundNumber(y)}`
}

function stablePositionKey(x: number, y: number, z: number) {
  return `${roundNumber(x)}:${roundNumber(y)}:${roundNumber(z)}`
}
