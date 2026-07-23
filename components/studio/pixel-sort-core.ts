export type PixelSortRgb = readonly [number, number, number]
export type PixelSortRgba = readonly [number, number, number, number]
export type PixelSortVec2 = readonly [number, number]
export type PixelSortDirection = 'horizontal' | 'vertical' | 'diagonal' | 'anti-diagonal' | 'radial'
export type PixelSortMode = 'brightness' | 'hue' | 'saturation' | 'dark' | 'depth'
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
  startColor: string
  middleColor: string
  endColor: string
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
  mode: 'depth',
  threshold: 0.25,
  streakLength: 500,
  intensity: 1,
  randomness: 0.5,
  reverse: false,
  brightness: 0,
  contrast: 0,
  mix: 1,
  startColor: '#35115c',
  middleColor: '#c93472',
  endColor: '#e6a928',
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
 * Legacy modes order by luminance; Model Depth orders by the encoded depth alpha.
 */
export function isPixelSortSpanStart(
  color: PixelSortRgb,
  threshold: number,
  mode: PixelSortMode,
  depth = 1,
) {
  void depth
  switch (mode) {
    case 'brightness':
      return isExactBlack(color) || luminance(color) > threshold * 0.25
    case 'hue':
      return isExactBlack(color) || luminance(color) < 1 - threshold * 0.25
    case 'saturation':
      return isExactBlack(color) || maximumChannel(color) > threshold
    case 'dark':
      return maximumChannel(color) < threshold
    case 'depth':
      // Model Depth partitions every rendered texel into the scanline. The
      // threshold controls reach/capacity, not region membership; exact black
      // remains traversable and contributes a zero metric below.
      return true
  }
}

export function getPixelSortDepthReach(depth: number, threshold: number) {
  if (depth < threshold) return 0
  if (threshold >= 1) return depth >= 1 ? 1 : 0
  return clamp01((depth - threshold) / (1 - threshold))
}

/**
 * Mode-specific contribution used to choose a dynamic streak length. The
 * eligibility predicate above intentionally remains independent of this
 * metric, so this only controls how far an eligible run is consumed.
 */
export function getPixelSortModeMetric(
  color: PixelSortRgb,
  mode: PixelSortMode,
  depth = 1,
  threshold = 0.25,
) {
  if (isExactBlack(color)) return 0
  switch (mode) {
    case 'brightness':
      return luminance(color) > threshold * 0.25 ? luminance(color) : 0
    case 'hue':
      return luminance(color) < 1 - threshold * 0.25 ? 1 - luminance(color) : 0
    case 'saturation':
      return maximumChannel(color) > threshold ? maximumChannel(color) : 0
    case 'dark':
      return maximumChannel(color) < threshold ? 1 - maximumChannel(color) : 0
    case 'depth':
      return Math.max(getPixelSortDepthReach(depth, threshold), maximumChannel(color))
  }
}

/** Exact CPU/export renderer for boundary-led connected scanlines. */
export function renderPixelSortFrame({
  rgba,
  width,
  height,
  settings,
}: PixelSortFrameInput): PixelSortFrameOutput {
  assertInput(rgba, width, height, settings)

  const data = new Uint8ClampedArray(rgba.length)
  for (let offset = 0; offset < rgba.length; offset += 4) {
    const source = readRgb(rgba, offset / 4)
    const depth = rgba[offset + 3] / 255
    const base = isExactBlack(source)
      ? hexToRgb(settings.background)
      : mixRgb(source, mapPixelSortGradient(source, depth, settings), settings.mix)
    data[offset] = clamp01(base[0]) * 255
    data[offset + 1] = clamp01(base[1]) * 255
    data[offset + 2] = clamp01(base[2]) * 255
    data[offset + 3] = 255
  }

  for (const line of createScanlines(width, height, settings.direction)) {
    renderTrailScanline(data, rgba, line, settings)
  }

  for (let offset = 0; offset < data.length; offset += 4) {
    const composed: PixelSortRgb = [data[offset] / 255, data[offset + 1] / 255, data[offset + 2] / 255]
    const adjusted = adjustSource(
      clampRgb(composed),
      settings.brightness,
      settings.contrast,
    )
    data[offset] = adjusted[0] * 255
    data[offset + 1] = adjusted[1] * 255
    data[offset + 2] = adjusted[2] * 255
  }

  return { channels: 4, data, height, width }
}

