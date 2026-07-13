export type NoiseFieldRgb = readonly [number, number, number]
export type NoiseFieldVec2 = readonly [number, number]
export type NoiseFieldType = 'perlin' | 'simplex' | 'worley'

export type NoiseFieldSettings = Readonly<{
  noiseType: NoiseFieldType
  scale: number
  intensity: number
  octaves: number
  speed: number
  animate: boolean
  distortOnly: boolean
  brightness: number
  contrast: number
}>

export type NoiseFieldReferenceInput = Readonly<{
  rgb: Uint8Array | Uint8ClampedArray
  width: number
  height: number
  time: number
  settings: NoiseFieldSettings
}>

export type NoiseFieldTrace = Readonly<{
  uv: NoiseFieldVec2
  animatedTime: number
  noisePosition: NoiseFieldVec2
  noiseValues: NoiseFieldVec2
  displacement: NoiseFieldVec2
  sampleUv: NoiseFieldVec2
  sampledSource: NoiseFieldRgb
  adjustedSource: NoiseFieldRgb
  overlay: number
  output: NoiseFieldRgb
}>

export type NoiseFieldReferenceOutput = Readonly<{
  data: Uint8ClampedArray
  width: number
  height: number
  channels: 3
}>

export const DEFAULT_NOISE_FIELD_SETTINGS: NoiseFieldSettings = {
  noiseType: 'perlin',
  scale: 50,
  intensity: 1,
  octaves: 4,
  speed: 1,
  animate: true,
  distortOnly: false,
  brightness: 0,
  contrast: 0,
}

export function noiseFieldHash([x, y]: NoiseFieldVec2) {
  return fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453)
}

export function noiseFieldHash2([x, y]: NoiseFieldVec2): NoiseFieldVec2 {
  return [
    noiseFieldHash([x, y]),
    fract(Math.sin(x * 269.5 + y * 183.3) * 43758.5453),
  ]
}

export function valueNoise([x, y]: NoiseFieldVec2) {
  const integerX = Math.floor(x)
  const integerY = Math.floor(y)
  const fractionalX = fract(x)
  const fractionalY = fract(y)
  const smoothX = fractionalX * fractionalX * (3 - 2 * fractionalX)
  const smoothY = fractionalY * fractionalY * (3 - 2 * fractionalY)
  const lower = mix(
    noiseFieldHash([integerX, integerY]),
    noiseFieldHash([integerX + 1, integerY]),
    smoothX,
  )
  const upper = mix(
    noiseFieldHash([integerX, integerY + 1]),
    noiseFieldHash([integerX + 1, integerY + 1]),
    smoothX,
  )
  return mix(lower, upper, smoothY)
}

export function simplexNoise([x, y]: NoiseFieldVec2) {
  const k1 = 0.366025404
  const k2 = 0.211324865
  const skew = (x + y) * k1
  const integerX = Math.floor(x + skew)
  const integerY = Math.floor(y + skew)
  const unskew = (integerX + integerY) * k2
  const a: NoiseFieldVec2 = [x - integerX + unskew, y - integerY + unskew]
  const corner: NoiseFieldVec2 = [a[0] >= a[1] ? 1 : 0, a[1] >= a[0] ? 1 : 0]
  const b: NoiseFieldVec2 = [a[0] - corner[0] + k2, a[1] - corner[1] + k2]
  const c: NoiseFieldVec2 = [a[0] - 1 + 2 * k2, a[1] - 1 + 2 * k2]
  const points = [a, b, c] as const
  const cells = [
    [integerX, integerY],
    [integerX + corner[0], integerY + corner[1]],
    [integerX + 1, integerY + 1],
  ] as const

  let value = 0
  for (let index = 0; index < 3; index += 1) {
    const point = points[index]
    const h = Math.max(0.5 - dot(point, point), 0)
    const gradient = noiseFieldHash2(cells[index])
    value += h ** 4 * dot(point, [gradient[0] - 0.5, gradient[1] - 0.5])
  }
  return value * 70
}

