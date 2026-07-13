export type PixelSortRgb = readonly [number, number, number]
export type PixelSortVec2 = readonly [number, number]
export type PixelSortDirection = 'horizontal' | 'vertical' | 'diagonal'
export type PixelSortMode = 'brightness' | 'hue' | 'saturation' | 'dark'

export type PixelSortSettings = Readonly<{
  direction: PixelSortDirection
  mode: PixelSortMode
  threshold: number
  streakLength: number
  intensity: number
  randomness: number
  reverse: boolean
  brightness: number
  contrast: number
}>

export type PixelSortReferenceInput = Readonly<{
  rgb: Uint8Array | Uint8ClampedArray
  width: number
  height: number
  settings: PixelSortSettings
}>

export type PixelSortReferenceOutput = Readonly<{
  data: Uint8ClampedArray
  width: number
  height: number
  channels: 3
}>

export type PixelSortTraceInput = PixelSortReferenceInput & Readonly<{
  x: number
  y: number
}>

export type PixelSortSpanTrace = Readonly<{
  direction: PixelSortVec2
  lineCoordinate: number
  variedThreshold: number
  startDistance: number
  endDistance: number
  spanSize: number
  actualSamples: number
  sampleOffsets: readonly number[]
  sortable: boolean
}>

export const DEFAULT_PIXEL_SORT_SETTINGS: PixelSortSettings = {
  direction: 'horizontal',
  mode: 'brightness',
  threshold: 0.25,
  streakLength: 100,
  intensity: 0.8,
  randomness: 0.3,
  reverse: false,
  brightness: 0,
  contrast: 0,
}

const SAMPLE_COUNT = 24

export function hashPixelSort11(value: number) {
  let hashed = fract(value * 0.1031)
  hashed *= hashed + 33.33
  return fract(hashed * (hashed + hashed))
}

export function getPixelSortThreshold(
  lineCoordinate: number,
  threshold: number,
  randomness: number,
) {
  const lineRandom = hashPixelSort11(lineCoordinate * 0.173)
  return threshold * (1 + (lineRandom - 0.5) * randomness * 0.5)
}

/**
 * The names are Grainrad's UI values; production maps them to black, white,
 * bright, and hidden dark span detectors rather than matching their labels.
 */
export function isPixelSortSpanStart(
  color: PixelSortRgb,
  threshold: number,
  mode: PixelSortMode,
) {
  switch (mode) {
    case 'brightness':
      return luminance(color) > threshold * 0.25
    case 'hue':
      return luminance(color) < 1 - threshold * 0.25
    case 'saturation':
      return maximumChannel(color) > threshold
    case 'dark':
      return maximumChannel(color) < threshold
  }
}

export function samplePixelSortSourceLinear(
  rgb: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  u: number,
  v: number,
): PixelSortRgb {
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
  const sampleChannel = (channel: 0 | 1 | 2) => {
    const top = mix(topLeft[channel], topRight[channel], mixX)
    const bottom = mix(bottomLeft[channel], bottomRight[channel], mixX)
    return mix(top, bottom, mixY)
  }

  return [sampleChannel(0), sampleChannel(1), sampleChannel(2)]
}

export function tracePixelSortSpan({
  rgb,
  width,
  height,
  settings,
  x,
  y,
}: PixelSortTraceInput): PixelSortSpanTrace {
  assertInput(rgb, width, height, settings)
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x >= width || y < 0 || y >= height) {
    throw new RangeError('Pixel Sort trace coordinates must be in bounds integers')
  }

  const direction = directionVector(settings.direction)
  const u = (x + 0.5) / width
  const v = (y + 0.5) / height
  const lineCoordinate = getLineCoordinate(x, y, settings.direction)
  const variedThreshold = getPixelSortThreshold(
    lineCoordinate,
    settings.threshold,
    settings.randomness,
  )
  const current = samplePixelSortSourceLinear(rgb, width, height, u, v)
  const distances = new Int32Array(2)

  if (isPixelSortSpanStart(current, variedThreshold, settings.mode)) {
    findSpanDistances(
      rgb,
      width,
      height,
      u,
      v,
      direction,
      variedThreshold,
      settings,
      distances,
    )
  }

  const startDistance = distances[0]
  const endDistance = distances[1]
  const spanSize = startDistance + endDistance
  const actualSamples = Math.min(spanSize, SAMPLE_COUNT)
  const sampleOffsets = actualSamples >= 2
    ? Array.from(
        { length: actualSamples },
        (_, index) => -startDistance + index / (actualSamples - 1) * spanSize,
      )
    : []

  return {
    actualSamples,
    direction,
    endDistance,
    lineCoordinate,
    sampleOffsets,
    sortable: spanSize >= 3,
    spanSize,
    startDistance,
    variedThreshold,
  }
}

