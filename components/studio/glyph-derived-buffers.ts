import {
  ClampToEdgeWrapping,
  DataTexture,
  LinearFilter,
} from 'three'

export const GLYPH_DISTANCE_DEFAULT_MAX_RESOLUTION = 512

const ALPHA_THRESHOLD = 0.5
const DISTANCE_INF = 1_000_000

export type GlyphDerivedSample = {
  mask: number
  sdf: number
  edge: number
  insideDistance: number
  outsideDistance: number
  gradient: {
    x: number
    y: number
  }
  height: number
  normal: {
    x: number
    y: number
    z: number
  }
  flow: {
    x: number
    y: number
  }
  scatter: number
}

export type GlyphDistancePack = {
  available: boolean
  reason: string | null
  width: number
  height: number
  maxResolution: number
  textures: {
    mask: DataTexture
    sdf: DataTexture
    edge: DataTexture
    height: DataTexture
    normal: DataTexture
    flow: DataTexture
    scatter: DataTexture
  }
  samples: GlyphDerivedSample[]
}

export type GlyphAlphaSource = {
  alpha: Uint8ClampedArray
  width: number
  height: number
  maxResolution?: number
}

export function deriveGlyphDistancePackFromCanvas(
  canvas: HTMLCanvasElement,
  options: {
    maxResolution?: number
  } = {},
) {
  try {
    const context = canvas.getContext('2d', { willReadFrequently: true })

    if (!context) {
      return createFallbackGlyphDistancePack('Glyph buffer derivation could not read a 2D canvas context.')
    }

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    const alpha = new Uint8ClampedArray(canvas.width * canvas.height)

    for (let index = 0; index < alpha.length; index++) {
      alpha[index] = imageData.data[index * 4 + 3] ?? 0
    }

    return deriveGlyphDistancePackFromAlpha({
      alpha,
      width: canvas.width,
      height: canvas.height,
      maxResolution: options.maxResolution,
    })
  } catch (error) {
    return createFallbackGlyphDistancePack(
      error instanceof Error
        ? error.message
        : 'Glyph buffer derivation failed while reading mask pixels.',
    )
  }
}

export function deriveGlyphDistancePackFromAlpha({
  alpha,
  width,
  height,
  maxResolution = GLYPH_DISTANCE_DEFAULT_MAX_RESOLUTION,
}: GlyphAlphaSource): GlyphDistancePack {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return createFallbackGlyphDistancePack('Glyph alpha source must have positive dimensions.')
  }

  if (alpha.length !== width * height) {
    return createFallbackGlyphDistancePack('Glyph alpha source length does not match dimensions.')
  }

  const dimensions = getCappedDimensions(width, height, maxResolution)
  const mask = resizeAlphaMask(alpha, width, height, dimensions.width, dimensions.height)
  const inside = mask.map((value) => value >= ALPHA_THRESHOLD)
  const outsideDistance = euclideanDistanceToSeeds(dimensions.width, dimensions.height, inside)
  const outsideSeeds = inside.map((value) => !value)
  const insideDistance = euclideanDistanceToSeeds(dimensions.width, dimensions.height, outsideSeeds)
  const samples = buildDerivedSamples(dimensions.width, dimensions.height, mask, insideDistance, outsideDistance)

  return {
    available: true,
    reason: null,
    width: dimensions.width,
    height: dimensions.height,
    maxResolution: dimensions.maxResolution,
    textures: createTexturesFromSamples(samples, dimensions.width, dimensions.height),
    samples,
  }
}

export function createFallbackGlyphDistancePack(reason: string): GlyphDistancePack {
  return {
    available: false,
    reason,
    width: 1,
    height: 1,
    maxResolution: 1,
    textures: {
      mask: createTexture(new Uint8Array([0, 0, 0, 255]), 1, 1),
      sdf: createTexture(new Uint8Array([128, 128, 128, 255]), 1, 1),
      edge: createTexture(new Uint8Array([0, 0, 0, 255]), 1, 1),
      height: createTexture(new Uint8Array([0, 0, 0, 255]), 1, 1),
      normal: createTexture(new Uint8Array([128, 128, 255, 255]), 1, 1),
      flow: createTexture(new Uint8Array([128, 128, 0, 255]), 1, 1),
      scatter: createTexture(new Uint8Array([0, 0, 0, 255]), 1, 1),
    },
    samples: [
      {
        mask: 0,
        sdf: 0,
        edge: 0,
        insideDistance: 0,
        outsideDistance: 0,
        gradient: { x: 0, y: 0 },
        height: 0,
        normal: { x: 0, y: 0, z: 1 },
        flow: { x: 0, y: 0 },
        scatter: 0,
      },
    ],
  }
}

