export type MatrixRgb = readonly [number, number, number]
export type MatrixVec2 = readonly [number, number]
export type MatrixRainDirection = 'down' | 'up' | 'left' | 'right'

export const MATRIX_RAIN_DIRECTION_IDS: Record<MatrixRainDirection, number> = {
  down: 1,
  up: 0,
  left: 3,
  right: 2,
}

export type MatrixGlyphMask = Readonly<{
  data: Float32Array | Uint8Array | Uint8ClampedArray
  width: number
  height: number
}>

export type MatrixRainSettings = Readonly<{
  cellSize: number
  spacing: number
  speed: number
  trailLength: number
  direction: MatrixRainDirection
  glow: number
  bgOpacity: number
  brightness: number
  contrast: number
  threshold: number
  foreground: MatrixRgb
  rainColor: MatrixRgb
  background: MatrixRgb
}>

export type MatrixRainReferenceInput = Readonly<{
  rgb: Uint8Array | Uint8ClampedArray
  width: number
  height: number
  time: number
  settings: MatrixRainSettings
  glyphs: readonly MatrixGlyphMask[]
}>

export type MatrixRainReferenceOutput = Readonly<{
  data: Uint8ClampedArray
  width: number
  height: number
  channels: 3
}>

export type MatrixRainIntensityInput = Readonly<{
  columnIndex: number
  rowPosition: number
  time: number
  speed: number
  trailLength: number
  direction: MatrixRainDirection
}>

export const DEFAULT_MATRIX_RAIN_SETTINGS: MatrixRainSettings = {
  cellSize: 12,
  spacing: 0,
  speed: 1,
  trailLength: 15,
  direction: 'down',
  glow: 1,
  bgOpacity: 0.5,
  brightness: 0,
  contrast: 0,
  threshold: 0,
  foreground: [255, 255, 255],
  rainColor: [0, 255, 0],
  background: [0, 0, 0],
}

const DROP_COUNT = 3

/** Studio's scalar hash, kept public so shader parity tests can share fixed vectors. */
export function hash11(value: number) {
  let hashed = fract(value * 0.1031)
  hashed *= hashed + 33.33
  hashed *= hashed + hashed
  return fract(hashed)
}

/** Studio's vec2 hash, kept public so glyph selection can be tested independently. */
export function hash21([x, y]: MatrixVec2) {
  const p = [fract(x * 0.1031), fract(y * 0.1031), fract(x * 0.1031)]
  const dot = p[0] * (p[1] + 33.33)
    + p[1] * (p[2] + 33.33)
    + p[2] * (p[0] + 33.33)
  const px = p[0] + dot
  const py = p[1] + dot
  const pz = p[2] + dot
  return fract((px + py) * pz)
}

export function getMatrixRainIntensity({
  columnIndex,
  rowPosition,
  time,
  speed,
  trailLength,
  direction,
}: MatrixRainIntensityInput) {
  let intensity = 0
  let isHead = false

  for (let drop = 0; drop < DROP_COUNT; drop += 1) {
    const seed = columnIndex * 73.156 + drop * 31.71
    const dropSpeed = 0.5 + hash11(seed) * 0.5
    const phase = hash11(seed + 17.3)
    const length = trailLength * (0.7 + hash11(seed + 41.7) * 0.6)
    const headPosition = fract(time * speed * dropSpeed * 0.15 + phase)
    const forward = direction === 'up' || direction === 'left'
    let distance = forward
      ? headPosition - rowPosition
      : rowPosition - (1 - headPosition)

    if (distance < 0) distance += 1
    if (distance >= length) continue

    const trailIntensity = 1 - distance / length
    intensity = Math.max(intensity, trailIntensity * trailIntensity)
    if (distance < 0.02) isHead = true
  }

  return { intensity, isHead }
}

export function selectMatrixGlyphIndex(
  cell: MatrixVec2,
  time: number,
  charsetLength: number,
  // Accepted only by parity probes: Studio deliberately excludes rain Speed here.
  _rainSpeed?: number,
) {
  void _rainSpeed
  const safeLength = Math.max(1, Math.floor(charsetLength))
  const animationIndex = Math.floor(hash21(cell) * 50 + time * 2)
  return Math.floor(hash11(animationIndex) * safeLength) % safeLength
}

