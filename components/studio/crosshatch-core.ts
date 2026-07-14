export type CrosshatchRgb = readonly [number, number, number]

export type CrosshatchSettings = Readonly<{
  density: number
  layers: number
  angle: number
  lineWidth: number
  randomness: number
  invert: boolean
  brightness: number
  contrast: number
  lineColor: CrosshatchRgb
  background: CrosshatchRgb
}>

export type CrosshatchReferenceInput = Readonly<{
  rgb: Uint8Array | Uint8ClampedArray
  width: number
  height: number
  settings: CrosshatchSettings
}>

export type CrosshatchReferenceOutput = Readonly<{
  data: Uint8ClampedArray
  width: number
  height: number
  channels: 3
}>

export type CrosshatchPatternInput = Readonly<{
  uv: readonly [number, number]
  angle: number
  spacing: number
  width: number
  seed: number
  resolutionX: number
  randomness: number
}>

export type CrosshatchTrace = Readonly<{
  adjustedSource: CrosshatchRgb
  luminance: number
  darkness: number
  patterns: readonly [number, number, number, number, number, number]
  levels: readonly [number, number, number, number, number, number]
  weights: readonly [number, number, number, number, number, number]
  hatchValue: number
}>

export const DEFAULT_CROSSHATCH_SETTINGS: CrosshatchSettings = {
  density: 6,
  layers: 3,
  angle: 45,
  lineWidth: 0.08,
  randomness: 0,
  invert: false,
  brightness: -4,
  contrast: 0,
  lineColor: [0, 0, 0],
  background: [255, 255, 255],
}

export function hash21(point: readonly [number, number]) {
  let x = fract(point[0] * 0.1031)
  let y = fract(point[1] * 0.1031)
  let z = fract(point[0] * 0.1031)
  const dot = x * (y + 33.33) + y * (z + 33.33) + z * (x + 33.33)
  x += dot
  y += dot
  z += dot
  return fract((x + y) * z)
}

export function valueNoise(point: readonly [number, number]) {
  const integerX = Math.floor(point[0])
  const integerY = Math.floor(point[1])
  const fractionalX = fract(point[0])
  const fractionalY = fract(point[1])
  const smoothX = fractionalX * fractionalX * (3 - 2 * fractionalX)
  const smoothY = fractionalY * fractionalY * (3 - 2 * fractionalY)
  const lower = mix(
    hash21([integerX, integerY]),
    hash21([integerX + 1, integerY]),
    smoothX,
  )
  const upper = mix(
    hash21([integerX, integerY + 1]),
    hash21([integerX + 1, integerY + 1]),
    smoothX,
  )
  return mix(lower, upper, smoothY)
}

export function hatchPattern({
  uv,
  angle,
  spacing,
  width,
  seed,
  resolutionX,
  randomness,
}: CrosshatchPatternInput) {
  const sine = Math.sin(angle)
  const cosine = Math.cos(angle)
  const rotatedX = uv[0] * cosine - uv[1] * sine
  const rotatedY = uv[0] * sine + uv[1] * cosine
  const scaledX = rotatedX * resolutionX / spacing
  let wobble = 0

  if (randomness > 0) {
    const noiseCoordinate: readonly [number, number] = [
      (Math.floor(scaledX) * 0.1 + seed * 7) * 3,
      rotatedY * 0.02 * 3,
    ]
    wobble = (valueNoise(noiseCoordinate) - 0.5) * randomness * 0.4
  }

  const distanceToLine = Math.abs(fract(scaledX + wobble) - 0.5)
  const halfWidth = width * 0.5
  const antiAlias = 1.5 / resolutionX
  return 1 - smoothstep(halfWidth - antiAlias, halfWidth + antiAlias, distanceToLine)
}

export function calculateTamWeights(darkness: number): readonly [
  number,
  number,
  number,
  number,
  number,
  number,
] {
  const intensity = darkness * 6
  const raw = [
    clamp01(intensity),
    clamp01(intensity - 1),
    clamp01(intensity - 2),
    clamp01(intensity - 3),
    clamp01(intensity - 4),
    clamp01(intensity - 5),
  ] as const
  return [
    raw[0] - raw[1],
    raw[1] - raw[2],
    raw[2] - raw[3],
    raw[3] - raw[4],
    raw[4] - raw[5],
    raw[5],
  ]
}