export function disposeGlyphDistancePack(pack: GlyphDistancePack) {
  for (const texture of Object.values(pack.textures)) {
    texture.dispose()
  }
}

function getCappedDimensions(width: number, height: number, maxResolution: number) {
  const boundedMaxResolution = Math.max(1, Math.floor(maxResolution))
  const scale = Math.min(1, boundedMaxResolution / Math.max(width, height))

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    maxResolution: boundedMaxResolution,
  }
}

function resizeAlphaMask(
  source: Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
) {
  const mask = new Array<number>(targetWidth * targetHeight)

  for (let y = 0; y < targetHeight; y++) {
    const sourceY = Math.min(sourceHeight - 1, Math.floor((y / targetHeight) * sourceHeight))

    for (let x = 0; x < targetWidth; x++) {
      const sourceX = Math.min(sourceWidth - 1, Math.floor((x / targetWidth) * sourceWidth))
      mask[x + y * targetWidth] = (source[sourceX + sourceY * sourceWidth] ?? 0) / 255
    }
  }

  return mask
}

function buildDerivedSamples(
  width: number,
  height: number,
  mask: number[],
  insideDistance: Float32Array,
  outsideDistance: Float32Array,
) {
  const samples = new Array<GlyphDerivedSample>(width * height)
  const signedDistances = new Float32Array(width * height)
  const heights = new Float32Array(width * height)
  const edgeSpread = Math.max(1.5, Math.min(width, height) * 0.08)
  const sdfSpread = Math.max(1, Math.max(width, height) * 0.25)

  for (let index = 0; index < samples.length; index++) {
    const signedDistance = insideDistance[index] - outsideDistance[index]
    const edge = 1 - clamp01(Math.abs(signedDistance) / edgeSpread)
    const heightValue = clamp01(mask[index] * 0.68 + edge * 0.32)

    signedDistances[index] = signedDistance
    heights[index] = heightValue
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = x + y * width
      const gradient = readGradient(signedDistances, width, height, x, y)
      const heightGradient = readGradient(heights, width, height, x, y)
      const flow = normalize2(gradient.x, gradient.y)
      const normal = normalize3(-heightGradient.x * 2, -heightGradient.y * 2, 1)
      const signedDistance = signedDistances[index]
      const edge = 1 - clamp01(Math.abs(signedDistance) / edgeSpread)

      samples[index] = {
        mask: mask[index],
        sdf: clampSigned(signedDistance / sdfSpread),
        edge,
        insideDistance: insideDistance[index],
        outsideDistance: outsideDistance[index],
        gradient,
        height: heights[index],
        normal,
        flow,
        scatter: hash01(x, y),
      }
    }
  }

  return samples
}

function euclideanDistanceToSeeds(width: number, height: number, seeds: boolean[]) {
  if (!seeds.some(Boolean)) {
    return new Float32Array(width * height).fill(Math.max(width, height))
  }

  const f = new Float32Array(width * height)
  const column = new Float32Array(height)
  const row = new Float32Array(width)
  const distance = new Float32Array(width * height)

  for (let index = 0; index < seeds.length; index++) {
    f[index] = seeds[index] ? 0 : DISTANCE_INF
  }

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      column[y] = f[x + y * width]
    }

    const transformed = distanceTransform1d(column)

    for (let y = 0; y < height; y++) {
      distance[x + y * width] = transformed[y]
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      row[x] = distance[x + y * width]
    }

    const transformed = distanceTransform1d(row)

    for (let x = 0; x < width; x++) {
      distance[x + y * width] = Math.sqrt(transformed[x])
    }
  }

  return distance
}