export function sampleMatrixGlyphMask(
  glyph: MatrixGlyphMask,
  [u, v]: MatrixVec2,
  spacing: number,
) {
  assertGlyph(glyph)
  const margin = 0.05 + spacing * 0.15
  if (u < margin || u > 1 - margin || v < margin || v > 1 - margin) return 0

  const innerU = clamp01((u - margin) / (1 - 2 * margin))
  const innerV = clamp01((v - margin) / (1 - 2 * margin))
  const x = Math.min(glyph.width - 1, Math.floor(innerU * glyph.width))
  const y = Math.min(glyph.height - 1, Math.floor(innerV * glyph.height))
  return normalizeGlyphSample(glyph.data[y * glyph.width + x], glyph.data)
}

export function renderMatrixRainReference({
  rgb,
  width,
  height,
  time,
  settings,
  glyphs,
}: MatrixRainReferenceInput): MatrixRainReferenceOutput {
  assertInput(rgb, width, height, glyphs)

  const data = new Uint8ClampedArray(width * height * 3)
  const baseCellSize = Math.max(settings.cellSize, 4)
  const totalCellSize = baseCellSize * (1 + settings.spacing)
  const cellsX = width / totalCellSize
  const cellsY = height / totalCellSize
  const horizontal = settings.direction === 'left' || settings.direction === 'right'
  const normalizedForeground = normalizeRgb(settings.foreground)
  const normalizedRainColor = normalizeRgb(settings.rainColor)
  const normalizedBackground = normalizeRgb(settings.background)
  const edgeSampleOffset = 1 / Math.max(cellsX, cellsY)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const u = (x + 0.5) / width
      const v = (y + 0.5) / height
      const rawSource = sampleSource(rgb, width, height, u, v)
      const adjustedSource = adjustSource(rawSource, settings.brightness, settings.contrast)
      const cellX = Math.floor(u * cellsX)
      const cellY = Math.floor(v * cellsY)
      const cellUv: MatrixVec2 = horizontal
        ? [fract(v * cellsY), fract(u * cellsX)]
        : [fract(u * cellsX), fract(v * cellsY)]
      const columnIndex = horizontal ? cellY : cellX
      const rowPosition = horizontal ? u : v
      const rain = getMatrixRainIntensity({
        columnIndex,
        direction: settings.direction,
        rowPosition,
        speed: settings.speed,
        time,
        trailLength: settings.trailLength / 50,
      })
      const cellCenter = sampleSource(
        rgb,
        width,
        height,
        (cellX + 0.5) / cellsX,
        (cellY + 0.5) / cellsY,
      )
      const cellBrightness = luminance(cellCenter)
      const glyphIndex = selectMatrixGlyphIndex([cellX, cellY], time, glyphs.length)
      const glyphPattern = sampleMatrixGlyphMask(glyphs[glyphIndex], cellUv, settings.spacing)
      const left = luminance(sampleSource(rgb, width, height, u - edgeSampleOffset, v))
      const right = luminance(sampleSource(rgb, width, height, u + edgeSampleOffset, v))
      const top = luminance(sampleSource(rgb, width, height, u, v - edgeSampleOffset))
      const bottom = luminance(sampleSource(rgb, width, height, u, v + edgeSampleOffset))
      const edgeStrength = Math.abs(left - right) + Math.abs(top - bottom)
      const sourcePresence = cellBrightness >= 0.0001 ? 1 : 0
      const rainThresholdMask = cellBrightness >= settings.threshold ? 1 : 0
      const modelThresholdMask = sourcePresence * rainThresholdMask
      const effectiveRain = rain.intensity * rainThresholdMask
      const glyphVisibility = glyphPattern * rainThresholdMask
      const modelGlyphMask = glyphPattern * modelThresholdMask
      const modelOpacity = clamp01(modelGlyphMask)
      const modelShade = 0.55 + 0.45 * luminance(adjustedSource)
      const modelCharacters = scaleRgb(
        normalizedForeground,
        modelOpacity * modelShade,
      )
      const dimmedRain = scaleRgb(normalizedRainColor, 0.5 + cellBrightness * 0.5)
      const tintedRain = adjustSource(
        mixRgb(normalizedRainColor, dimmedRain, 0.3),
        settings.brightness,
        settings.contrast,
      )
      let rainOpacity = effectiveRain * glyphVisibility
      let glyphColor = scaleRgb(tintedRain, rainOpacity)

      if (rain.isHead && glyphPattern > 0.5) {
        const headBrightness = 0.7 + edgeStrength * 0.5
        const headColor = adjustSource(
          mixRgb(normalizedRainColor, [1, 1, 1], headBrightness),
          settings.brightness,
          settings.contrast,
        )
        glyphColor = maxRgb(
          glyphColor,
          scaleRgb(headColor, glyphVisibility * settings.glow),
        )
        rainOpacity = Math.max(rainOpacity, glyphVisibility * settings.glow)
      }
      const backgroundRainOpacity = sourcePresence > 0 ? 1 : settings.bgOpacity
      glyphColor = scaleRgb(glyphColor, backgroundRainOpacity)
      rainOpacity *= backgroundRainOpacity

      const effectOpacity = 1 - (1 - modelOpacity) * (1 - clamp01(rainOpacity))
      const result = addRgb(
        scaleRgb(normalizedBackground, 1 - effectOpacity),
        addRgb(modelCharacters, glyphColor),
      )
      const outputOffset = (y * width + x) * 3
      data[outputOffset] = clamp01(result[0]) * 255
      data[outputOffset + 1] = clamp01(result[1]) * 255
      data[outputOffset + 2] = clamp01(result[2]) * 255
    }
  }

  return { channels: 3, data, height, width }
}