export function renderPixelSortReference({
  rgb,
  width,
  height,
  settings,
}: PixelSortReferenceInput): PixelSortReferenceOutput {
  assertInput(rgb, width, height, settings)

  const data = new Uint8ClampedArray(width * height * 3)
  const direction = directionVector(settings.direction)
  const directionU = direction[0] / width
  const directionV = direction[1] / height
  const distances = new Int32Array(2)
  const colors = new Float64Array(SAMPLE_COUNT * 3)
  const sortValues = new Float64Array(SAMPLE_COUNT)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const u = (x + 0.5) / width
      const v = (y + 0.5) / height
      const current = samplePixelSortSourceLinear(rgb, width, height, u, v)
      const lineCoordinate = getLineCoordinate(x, y, settings.direction)
      const variedThreshold = getPixelSortThreshold(
        lineCoordinate,
        settings.threshold,
        settings.randomness,
      )

      if (!isPixelSortSpanStart(current, variedThreshold, settings.mode)) {
        writeAdjusted(data, width, x, y, current, settings)
        continue
      }

      findSpanDistances(
        rgb,
        width,
        height,
        u,
        v,
        direction,
        variedThreshold,
        settings,
        distances,
      )
      const startDistance = distances[0]
      const endDistance = distances[1]
      const spanSize = startDistance + endDistance

      if (spanSize < 3) {
        writeAdjusted(data, width, x, y, current, settings)
        continue
      }

      const actualSamples = Math.min(spanSize, SAMPLE_COUNT)
      for (let index = 0; index < actualSamples; index += 1) {
        const interpolation = index / (actualSamples - 1)
        const sampleOffset = -startDistance + interpolation * spanSize
        const sampleU = clamp(u + directionU * sampleOffset, 0.001, 0.999)
        const sampleV = clamp(v + directionV * sampleOffset, 0.001, 0.999)
        const sample = samplePixelSortSourceLinear(rgb, width, height, sampleU, sampleV)
        const colorOffset = index * 3
        colors[colorOffset] = sample[0]
        colors[colorOffset + 1] = sample[1]
        colors[colorOffset + 2] = sample[2]
        sortValues[index] = luminance(sample)
      }

      bubbleSort(colors, sortValues, actualSamples, settings.reverse)

      const positionInSpan = startDistance / spanSize
      const sortedIndex = positionInSpan * (actualSamples - 1)
      const lowIndex = Math.floor(sortedIndex)
      const highIndex = Math.min(lowIndex + 1, actualSamples - 1)
      const interpolation = fract(sortedIndex)
      const lowOffset = lowIndex * 3
      const highOffset = highIndex * 3
      const sortedColor: PixelSortRgb = [
        mix(colors[lowOffset], colors[highOffset], interpolation),
        mix(colors[lowOffset + 1], colors[highOffset + 1], interpolation),
        mix(colors[lowOffset + 2], colors[highOffset + 2], interpolation),
      ]
      const finalColor: PixelSortRgb = [
        mix(current[0], sortedColor[0], settings.intensity),
        mix(current[1], sortedColor[1], settings.intensity),
        mix(current[2], sortedColor[2], settings.intensity),
      ]
      writeAdjusted(data, width, x, y, finalColor, settings)
    }
  }

  return { channels: 3, data, height, width }
}

function findSpanDistances(
  rgb: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  u: number,
  v: number,
  direction: PixelSortVec2,
  threshold: number,
  settings: PixelSortSettings,
  output: Int32Array,
) {
  const directionU = direction[0] / width
  const directionV = direction[1] / height
  let startDistance = 0
  let endDistance = 0

  for (let step = 1; step <= settings.streakLength; step += 1) {
    const checkU = u - directionU * step
    const checkV = v - directionV * step
    startDistance = step
    if (isOutOfBounds(checkU, checkV)) break

    const checkColor = samplePixelSortSourceLinear(rgb, width, height, checkU, checkV)
    if (!isPixelSortSpanStart(checkColor, threshold, settings.mode)) break
    if (isPixelSortSpanEnd(checkColor, threshold, settings.mode)) break
  }

  for (let step = 1; step <= settings.streakLength; step += 1) {
    const checkU = u + directionU * step
    const checkV = v + directionV * step
    endDistance = step
    if (isOutOfBounds(checkU, checkV)) break

    const checkColor = samplePixelSortSourceLinear(rgb, width, height, checkU, checkV)
    if (isPixelSortSpanEnd(checkColor, threshold, settings.mode)
      || !isPixelSortSpanStart(checkColor, threshold, settings.mode)) break
  }

  output[0] = startDistance
  output[1] = endDistance
}

function isPixelSortSpanEnd(
  color: PixelSortRgb,
  threshold: number,
  mode: PixelSortMode,
) {
  switch (mode) {
    case 'brightness':
      return luminance(color) <= threshold * 0.25
    case 'hue':
      return luminance(color) >= 1 - threshold * 0.25
    case 'saturation':
      return maximumChannel(color) <= threshold
    case 'dark':
      return maximumChannel(color) >= threshold
  }
}