function distanceTransform1d(values: Float32Array) {
  const length = values.length
  const transformed = new Float32Array(length)
  const vertices = new Int32Array(length)
  const boundaries = new Float32Array(length + 1)
  let vertexCount = 0

  vertices[0] = 0
  boundaries[0] = Number.NEGATIVE_INFINITY
  boundaries[1] = Number.POSITIVE_INFINITY

  for (let q = 1; q < length; q++) {
    let intersection = intersectParabolas(values, vertices[vertexCount], q)

    while (intersection <= boundaries[vertexCount]) {
      vertexCount--
      intersection = intersectParabolas(values, vertices[vertexCount], q)
    }

    vertexCount++
    vertices[vertexCount] = q
    boundaries[vertexCount] = intersection
    boundaries[vertexCount + 1] = Number.POSITIVE_INFINITY
  }

  vertexCount = 0

  for (let q = 0; q < length; q++) {
    while (boundaries[vertexCount + 1] < q) {
      vertexCount++
    }

    const distance = q - vertices[vertexCount]
    transformed[q] = distance * distance + values[vertices[vertexCount]]
  }

  return transformed
}

function intersectParabolas(values: Float32Array, left: number, right: number) {
  return (
    (values[right] + right * right - (values[left] + left * left)) /
    (2 * right - 2 * left)
  )
}

function readGradient(values: Float32Array, width: number, height: number, x: number, y: number) {
  const left = values[Math.max(0, x - 1) + y * width]
  const right = values[Math.min(width - 1, x + 1) + y * width]
  const top = values[x + Math.max(0, y - 1) * width]
  const bottom = values[x + Math.min(height - 1, y + 1) * width]

  return {
    x: (right - left) * 0.5,
    y: (bottom - top) * 0.5,
  }
}

function createTexturesFromSamples(samples: GlyphDerivedSample[], width: number, height: number) {
  const mask = new Uint8Array(width * height * 4)
  const sdf = new Uint8Array(width * height * 4)
  const edge = new Uint8Array(width * height * 4)
  const heightData = new Uint8Array(width * height * 4)
  const normal = new Uint8Array(width * height * 4)
  const flow = new Uint8Array(width * height * 4)
  const scatter = new Uint8Array(width * height * 4)

  for (let index = 0; index < samples.length; index++) {
    const offset = index * 4
    const sample = samples[index]
    writeGrayscale(mask, offset, sample.mask)
    writeGrayscale(sdf, offset, sample.sdf * 0.5 + 0.5)
    writeGrayscale(edge, offset, sample.edge)
    writeGrayscale(heightData, offset, sample.height)
    writeVector(normal, offset, sample.normal.x * 0.5 + 0.5, sample.normal.y * 0.5 + 0.5, sample.normal.z)
    writeVector(flow, offset, sample.flow.x * 0.5 + 0.5, sample.flow.y * 0.5 + 0.5, 0)
    writeGrayscale(scatter, offset, sample.scatter)
  }

  return {
    mask: createTexture(mask, width, height),
    sdf: createTexture(sdf, width, height),
    edge: createTexture(edge, width, height),
    height: createTexture(heightData, width, height),
    normal: createTexture(normal, width, height),
    flow: createTexture(flow, width, height),
    scatter: createTexture(scatter, width, height),
  }
}

function writeGrayscale(data: Uint8Array, offset: number, value: number) {
  const channel = toByte(value)
  data[offset] = channel
  data[offset + 1] = channel
  data[offset + 2] = channel
  data[offset + 3] = 255
}

function writeVector(data: Uint8Array, offset: number, x: number, y: number, z: number) {
  data[offset] = toByte(x)
  data[offset + 1] = toByte(y)
  data[offset + 2] = toByte(z)
  data[offset + 3] = 255
}

function createTexture(data: Uint8Array, width: number, height: number): DataTexture {
  const texture = new DataTexture(data, width, height)
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.needsUpdate = true

  return texture
}

function normalize2(x: number, y: number) {
  const length = Math.hypot(x, y)

  if (length <= 0.00001) {
    return { x: 0, y: 0 }
  }

  return {
    x: x / length,
    y: y / length,
  }
}

function normalize3(x: number, y: number, z: number) {
  const length = Math.hypot(x, y, z)

  if (length <= 0.00001) {
    return { x: 0, y: 0, z: 1 }
  }

  return {
    x: x / length,
    y: y / length,
    z: z / length,
  }
}

function hash01(x: number, y: number) {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123
  return value - Math.floor(value)
}

function toByte(value: number) {
  return Math.round(clamp01(value) * 255)
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))
}

function clampSigned(value: number) {
  return Math.min(1, Math.max(-1, Number.isFinite(value) ? value : 0))
}
