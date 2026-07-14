export type PixelSortRgb = readonly [number, number, number]
export type PixelSortRgba = readonly [number, number, number, number]
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

export type PixelSortFrameInput = Readonly<{
  rgba: Uint8Array | Uint8ClampedArray
  width: number
  height: number
  settings: PixelSortSettings
}>

export type PixelSortFrameOutput = Readonly<{
  data: Uint8ClampedArray
  width: number
  height: number
  channels: 4
}>

export type PixelSortTraceInput = PixelSortFrameInput & Readonly<{
  x: number
  y: number
}>

export type PixelSortSpanTrace = Readonly<{
  direction: PixelSortVec2
  lineCoordinate: number
  linePosition: number
  variedThreshold: number
  blockStart: number
  blockEnd: number
  spanStart: number
  spanEnd: number
  spanSize: number
  sortable: boolean
}>

type ScanlineDescriptor = Readonly<{
  coordinate: number
  length: number
  indexAt: (position: number) => number
}>

export const DEFAULT_PIXEL_SORT_SETTINGS: PixelSortSettings = {
  direction: 'horizontal',
  mode: 'hue',
  threshold: 0.25,
  streakLength: 100,
  intensity: 0.8,
  randomness: 0.3,
  reverse: false,
  brightness: 0,
  contrast: 0,
}

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

export function getPixelSortBlockPhase(
  lineCoordinate: number,
  streakLength: number,
  randomness: number,
) {
  if (randomness === 0) return 0
  return Math.floor(hashPixelSort11((lineCoordinate + 1) * 0.619) * streakLength * randomness)
}

/**
 * These names are the production UI values. Production uses them as black,
 * white, and bright interval predicates rather than literal ordering keys.
 * Ordering itself is always by luminance.
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

/**
 * Exact CPU oracle for the dedicated Pixel Sort renderer. Each scanline is
 * partitioned into globally anchored blocks and every eligible subrun is a
 * stable one-to-one permutation of its source texels.
 */
export function renderPixelSortFrame({
  rgba,
  width,
  height,
  settings,
}: PixelSortFrameInput): PixelSortFrameOutput {
  assertInput(rgba, width, height, settings)

  const sorted = new Uint8ClampedArray(rgba)
  for (const line of createScanlines(width, height, settings.direction)) {
    sortScanline(sorted, rgba, line, settings)
  }

  const data = new Uint8ClampedArray(rgba.length)
  for (let offset = 0; offset < rgba.length; offset += 4) {
    for (let channel = 0; channel < 4; channel += 1) {
      data[offset + channel] = mix(rgba[offset + channel], sorted[offset + channel], settings.intensity)
    }
    const adjusted = adjustSource(
      [data[offset] / 255, data[offset + 1] / 255, data[offset + 2] / 255],
      settings.brightness,
      settings.contrast,
    )
    data[offset] = adjusted[0] * 255
    data[offset + 1] = adjusted[1] * 255
    data[offset + 2] = adjusted[2] * 255
  }

  return { channels: 4, data, height, width }
}

/** @deprecated Use renderPixelSortFrame. */
export const renderPixelSortReference = renderPixelSortFrame

export function tracePixelSortSpan({
  rgba,
  width,
  height,
  settings,
  x,
  y,
}: PixelSortTraceInput): PixelSortSpanTrace {
  assertInput(rgba, width, height, settings)
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x >= width || y < 0 || y >= height) {
    throw new RangeError('Pixel Sort trace coordinates must be in bounds integers')
  }

  const line = findScanline(width, height, settings.direction, x, y)
  const linePosition = getLinePosition(settings.direction, x, y)
  const variedThreshold = getPixelSortThreshold(
    line.coordinate,
    settings.threshold,
    settings.randomness,
  )
  const { blockEnd, blockStart } = getBlockBounds(
    linePosition,
    line.length,
    line.coordinate,
    settings,
  )
  let spanStart = linePosition
  let spanEnd = linePosition

  if (isEligibleAt(rgba, line.indexAt(linePosition), variedThreshold, settings.mode)) {
    while (
      spanStart > blockStart
      && isEligibleAt(rgba, line.indexAt(spanStart - 1), variedThreshold, settings.mode)
    ) spanStart -= 1
    while (
      spanEnd + 1 < blockEnd
      && isEligibleAt(rgba, line.indexAt(spanEnd + 1), variedThreshold, settings.mode)
    ) spanEnd += 1
  }

  const spanSize = isEligibleAt(
    rgba,
    line.indexAt(linePosition),
    variedThreshold,
    settings.mode,
  ) ? spanEnd - spanStart + 1 : 0

  return {
    blockEnd,
    blockStart,
    direction: directionVector(settings.direction),
    lineCoordinate: line.coordinate,
    linePosition,
    sortable: spanSize >= 2,
    spanEnd,
    spanSize,
    spanStart,
    variedThreshold,
  }
}