function bubbleSort(
  colors: Float64Array,
  values: Float64Array,
  count: number,
  reverse: boolean,
) {
  for (let pass = 0; pass < count - 1; pass += 1) {
    for (let index = 0; index < count - 1 - pass; index += 1) {
      const shouldSwap = reverse
        ? values[index] < values[index + 1]
        : values[index] > values[index + 1]
      if (!shouldSwap) continue

      const nextIndex = index + 1
      const value = values[index]
      values[index] = values[nextIndex]
      values[nextIndex] = value
      const colorOffset = index * 3
      const nextColorOffset = nextIndex * 3
      for (let channel = 0; channel < 3; channel += 1) {
        const color = colors[colorOffset + channel]
        colors[colorOffset + channel] = colors[nextColorOffset + channel]
        colors[nextColorOffset + channel] = color
      }
    }
  }
}

function directionVector(direction: PixelSortDirection): PixelSortVec2 {
  switch (direction) {
    case 'horizontal':
      return [1, 0]
    case 'vertical':
      return [0, 1]
    case 'diagonal':
      return [Math.SQRT1_2, Math.SQRT1_2]
  }
}

function getLineCoordinate(x: number, y: number, direction: PixelSortDirection) {
  switch (direction) {
    case 'horizontal':
      return Math.floor(y + 0.5)
    case 'vertical':
      return Math.floor(x + 0.5)
    case 'diagonal':
      return Math.floor((x + 0.5) - (y + 0.5))
  }
}

function sampleTexel(
  rgb: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): PixelSortRgb {
  const clampedX = Math.min(width - 1, Math.max(0, x))
  const clampedY = Math.min(height - 1, Math.max(0, y))
  const offset = (clampedY * width + clampedX) * 3
  return [rgb[offset] / 255, rgb[offset + 1] / 255, rgb[offset + 2] / 255]
}

function writeAdjusted(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  color: PixelSortRgb,
  settings: PixelSortSettings,
) {
  const adjusted = adjustSource(color, settings.brightness, settings.contrast)
  const offset = (y * width + x) * 3
  data[offset] = adjusted[0] * 255
  data[offset + 1] = adjusted[1] * 255
  data[offset + 2] = adjusted[2] * 255
}

function adjustSource(color: PixelSortRgb, brightness: number, contrast: number): PixelSortRgb {
  const normalizedBrightness = brightness / 100
  const normalizedContrast = contrast / 100
  const contrastFactor = (1 + normalizedContrast) / (1 - normalizedContrast * 0.99)
  const adjust = (channel: number) => clamp01(
    (channel + normalizedBrightness - 0.5) * contrastFactor + 0.5,
  )
  return [adjust(color[0]), adjust(color[1]), adjust(color[2])]
}

function luminance(color: PixelSortRgb) {
  return color[0] * 0.299 + color[1] * 0.587 + color[2] * 0.114
}

function maximumChannel(color: PixelSortRgb) {
  return Math.max(color[0], color[1], color[2])
}

function isOutOfBounds(u: number, v: number) {
  return u < 0 || u > 1 || v < 0 || v > 1
}

function assertInput(
  rgb: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  settings: PixelSortSettings,
) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new RangeError('Pixel Sort dimensions must be positive integers')
  }
  if (rgb.length !== width * height * 3) {
    throw new RangeError('Pixel Sort RGB input length must equal width * height * 3')
  }
  assertSettings(settings)
}

function assertSettings(settings: PixelSortSettings) {
  if (!(['horizontal', 'vertical', 'diagonal'] as const).includes(settings.direction)) {
    throw new RangeError('Pixel Sort direction must be horizontal, vertical, or diagonal')
  }
  if (!(['brightness', 'hue', 'saturation', 'dark'] as const).includes(settings.mode)) {
    throw new RangeError('Pixel Sort mode must be brightness, hue, saturation, or dark')
  }
  assertRange('threshold', settings.threshold, 0, 0.5)
  assertRange('streakLength', settings.streakLength, 10, 300)
  if (!Number.isInteger(settings.streakLength)) {
    throw new RangeError('Pixel Sort streakLength must be an integer')
  }
  assertRange('intensity', settings.intensity, 0, 1)
  assertRange('randomness', settings.randomness, 0, 1)
  assertRange('brightness', settings.brightness, -100, 100)
  assertRange('contrast', settings.contrast, -100, 100)
  if (typeof settings.reverse !== 'boolean') {
    throw new TypeError('Pixel Sort reverse must be boolean')
  }
}

function assertRange(name: string, value: number, min: number, max: number) {
  if (!Number.isFinite(value)) throw new RangeError(`Pixel Sort ${name} must be finite`)
  if (value < min || value > max) {
    throw new RangeError(`Pixel Sort ${name} must be between ${min} and ${max}`)
  }
}

function mix(from: number, to: number, amount: number) {
  return from + (to - from) * amount
}

function fract(value: number) {
  return value - Math.floor(value)
}

function clamp01(value: number) {
  return clamp(value, 0, 1)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
