export type PixelSortRgb = readonly [number, number, number]
export type PixelSortRgba = readonly [number, number, number, number]
export type PixelSortVec2 = readonly [number, number]
export type PixelSortDirection = 'horizontal' | 'vertical' | 'diagonal' | 'anti-diagonal' | 'radial'
export type PixelSortMode = 'brightness' | 'hue' | 'saturation' | 'dark'
export type PixelSortTheme = 'light' | 'dark'

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
  mix: number
  shadow: string
  midtone: string
  highlight: string
  background: string
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
  direction: PixelSortVec2
  length: number
  indexAt: (position: number) => number
  positionAt: (x: number, y: number) => number
}>

type RadialLayout = Readonly<{
  lines: readonly ScanlineDescriptor[]
  lineByPixel: Int32Array
  positionByPixel: Int32Array
}>

let radialLayoutCache: { key: string; layout: RadialLayout } | null = null

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
  mix: 1,
  shadow: '#35115c',
  midtone: '#c93472',
  highlight: '#e6a928',
  background: '#ffffff',
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
  const mappingT = new Float64Array(width * height)
  for (const line of createScanlines(width, height, settings.direction)) {
    sortScanline(sorted, rgba, line, settings, mappingT)
  }

  const data = new Uint8ClampedArray(rgba.length)
  for (let offset = 0; offset < rgba.length; offset += 4) {
    for (let channel = 0; channel < 4; channel += 1) {
      data[offset + channel] = mix(rgba[offset + channel], sorted[offset + channel], settings.intensity)
    }
    const composed: PixelSortRgb = [
      data[offset] / 255,
      data[offset + 1] / 255,
      data[offset + 2] / 255,
    ]
    const mapped = mapPixelSortPalette(composed, mappingT[offset / 4], settings)
    const output = mixRgb(composed, mapped, settings.mix)
    const outputWithBackground = isExactBlack(composed)
      ? hexToRgb(settings.background)
      : output
    const adjusted = adjustSource(
      clampRgb(outputWithBackground),
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
  const linePosition = line.positionAt(x, y)
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
    direction: line.direction,
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
  mappingT: Float64Array,
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
      const runSize = cursor - runStart
      for (let targetPosition = runStart; targetPosition < cursor; targetPosition += 1) {
        mappingT[line.indexAt(targetPosition)] = runSize <= 1
          ? 0
          : (targetPosition - runStart) / (runSize - 1)
      }
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
  if (direction === 'radial') {
    yield* getRadialLayout(width, height).lines
    return
  }
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

  const coordinateStart = direction === 'anti-diagonal' ? 0 : 1 - height
  const coordinateEnd = direction === 'anti-diagonal' ? width + height - 1 : width
  for (let coordinate = coordinateStart; coordinate < coordinateEnd; coordinate += 1) {
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
  if (direction === 'radial') {
    const layout = getRadialLayout(width, height)
    const lineIndex = layout.lineByPixel[y * width + x]
    if (lineIndex < 0) throw new RangeError('Pixel Sort radial layout does not contain trace coordinates')
    return layout.lines[lineIndex]!
  }
  const coordinate = direction === 'horizontal'
    ? y
    : direction === 'vertical'
      ? x
      : direction === 'anti-diagonal'
        ? x + y
        : x - y
  return createScanline(width, height, direction, coordinate)
}

function createScanline(
  width: number,
  height: number,
  direction: PixelSortDirection,
  coordinate: number,
): ScanlineDescriptor {
  if (direction === 'horizontal') {
    return {
      coordinate,
      direction: [1, 0],
      length: width,
      indexAt: (position) => coordinate * width + position,
      positionAt: (x) => x,
    }
  }
  if (direction === 'vertical') {
    return {
      coordinate,
      direction: [0, 1],
      length: height,
      indexAt: (position) => position * width + coordinate,
      positionAt: (_x, y) => y,
    }
  }
  if (direction === 'anti-diagonal') {
    const startX = Math.max(0, coordinate - (height - 1))
    const startY = coordinate - startX
    const length = Math.min(width - startX, startY + 1)
    return {
      coordinate,
      direction: [1, -1],
      length,
      indexAt: (position) => (startY - position) * width + startX + position,
      positionAt: (x) => x - startX,
    }
  }

  const startX = Math.max(0, coordinate)
  const startY = startX - coordinate
  const length = Math.min(width - startX, height - startY)
  return {
    coordinate,
    direction: [1, 1],
    length,
    indexAt: (position) => (startY + position) * width + startX + position,
    positionAt: (x) => x - startX,
  }
}

function getRadialLayout(width: number, height: number): RadialLayout {
  const key = `${width}x${height}`
  if (radialLayoutCache?.key === key) return radialLayoutCache.layout

  const centerX = (width - 1) / 2
  const centerY = (height - 1) / 2
  const rayCount = Math.max(1, Math.ceil(Math.PI * Math.hypot(width - 1, height - 1)))
  const centerIndex = Number.isInteger(centerX) && Number.isInteger(centerY)
    ? centerY * width + centerX
    : -1
  const pixelCount = width * height
  const sectorForPixel = new Int32Array(pixelCount)
  sectorForPixel.fill(-1)
  const radiusSquared = new Float64Array(pixelCount)
  const sectorCounts = new Int32Array(rayCount)

  for (let index = 0; index < pixelCount; index += 1) {
    if (index === centerIndex) continue
    const x = index % width
    const y = Math.floor(index / width)
    const deltaX = x - centerX
    const deltaY = y - centerY
    const angle = Math.atan2(deltaY, deltaX)
    const normalizedAngle = angle < 0 ? angle + Math.PI * 2 : angle
    const sector = Math.min(
      rayCount - 1,
      Math.floor(normalizedAngle / (Math.PI * 2) * rayCount),
    )
    sectorForPixel[index] = sector
    radiusSquared[index] = deltaX * deltaX + deltaY * deltaY
    sectorCounts[sector] += 1
  }

  const sectorOffsets = new Int32Array(rayCount + 1)
  for (let sector = 0; sector < rayCount; sector += 1) {
    sectorOffsets[sector + 1] = sectorOffsets[sector]! + sectorCounts[sector]!
  }
  const sectorPixels = new Int32Array(sectorOffsets[rayCount]!)
  const sectorCursors = new Int32Array(sectorOffsets)
  for (let index = 0; index < pixelCount; index += 1) {
    const sector = sectorForPixel[index]
    if (sector >= 0) {
      sectorPixels[sectorCursors[sector]!] = index
      sectorCursors[sector] += 1
    }
  }

  const lines: ScanlineDescriptor[] = []
  const lineByPixel = new Int32Array(pixelCount)
  lineByPixel.fill(-1)
  const positionByPixel = new Int32Array(pixelCount)
  positionByPixel.fill(-1)
  for (let sector = 0; sector < rayCount; sector += 1) {
    const start = sectorOffsets[sector]!
    const end = sectorOffsets[sector + 1]!
    const orderedPixels = Array.from(sectorPixels.subarray(start, end))
    orderedPixels.sort((left, right) => radiusSquared[left]! - radiusSquared[right]! || left - right)
    const pixels = Int32Array.from(orderedPixels)
    const angle = (sector + 0.5) * Math.PI * 2 / rayCount
    const line: ScanlineDescriptor = {
      coordinate: sector,
      direction: [Math.cos(angle), Math.sin(angle)],
      length: pixels.length,
      indexAt: (position) => pixels[position]!,
      positionAt: (x, y) => positionByPixel[y * width + x] ?? -1,
    }
    lines.push(line)
    pixels.forEach((pixelIndex, position) => {
      lineByPixel[pixelIndex] = sector
      positionByPixel[pixelIndex] = position
    })
  }

  if (centerIndex >= 0) {
    const centerLine: ScanlineDescriptor = {
      coordinate: rayCount,
      direction: [0, 0],
      length: 1,
      indexAt: () => centerIndex,
      positionAt: () => 0,
    }
    lines.push(centerLine)
    lineByPixel[centerIndex] = lines.length - 1
    positionByPixel[centerIndex] = 0
  }

  const layout: RadialLayout = { lines, lineByPixel, positionByPixel }
  radialLayoutCache = { key, layout }
  return layout
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

function adjustSource(color: PixelSortRgb, brightness: number, contrast: number): PixelSortRgb {
  const normalizedBrightness = brightness / 100
  const normalizedContrast = contrast / 100
  const contrastFactor = (1 + normalizedContrast) / (1 - normalizedContrast * 0.99)
  const adjust = (channel: number) => clamp01(
    (channel + normalizedBrightness - 0.5) * contrastFactor + 0.5,
  )
  return [adjust(color[0]), adjust(color[1]), adjust(color[2])]
}

export function mapPixelSortPalette(
  color: PixelSortRgb,
  mappingT: number,
  settings: Pick<PixelSortSettings, 'shadow' | 'midtone' | 'highlight' | 'background'>,
): PixelSortRgb {
  if (color[0] <= 1e-12 && color[1] <= 1e-12 && color[2] <= 1e-12) {
    return hexToRgb(settings.background)
  }
  const palette = {
    shadow: hexToRgb(settings.shadow),
    midtone: hexToRgb(settings.midtone),
    highlight: hexToRgb(settings.highlight),
  }
  const t = clamp01(mappingT)
  if (t <= 0.5) return interpolateOklch(palette.shadow, palette.midtone, t * 2)
  return interpolateOklch(palette.midtone, palette.highlight, (t - 0.5) * 2)
}

export function hexToRgb(value: string): PixelSortRgb {
  const match = /^#?([\da-f]{6})$/i.exec(value.trim())
  if (!match) return [0, 0, 0]
  const integer = Number.parseInt(match[1], 16)
  return [
    ((integer >> 16) & 0xff) / 255,
    ((integer >> 8) & 0xff) / 255,
    (integer & 0xff) / 255,
  ]
}

/** Interpolates in OKLCH with a shortest-path hue and clamps to sRGB gamut. */
export function interpolateOklch(from: PixelSortRgb, to: PixelSortRgb, amount: number): PixelSortRgb {
  const a = rgbToOklch(from)
  const b = rgbToOklch(to)
  let hueDelta = b[2] - a[2]
  if (hueDelta > Math.PI) hueDelta -= Math.PI * 2
  if (hueDelta < -Math.PI) hueDelta += Math.PI * 2
  return clampRgb(oklchToRgb([
    mix(a[0], b[0], amount),
    mix(a[1], b[1], amount),
    a[2] + hueDelta * amount,
  ]))
}

function rgbToOklch([red, green, blue]: PixelSortRgb): [number, number, number] {
  const [r, g, b] = [red, green, blue].map(srgbToLinear)
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
  const lRoot = Math.cbrt(l)
  const mRoot = Math.cbrt(m)
  const sRoot = Math.cbrt(s)
  const lightness = 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot
  const a = 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot
  const bValue = 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot
  return [lightness, Math.hypot(a, bValue), Math.atan2(bValue, a)]
}

function oklchToRgb([lightness, chroma, hue]: [number, number, number]): PixelSortRgb {
  const a = chroma * Math.cos(hue)
  const b = chroma * Math.sin(hue)
  const lRoot = lightness + 0.3963377774 * a + 0.2158037573 * b
  const mRoot = lightness - 0.1055613458 * a - 0.0638541728 * b
  const sRoot = lightness - 0.0894841775 * a - 1.291485548 * b
  const l = lRoot ** 3
  const m = mRoot ** 3
  const s = sRoot ** 3
  return [
    linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ]
}

function srgbToLinear(value: number) {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

function linearToSrgb(value: number) {
  return value <= 0.0031308 ? value * 12.92 : 1.055 * Math.max(value, 0) ** (1 / 2.4) - 0.055
}

function clampRgb(color: PixelSortRgb): PixelSortRgb {
  return [clamp01(color[0]), clamp01(color[1]), clamp01(color[2])]
}

function isExactBlack(color: PixelSortRgb) {
  return color[0] <= 1e-12 && color[1] <= 1e-12 && color[2] <= 1e-12
}

function mixRgb(from: PixelSortRgb, to: PixelSortRgb, amount: number): PixelSortRgb {
  return [mix(from[0], to[0], amount), mix(from[1], to[1], amount), mix(from[2], to[2], amount)]
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
  if (!(['horizontal', 'vertical', 'diagonal', 'anti-diagonal', 'radial'] as const).includes(settings.direction)) {
    throw new RangeError('Pixel Sort direction must be horizontal, vertical, diagonal, anti-diagonal, or radial')
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
  assertRange('mix', settings.mix, 0, 2)
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