export function worleyNoise([x, y]: NoiseFieldVec2) {
  const integerX = Math.floor(x)
  const integerY = Math.floor(y)
  const fractionalX = fract(x)
  const fractionalY = fract(y)
  let minimumDistance = 1

  for (let neighborY = -1; neighborY <= 1; neighborY += 1) {
    for (let neighborX = -1; neighborX <= 1; neighborX += 1) {
      const point = noiseFieldHash2([integerX + neighborX, integerY + neighborY])
      const deltaX = neighborX + point[0] - fractionalX
      const deltaY = neighborY + point[1] - fractionalY
      minimumDistance = Math.min(minimumDistance, Math.hypot(deltaX, deltaY))
    }
  }
  return minimumDistance
}

export function getNoise(point: NoiseFieldVec2, noiseType: NoiseFieldType) {
  if (noiseType === 'simplex') return simplexNoise(point) * 0.5 + 0.5
  if (noiseType === 'worley') return worleyNoise(point)
  return valueNoise(point)
}

export function fbmNoise(
  point: NoiseFieldVec2,
  octaves: number,
  noiseType: NoiseFieldType,
) {
  let value = 0
  let amplitude = 0.5
  let position = point
  for (let index = 0; index < octaves; index += 1) {
    value += amplitude * getNoise(position, noiseType)
    position = [position[0] * 2, position[1] * 2]
    amplitude *= 0.5
  }
  return value
}

export function sampleNoiseFieldSourceLinear(
  rgb: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  u: number,
  v: number,
): NoiseFieldRgb {
  const texelX = clamp01(u) * width - 0.5
  const texelY = clamp01(v) * height - 0.5
  const x0 = Math.floor(texelX)
  const y0 = Math.floor(texelY)
  const mixX = texelX - x0
  const mixY = texelY - y0
  const topLeft = sampleTexel(rgb, width, height, x0, y0)
  const topRight = sampleTexel(rgb, width, height, x0 + 1, y0)
  const bottomLeft = sampleTexel(rgb, width, height, x0, y0 + 1)
  const bottomRight = sampleTexel(rgb, width, height, x0 + 1, y0 + 1)
  const channel = (index: 0 | 1 | 2) => mix(
    mix(topLeft[index], topRight[index], mixX),
    mix(bottomLeft[index], bottomRight[index], mixX),
    mixY,
  )
  return [channel(0), channel(1), channel(2)]
}

export function traceNoiseFieldAt(
  input: NoiseFieldReferenceInput,
  x: number,
  y: number,
): NoiseFieldTrace {
  assertSource(input)
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x >= input.width || y < 0 || y >= input.height) {
    throw new RangeError('Noise Field trace coordinates must be in-bounds integers')
  }

  return traceNoiseFieldUnchecked(input, x, y)
}

function traceNoiseFieldUnchecked(
  input: NoiseFieldReferenceInput,
  x: number,
  y: number,
): NoiseFieldTrace {
  const { rgb, width, height, time, settings } = input
  const uv: NoiseFieldVec2 = [(x + 0.5) / width, (y + 0.5) / height]
  const animatedTime = settings.animate ? time * settings.speed : 0
  const noisePosition: NoiseFieldVec2 = [
    uv[0] * settings.scale + animatedTime * 0.1,
    uv[1] * settings.scale + animatedTime * 0.1,
  ]
  const noiseValues: NoiseFieldVec2 = [
    fbmNoise(noisePosition, settings.octaves, settings.noiseType),
    fbmNoise(
      [noisePosition[0] + 100, noisePosition[1] + 100],
      settings.octaves,
      settings.noiseType,
    ),
  ]
  const displacement: NoiseFieldVec2 = [
    (noiseValues[0] - 0.5) * 2 * settings.intensity * 0.02,
    (noiseValues[1] - 0.5) * 2 * settings.intensity * 0.02,
  ]
  const sampleUv: NoiseFieldVec2 = [
    clamp01(uv[0] + displacement[0]),
    clamp01(uv[1] + displacement[1]),
  ]
  const sampledSource = sampleNoiseFieldSourceLinear(rgb, width, height, sampleUv[0], sampleUv[1])
  const adjustedSource = adjustSource(sampledSource, settings.brightness, settings.contrast)
  const overlay = settings.distortOnly
    ? 0
    : fbmNoise(
        [
          uv[0] * settings.scale * 2 + animatedTime,
          uv[1] * settings.scale * 2 + animatedTime,
        ],
        settings.octaves,
        settings.noiseType,
      ) * 0.1
  const output: NoiseFieldRgb = [
    clamp01(adjustedSource[0] + overlay * settings.intensity * 0.3),
    clamp01(adjustedSource[1] + overlay * settings.intensity * 0.3),
    clamp01(adjustedSource[2] + overlay * settings.intensity * 0.3),
  ]

  return {
    adjustedSource,
    animatedTime,
    displacement,
    noisePosition,
    noiseValues,
    output,
    overlay,
    sampledSource,
    sampleUv,
    uv,
  }
}