function sampleSource(
  rgb: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  u: number,
  v: number,
): MatrixRgb {
  const x = Math.min(width - 1, Math.floor(clamp01(u) * width))
  const y = Math.min(height - 1, Math.floor(clamp01(v) * height))
  const offset = (y * width + x) * 3
  return [rgb[offset] / 255, rgb[offset + 1] / 255, rgb[offset + 2] / 255]
}

function adjustSource(source: MatrixRgb, brightness: number, contrast: number): MatrixRgb {
  const normalizedBrightness = brightness / 100
  const normalizedContrast = contrast / 100
  const factor = (1 + normalizedContrast) / (1 - normalizedContrast * 0.99)
  const adjust = (channel: number) => clamp01(
    (channel + normalizedBrightness - 0.5) * factor + 0.5,
  )
  return [adjust(source[0]), adjust(source[1]), adjust(source[2])]
}

function luminance(color: MatrixRgb) {
  return color[0] * 0.299 + color[1] * 0.587 + color[2] * 0.114
}

function normalizeRgb(color: MatrixRgb): MatrixRgb {
  return [color[0] / 255, color[1] / 255, color[2] / 255]
}

function scaleRgb(color: MatrixRgb, scale: number): MatrixRgb {
  return [color[0] * scale, color[1] * scale, color[2] * scale]
}

function mixRgb(from: MatrixRgb, to: MatrixRgb, amount: number): MatrixRgb {
  return [
    from[0] * (1 - amount) + to[0] * amount,
    from[1] * (1 - amount) + to[1] * amount,
    from[2] * (1 - amount) + to[2] * amount,
  ]
}

function maxRgb(left: MatrixRgb, right: MatrixRgb): MatrixRgb {
  return [
    Math.max(left[0], right[0]),
    Math.max(left[1], right[1]),
    Math.max(left[2], right[2]),
  ]
}

function addRgb(left: MatrixRgb, right: MatrixRgb): MatrixRgb {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]]
}

function assertInput(
  rgb: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  glyphs: readonly MatrixGlyphMask[],
) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new RangeError('Matrix Rain dimensions must be positive integers')
  }
  if (rgb.length !== width * height * 3) {
    throw new RangeError('Matrix Rain RGB input length must equal width * height * 3')
  }
  if (glyphs.length === 0) throw new RangeError('Matrix Rain requires at least one glyph mask')
  for (const glyph of glyphs) assertGlyph(glyph)
}

function assertGlyph(glyph: MatrixGlyphMask) {
  if (!Number.isInteger(glyph.width) || !Number.isInteger(glyph.height)
    || glyph.width <= 0 || glyph.height <= 0) {
    throw new RangeError('Matrix Rain glyph dimensions must be positive integers')
  }
  if (glyph.data.length !== glyph.width * glyph.height) {
    throw new RangeError('Matrix Rain glyph data length must equal width * height')
  }
}

function normalizeGlyphSample(
  value: number,
  data: MatrixGlyphMask['data'],
) {
  return data instanceof Float32Array ? value : value / 255
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function fract(value: number) {
  return value - Math.floor(value)
}