export function traceCrosshatchAt(
  input: CrosshatchReferenceInput,
  x: number,
  y: number,
): CrosshatchTrace {
  assertInput(input)
  const { width, height } = input
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x >= width || y < 0 || y >= height) {
    throw new RangeError('Crosshatch trace coordinates must be in-bounds integers')
  }

  return traceCrosshatchUnchecked(input, x, y)
}

function traceCrosshatchUnchecked(
  input: CrosshatchReferenceInput,
  x: number,
  y: number,
): CrosshatchTrace {
  const { rgb, width, height, settings } = input

  const uv = [(x + 0.5) / width, (y + 0.5) / height] as const
  const source = sampleCrosshatchSourceLinear(rgb, width, height, uv[0], uv[1])
  const adjustedSource = adjustSource(
    source,
    settings.brightness,
    settings.contrast,
  )
  let luminance = crosshatchLuminance(adjustedSource)
  if (settings.invert) luminance = 1 - luminance
  const backgroundHatchStrength = Math.min(
    0.2,
    Math.max(0.006, 0.04 - settings.brightness / 100 * 0.2),
  )
  const backgroundHatchFloor = smoothstep(0.92, 0.995, crosshatchLuminance(source))
    * backgroundHatchStrength
  const darkness = Math.max(1 - luminance, backgroundHatchFloor)
  const baseAngle = settings.angle * Math.PI / 180
  const pattern = (angle: number, spacing: number, lineWidth: number, seed: number) => hatchPattern({
    angle,
    randomness: settings.randomness,
    resolutionX: width,
    seed,
    spacing,
    uv,
    width: lineWidth,
  })

  const hatch0 = pattern(baseAngle, settings.density * 1.5, settings.lineWidth * 0.7, 0)
  const hatch1 = Math.max(
    hatch0,
    pattern(baseAngle + Math.PI * 0.5, settings.density * 1.5, settings.lineWidth * 0.7, 1),
  )
  const hatch2 = Math.max(
    hatch1,
    pattern(baseAngle, settings.density, settings.lineWidth * 0.8, 2),
  )
  const hatch3 = Math.max(
    hatch2,
    pattern(baseAngle + Math.PI * 0.5, settings.density, settings.lineWidth * 0.8, 3),
  )
  const hatch4 = Math.max(
    hatch3,
    pattern(baseAngle + Math.PI * 0.25, settings.density * 0.85, settings.lineWidth * 0.9, 4),
  )
  const hatch5 = Math.max(
    hatch4,
    pattern(baseAngle + Math.PI * 0.75, settings.density * 0.85, settings.lineWidth * 0.9, 5),
  )
  const patterns = [hatch0, hatch1, hatch2, hatch3, hatch4, hatch5] as const
  const levels: [number, number, number, number, number, number] = [...patterns]

  if (settings.layers < 2) {
    levels[1] = levels[0]
    levels[2] = levels[0]
    levels[3] = levels[0]
    levels[4] = levels[0]
    levels[5] = levels[0]
  } else if (settings.layers < 3) {
    levels[4] = levels[3]
    levels[5] = levels[3]
  } else if (settings.layers < 4) {
    levels[5] = levels[4]
  }

  const weights = calculateTamWeights(darkness)
  const weightedHatch = levels.reduce(
    (sum, level, index) => sum + level * weights[index],
    0,
  )

  return {
    adjustedSource,
    darkness,
    hatchValue: weightedHatch,
    levels,
    luminance,
    patterns,
    weights,
  }
}

function crosshatchLuminance(color: CrosshatchRgb) {
  return color[0] * 0.2326 + color[1] * 0.7152 + color[2] * 0.0722
}