function sortScanline(
  output: Uint8ClampedArray,
  source: Uint8Array | Uint8ClampedArray,
  line: ScanlineDescriptor,
  settings: PixelSortSettings,
) {
  const threshold = getPixelSortThreshold(line.coordinate, settings.threshold, settings.randomness)
  const phase = getPixelSortBlockPhase(line.coordinate, settings.streakLength, settings.randomness)

  for (let nominalStart = -phase; nominalStart < line.length; nominalStart += settings.streakLength) {
    const blockStart = Math.max(0, nominalStart)
    const blockEnd = Math.min(line.length, nominalStart + settings.streakLength)
    let cursor = blockStart

    while (cursor < blockEnd) {
      if (!isEligibleAt(source, line.indexAt(cursor), threshold, settings.mode)) {
        cursor += 1
        continue
      }

      const runStart = cursor
      while (
        cursor < blockEnd
        && isEligibleAt(source, line.indexAt(cursor), threshold, settings.mode)
      ) cursor += 1
      sortRun(output, source, line, runStart, cursor, settings.reverse)
    }
  }
}

function sortRun(
  output: Uint8ClampedArray,
  source: Uint8Array | Uint8ClampedArray,
  line: ScanlineDescriptor,
  start: number,
  end: number,
  reverse: boolean,
) {
  const entries = Array.from({ length: end - start }, (_, position) => {
    const pixelIndex = line.indexAt(start + position)
    return { key: luminance(readRgb(source, pixelIndex)), pixelIndex, position }
  })

  entries.sort((left, right) => {
    const keyOrder = reverse ? right.key - left.key : left.key - right.key
    return keyOrder || left.position - right.position
  })

  entries.forEach((entry, index) => {
    const sourceOffset = entry.pixelIndex * 4
    const targetOffset = line.indexAt(start + index) * 4
    output.set(source.subarray(sourceOffset, sourceOffset + 4), targetOffset)
  })
}

function* createScanlines(
  width: number,
  height: number,
  direction: PixelSortDirection,
): Generator<ScanlineDescriptor> {
  if (direction === 'horizontal') {
    for (let y = 0; y < height; y += 1) {
      yield createScanline(width, height, direction, y)
    }
    return
  }
  if (direction === 'vertical') {
    for (let x = 0; x < width; x += 1) {
      yield createScanline(width, height, direction, x)
    }
    return
  }

  for (let coordinate = 1 - height; coordinate < width; coordinate += 1) {
    yield createScanline(width, height, direction, coordinate)
  }
}

function findScanline(
  width: number,
  height: number,
  direction: PixelSortDirection,
  x: number,
  y: number,
) {
  const coordinate = direction === 'horizontal' ? y : direction === 'vertical' ? x : x - y
  return createScanline(width, height, direction, coordinate)
}

function createScanline(
  width: number,
  height: number,
  direction: PixelSortDirection,
  coordinate: number,
): ScanlineDescriptor {
  if (direction === 'horizontal') {
    return { coordinate, length: width, indexAt: (position) => coordinate * width + position }
  }
  if (direction === 'vertical') {
    return { coordinate, length: height, indexAt: (position) => position * width + coordinate }
  }

  const startX = Math.max(0, coordinate)
  const startY = startX - coordinate
  const length = Math.min(width - startX, height - startY)
  return {
    coordinate,
    length,
    indexAt: (position) => (startY + position) * width + startX + position,
  }
}

function getLinePosition(direction: PixelSortDirection, x: number, y: number) {
  return direction === 'horizontal' ? x : direction === 'vertical' ? y : Math.min(x, y)
}

function getBlockBounds(
  position: number,
  lineLength: number,
  lineCoordinate: number,
  settings: PixelSortSettings,
) {
  const phase = getPixelSortBlockPhase(lineCoordinate, settings.streakLength, settings.randomness)
  const nominalStart = Math.floor((position + phase) / settings.streakLength) * settings.streakLength - phase
  return {
    blockEnd: Math.min(lineLength, nominalStart + settings.streakLength),
    blockStart: Math.max(0, nominalStart),
  }
}

function isEligibleAt(
  source: Uint8Array | Uint8ClampedArray,
  pixelIndex: number,
  threshold: number,
  mode: PixelSortMode,
) {
  return isPixelSortSpanStart(readRgb(source, pixelIndex), threshold, mode)
}

function readRgb(
  source: Uint8Array | Uint8ClampedArray,
  pixelIndex: number,
): PixelSortRgb {
  const offset = pixelIndex * 4
  return [source[offset] / 255, source[offset + 1] / 255, source[offset + 2] / 255]
}

function directionVector(direction: PixelSortDirection): PixelSortVec2 {
  switch (direction) {
    case 'horizontal': return [1, 0]
    case 'vertical': return [0, 1]
    case 'diagonal': return [1, 1]
  }
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

function assertInput(
  rgba: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  settings: PixelSortSettings,
) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new RangeError('Pixel Sort dimensions must be positive integers')
  }
  if (rgba.length !== width * height * 4) {
    throw new RangeError('Pixel Sort RGBA input length must equal width * height * 4')
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
  return Math.min(1, Math.max(0, value))
}