export function getPixelSortLineFactor(lineCoordinate: number, randomness: number) {
  if (randomness === 0) return 1
  return clamp01(hashPixelSort11(lineCoordinate * 0.173)) ** randomness
}

function renderTrailScanline(
  output: Uint8ClampedArray,
  source: Uint8Array | Uint8ClampedArray,
  line: ScanlineDescriptor,
  settings: PixelSortSettings,
) {
  const lineFactor = getPixelSortLineFactor(line.coordinate, settings.randomness)
  let valid = false
  let distance = -1
  let accumulatedReach = 0
  for (let sequence = 0; sequence < line.length; sequence += 1) {
    const position = settings.reverse ? line.length - 1 - sequence : sequence
    const pixelIndex = line.indexAt(position)
    const color = readRgb(source, pixelIndex)
    const occupied = !isExactBlack(color)
    const localReach = getPixelSortModeMetric(
      color,
      settings.mode,
      readDepth(source, pixelIndex),
      settings.threshold,
    )
    if (occupied) {
      valid = true
      distance = 0
      accumulatedReach = localReach
    } else if (valid) {
      distance += 1
    }

    const limit = Math.min(
      settings.streakLength,
      settings.streakLength * lineFactor * clamp01(accumulatedReach),
    )
    const foregroundActive = occupied && valid
    const exteriorActive = !occupied && valid && limit > 0 && distance <= limit
    if (foregroundActive || exteriorActive) {
      const gradientScale = foregroundActive
        ? Math.max(settings.streakLength * lineFactor, 1)
        : Math.max(limit, 1e-12)
      const gradientPosition = foregroundActive
        ? (sequence / gradientScale) % 1
        : distance / gradientScale
      const gradient = mapPixelSortGradient(color, gradientPosition, settings)
      const offset = pixelIndex * 4
      const base: PixelSortRgb = [output[offset] / 255, output[offset + 1] / 255, output[offset + 2] / 255]
      const overlaid = mixRgb(base, gradient, settings.intensity)
      output[offset] = clamp01(overlaid[0]) * 255
      output[offset + 1] = clamp01(overlaid[1]) * 255
      output[offset + 2] = clamp01(overlaid[2]) * 255
    }
  }
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
  const blockStart = 0
  const blockEnd = line.length
  let spanStart = linePosition
  let spanEnd = linePosition
  const eligible = isEligibleAt(rgba, line.indexAt(linePosition), variedThreshold, settings.mode)

  if (eligible) {
    while (
      spanStart > 0
      && isEligibleAt(rgba, line.indexAt(spanStart - 1), variedThreshold, settings.mode)
    ) spanStart -= 1
    while (
      spanEnd + 1 < line.length
      && isEligibleAt(rgba, line.indexAt(spanEnd + 1), variedThreshold, settings.mode)
    ) spanEnd += 1

    const phase = getPixelSortBlockPhase(line.coordinate, settings.streakLength, settings.randomness)
    const chunk = getDynamicChunks(rgba, line, spanStart, spanEnd + 1, settings, phase)
      .find(({ start, end }) => linePosition >= start && linePosition < end)
    if (chunk) {
      spanStart = chunk.start
      spanEnd = chunk.end - 1
    }
  }

  const spanSize = eligible ? spanEnd - spanStart + 1 : 0

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

type PixelSortChunk = Readonly<{ start: number; end: number }>

function getDynamicChunks(
  source: Uint8Array | Uint8ClampedArray,
  line: ScanlineDescriptor,
  start: number,
  end: number,
  settings: PixelSortSettings,
  phase: number,
): PixelSortChunk[] {
  const windowMax = getForwardWindowMax(
    source,
    line,
    start,
    end,
    settings.streakLength,
    settings.mode,
    settings.threshold,
  )
  const chunks: PixelSortChunk[] = []
  let cursor = start
  let first = true
  while (cursor < end) {
    const rawCap = Math.max(1, Math.round(settings.streakLength * windowMax[cursor - start]!))
    const phaseRemainder = (cursor + phase) % rawCap
    const cap = first
      ? Math.max(1, phaseRemainder === 0 ? rawCap : rawCap - phaseRemainder)
      : rawCap
    const chunkEnd = Math.min(end, cursor + cap)
    chunks.push({ end: chunkEnd, start: cursor })
    cursor = chunkEnd
    first = false
  }
  return chunks
}

/** O(n) forward sliding-window maximum over an eligible region. */
function getForwardWindowMax(
  source: Uint8Array | Uint8ClampedArray,
  line: ScanlineDescriptor,
  start: number,
  end: number,
  windowSize: number,
  mode: PixelSortMode,
  threshold: number,
) {
  const length = end - start
  const values = new Float64Array(length)
  for (let index = 0; index < length; index += 1) {
    const pixelIndex = line.indexAt(start + index)
    values[index] = getPixelSortModeMetric(
      readRgb(source, pixelIndex),
      mode,
      readDepth(source, pixelIndex),
      threshold,
    )
  }

  const result = new Float64Array(length)
  const deque = new Int32Array(length)
  let dequeStart = length
  let dequeEnd = length
  for (let index = length - 1; index >= 0; index -= 1) {
    while (dequeStart < dequeEnd && deque[dequeEnd - 1]! >= index + windowSize) dequeEnd -= 1
    while (dequeStart < dequeEnd && values[deque[dequeStart]!]! <= values[index]!) dequeStart += 1
    dequeStart -= 1
    deque[dequeStart] = index
    result[index] = values[deque[dequeEnd - 1]!]!
  }
  return result
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
  const maxRadius = Math.max(1, Math.ceil(Math.hypot(width, height) / 2))
  const rayCount = Math.max(1, Math.ceil(Math.PI * 2 * maxRadius))
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

function isEligibleAt(
  source: Uint8Array | Uint8ClampedArray,
  pixelIndex: number,
  threshold: number,
  mode: PixelSortMode,
) {
  return isPixelSortSpanStart(
    readRgb(source, pixelIndex),
    threshold,
    mode,
    readDepth(source, pixelIndex),
  )
}

function readRgb(
  source: Uint8Array | Uint8ClampedArray,
  pixelIndex: number,
): PixelSortRgb {
  const offset = pixelIndex * 4
  return [source[offset] / 255, source[offset + 1] / 255, source[offset + 2] / 255]
}

function readDepth(
  source: Uint8Array | Uint8ClampedArray,
  pixelIndex: number,
) {
  return source[pixelIndex * 4 + 3] / 255
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

export function mapPixelSortGradient(
  color: PixelSortRgb,
  mappingT: number,
  settings: Pick<PixelSortSettings, 'startColor' | 'middleColor' | 'endColor' | 'background'>,
): PixelSortRgb {
  const gradient = {
    start: hexToRgb(settings.startColor),
    middle: hexToRgb(settings.middleColor),
    end: hexToRgb(settings.endColor),
  }
  const t = clamp01(mappingT)
  if (t <= 0.5) return interpolateOklch(gradient.start, gradient.middle, t * 2)
  return interpolateOklch(gradient.middle, gradient.end, (t - 0.5) * 2)
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
  if (!(['brightness', 'hue', 'saturation', 'dark', 'depth'] as const).includes(settings.mode)) {
    throw new RangeError('Pixel Sort mode must be brightness, hue, saturation, dark, or depth')
  }
  assertRange('threshold', settings.threshold, 0, 0.5)
  assertRange('streakLength', settings.streakLength, 1, 2000)
  if (!Number.isInteger(settings.streakLength)) {
    throw new RangeError('Pixel Sort streakLength must be an integer')
  }
  assertRange('intensity', settings.intensity, 0, 2)
  assertRange('randomness', settings.randomness, 0, 5)
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