export function renderCrosshatchReference(
  input: CrosshatchReferenceInput,
): CrosshatchReferenceOutput {
  assertInput(input)
  const { width, height, settings } = input
  const data = new Uint8ClampedArray(width * height * 3)
  const lineColor = normalizeRgb(settings.lineColor)
  const background = normalizeRgb(settings.background)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const { hatchValue } = traceCrosshatchUnchecked(input, x, y)
      const offset = (y * width + x) * 3
      data[offset] = mix(background[0], lineColor[0], hatchValue) * 255
      data[offset + 1] = mix(background[1], lineColor[1], hatchValue) * 255
      data[offset + 2] = mix(background[2], lineColor[2], hatchValue) * 255
    }
  }

  return { channels: 3, data, height, width }
}

export function sampleCrosshatchSourceLinear(
  rgb: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  u: number,
  v: number,
): CrosshatchRgb {
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

function adjustSource(source: CrosshatchRgb, brightness: number, contrast: number): CrosshatchRgb {
  const normalizedBrightness = brightness / 100
  const normalizedContrast = contrast / 100
  const contrastFactor = (1 + normalizedContrast) / (1 - normalizedContrast * 0.99)
  const adjust = (channel: number) => clamp01(
    (channel + normalizedBrightness - 0.5) * contrastFactor + 0.5,
  )
  return [adjust(source[0]), adjust(source[1]), adjust(source[2])]
}

function assertInput(input: CrosshatchReferenceInput) {
  const { rgb, width, height, settings } = input
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new RangeError('Crosshatch dimensions must be positive integers')
  }
  if (rgb.length !== width * height * 3) {
    throw new RangeError('Crosshatch RGB input length must equal width * height * 3')
  }
  assertRange('density', settings.density, 2, 12)
  assertInteger('density', settings.density)
  assertRange('layers', settings.layers, 1, 4)
  assertInteger('layers', settings.layers)
  assertRange('angle', settings.angle, 0, 90)
  assertStep('angle', settings.angle, 0, 5)
  assertRange('lineWidth', settings.lineWidth, 0.01, 0.5)
  assertStep('lineWidth', settings.lineWidth, 0.01, 0.01)
  assertRange('randomness', settings.randomness, 0, 1)
  assertStep('randomness', settings.randomness, 0, 0.05)
  assertRange('brightness', settings.brightness, -100, 100)
  assertInteger('brightness', settings.brightness)
  assertRange('contrast', settings.contrast, -100, 100)
  assertInteger('contrast', settings.contrast)
  if (typeof settings.invert !== 'boolean') {
    throw new TypeError('Crosshatch invert must be a boolean')
  }
  assertColor('lineColor', settings.lineColor)
  assertColor('background', settings.background)
}

function assertRange(name: string, value: number, min: number, max: number) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`Crosshatch ${name} must be between ${min} and ${max}`)
  }
}

function assertInteger(name: string, value: number) {
  if (!Number.isInteger(value)) {
    throw new RangeError(`Crosshatch ${name} must be an integer`)
  }
}

function assertStep(name: string, value: number, minimum: number, step: number) {
  const steps = (value - minimum) / step
  if (Math.abs(steps - Math.round(steps)) > 1e-9) {
    throw new RangeError(`Crosshatch ${name} must use increments of ${step}`)
  }
}

function assertColor(name: string, color: CrosshatchRgb) {
  if (!Array.isArray(color) || color.length !== 3) {
    throw new RangeError(`Crosshatch ${name} must have three color channels`)
  }
  for (const channel of color) {
    if (!Number.isFinite(channel) || channel < 0 || channel > 255) {
      throw new RangeError(`Crosshatch ${name} color channel must be between 0 and 255`)
    }
  }
}

function sampleTexel(
  rgb: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): CrosshatchRgb {
  const clampedX = Math.min(width - 1, Math.max(0, x))
  const clampedY = Math.min(height - 1, Math.max(0, y))
  const offset = (clampedY * width + clampedX) * 3
  return [rgb[offset] / 255, rgb[offset + 1] / 255, rgb[offset + 2] / 255]
}

function normalizeRgb(color: CrosshatchRgb): CrosshatchRgb {
  return [color[0] / 255, color[1] / 255, color[2] / 255]
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

function mix(from: number, to: number, amount: number) {
  return from + (to - from) * amount
}

function clamp01(value: number) {
  return clamp(value, 0, 1)
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

function fract(value: number) {
  return value - Math.floor(value)
}