export function renderNoiseFieldReference(
  input: NoiseFieldReferenceInput,
): NoiseFieldReferenceOutput {
  assertSource(input)
  const data = new Uint8ClampedArray(input.width * input.height * 3)
  for (let y = 0; y < input.height; y += 1) {
    for (let x = 0; x < input.width; x += 1) {
      const { output } = traceNoiseFieldUnchecked(input, x, y)
      const offset = (y * input.width + x) * 3
      data[offset] = output[0] * 255
      data[offset + 1] = output[1] * 255
      data[offset + 2] = output[2] * 255
    }
  }
  return { channels: 3, data, height: input.height, width: input.width }
}

function adjustSource(source: NoiseFieldRgb, brightness: number, contrast: number): NoiseFieldRgb {
  const normalizedBrightness = brightness / 100
  const normalizedContrast = contrast / 100
  const factor = (1 + normalizedContrast) / (1 - normalizedContrast * 0.99)
  const adjust = (channel: number) => clamp01(
    (channel + normalizedBrightness - 0.5) * factor + 0.5,
  )
  return [adjust(source[0]), adjust(source[1]), adjust(source[2])]
}

function assertSource(input: NoiseFieldReferenceInput) {
  if (!Number.isInteger(input.width) || !Number.isInteger(input.height) || input.width <= 0 || input.height <= 0) {
    throw new RangeError('Noise Field dimensions must be positive integers')
  }
  if (input.rgb.length !== input.width * input.height * 3) {
    throw new RangeError('Noise Field RGB input length must equal width * height * 3')
  }
  if (!Number.isFinite(input.time)) throw new RangeError('Noise Field time must be finite')
  const { settings } = input
  if (!(['perlin', 'simplex', 'worley'] as const).includes(settings.noiseType)) {
    throw new RangeError('Noise Field noiseType must be perlin, simplex, or worley')
  }
  assertRange('scale', settings.scale, 10, 100)
  assertStep('scale', settings.scale, 10, 5)
  assertRange('intensity', settings.intensity, 0.5, 3)
  assertStep('intensity', settings.intensity, 0.5, 0.1)
  assertRange('octaves', settings.octaves, 1, 8)
  assertInteger('octaves', settings.octaves)
  assertRange('speed', settings.speed, 0.1, 3)
  assertStep('speed', settings.speed, 0.1, 0.1)
  if (typeof settings.animate !== 'boolean') {
    throw new TypeError('Noise Field animate must be a boolean')
  }
  if (typeof settings.distortOnly !== 'boolean') {
    throw new TypeError('Noise Field distortOnly must be a boolean')
  }
  assertRange('brightness', settings.brightness, -100, 100)
  assertInteger('brightness', settings.brightness)
  assertRange('contrast', settings.contrast, -100, 100)
  assertInteger('contrast', settings.contrast)
}

function assertRange(name: string, value: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new RangeError(`Noise Field ${name} must be between ${minimum} and ${maximum}`)
  }
}

function assertStep(name: string, value: number, minimum: number, step: number) {
  const steps = (value - minimum) / step
  if (Math.abs(steps - Math.round(steps)) > 1e-9) {
    throw new RangeError(`Noise Field ${name} must use increments of ${step}`)
  }
}

function assertInteger(name: string, value: number) {
  if (!Number.isInteger(value)) {
    throw new RangeError(`Noise Field ${name} must be an integer`)
  }
}

function sampleTexel(
  rgb: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): NoiseFieldRgb {
  const clampedX = Math.min(width - 1, Math.max(0, x))
  const clampedY = Math.min(height - 1, Math.max(0, y))
  const offset = (clampedY * width + clampedX) * 3
  return [rgb[offset] / 255, rgb[offset + 1] / 255, rgb[offset + 2] / 255]
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function dot(left: NoiseFieldVec2, right: NoiseFieldVec2) {
  return left[0] * right[0] + left[1] * right[1]
}

function mix(from: number, to: number, amount: number) {
  return from + (to - from) * amount
}

function fract(value: number) {
  return value - Math.floor(value)
}
