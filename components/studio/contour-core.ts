export type ContourRgb = readonly [number, number, number]
export type ContourFillMode = 'filled' | 'lines'
export type ContourColorMode = 'original' | 'custom' | 'grayscale'

export type ContourSettings = Readonly<{
  levels: number
  lineThickness: number
  fillMode: ContourFillMode
  invert: boolean
  brightness: number
  contrast: number
  colorMode: ContourColorMode
  lineColor: ContourRgb
  background: ContourRgb
}>

export type ContourReferenceInput = Readonly<{
  rgb: Uint8Array | Uint8ClampedArray
  width: number
  height: number
  settings: ContourSettings
}>

export type ContourReferenceOutput = Readonly<{
  data: Uint8ClampedArray
  width: number
  height: number
  channels: 3
}>

export const DEFAULT_CONTOUR_SETTINGS: ContourSettings = {
  levels: 8,
  lineThickness: 1,
  fillMode: 'filled',
  invert: false,
  brightness: 0,
  contrast: 0,
  colorMode: 'original',
  lineColor: [0, 0, 0],
  background: [255, 255, 255],
}

export function renderContourReference({
  rgb,
  width,
  height,
  settings,
}: ContourReferenceInput): ContourReferenceOutput {
  assertInput(rgb, width, height, settings)

  const data = new Uint8ClampedArray(width * height * 3)
  const lineColor = normalizeRgb(settings.lineColor)
  const background = normalizeRgb(settings.background)
  const sampleOffsetX = settings.lineThickness / width
  const sampleOffsetY = settings.lineThickness / height

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const u = (x + 0.5) / width
      const v = (y + 0.5) / height
      const color = adjustSource(
        sampleLinear(rgb, width, height, u, v),
        settings.brightness,
        settings.contrast,
      )
      const rawCenterBrightness = luminance(color)
      const centerBrightness = settings.invert
        ? 1 - rawCenterBrightness
        : rawCenterBrightness

      // Grainrad's production shader does not invert these four neighbors.
      const left = sampleBrightness(rgb, width, height, u - sampleOffsetX, v, settings)
      const right = sampleBrightness(rgb, width, height, u + sampleOffsetX, v, settings)
      const top = sampleBrightness(rgb, width, height, u, v - sampleOffsetY, settings)
      const bottom = sampleBrightness(rgb, width, height, u, v + sampleOffsetY, settings)
      const centerBand = Math.floor(centerBrightness * settings.levels)
      const isContour = Math.floor(left * settings.levels) !== centerBand
        || Math.floor(right * settings.levels) !== centerBand
        || Math.floor(top * settings.levels) !== centerBand
        || Math.floor(bottom * settings.levels) !== centerBand
      const result = selectColor(
        background,
        centerBrightness,
        color,
        isContour,
        lineColor,
        settings,
      )
      const offset = (y * width + x) * 3

      data[offset] = clamp01(result[0]) * 255
      data[offset + 1] = clamp01(result[1]) * 255
      data[offset + 2] = clamp01(result[2]) * 255
    }
  }

  return { channels: 3, data, height, width }
}

function selectColor(
  background: ContourRgb,
  centerBrightness: number,
  color: ContourRgb,
  isContour: boolean,
  lineColor: ContourRgb,
  settings: ContourSettings,
): ContourRgb {
  if (isContour) return lineColor
  if (settings.fillMode === 'lines') return background

  const midpoint = quantizedMidpoint(centerBrightness, settings.levels)
  switch (settings.colorMode) {
    case 'original':
      return [
        quantizedMidpoint(color[0], settings.levels),
        quantizedMidpoint(color[1], settings.levels),
        quantizedMidpoint(color[2], settings.levels),
      ]
    case 'custom':
      return [
        mix(background[0], lineColor[0], midpoint),
        mix(background[1], lineColor[1], midpoint),
        mix(background[2], lineColor[2], midpoint),
      ]
    case 'grayscale':
      return [midpoint, midpoint, midpoint]
  }
}

function sampleBrightness(
  rgb: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  u: number,
  v: number,
  settings: ContourSettings,
) {
  return luminance(adjustSource(
    sampleLinear(rgb, width, height, u, v),
    settings.brightness,
    settings.contrast,
  ))
}

function sampleLinear(
  rgb: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  u: number,
  v: number,
): ContourRgb {
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

function sampleTexel(
  rgb: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): ContourRgb {
  const clampedX = Math.min(width - 1, Math.max(0, x))
  const clampedY = Math.min(height - 1, Math.max(0, y))
  const offset = (clampedY * width + clampedX) * 3
  return [rgb[offset] / 255, rgb[offset + 1] / 255, rgb[offset + 2] / 255]
}

function adjustSource(source: ContourRgb, brightness: number, contrast: number): ContourRgb {
  const normalizedBrightness = brightness / 100
  const normalizedContrast = contrast / 100
  const contrastFactor = (1 + normalizedContrast) / (1 - normalizedContrast * 0.99)
  const adjust = (channel: number) => clamp01(
    (channel + normalizedBrightness - 0.5) * contrastFactor + 0.5,
  )
  return [adjust(source[0]), adjust(source[1]), adjust(source[2])]
}

function luminance(color: ContourRgb) {
  return color[0] * 0.299 + color[1] * 0.587 + color[2] * 0.114
}

function quantizedMidpoint(value: number, levels: number) {
  return Math.floor(value * levels) / levels + 0.5 / levels
}

function normalizeRgb(color: ContourRgb): ContourRgb {
  return [color[0] / 255, color[1] / 255, color[2] / 255]
}

function assertInput(
  rgb: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  settings: ContourSettings,
) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new RangeError('Contour dimensions must be positive integers')
  }
  if (rgb.length !== width * height * 3) {
    throw new RangeError('Contour RGB input length must equal width * height * 3')
  }
  assertSettings(settings)
}

function assertSettings(settings: ContourSettings) {
  if (!(['filled', 'lines'] as const).includes(settings.fillMode)) {
    throw new RangeError('Contour fill mode must be filled or lines')
  }
  if (!(['original', 'custom', 'grayscale'] as const).includes(settings.colorMode)) {
    throw new RangeError('Contour color mode must be original, custom, or grayscale')
  }
  assertRange('levels', settings.levels, 3, 20)
  if (!Number.isInteger(settings.levels)) throw new RangeError('Contour levels must be an integer')
  assertRange('lineThickness', settings.lineThickness, 0.5, 3)
  assertRange('brightness', settings.brightness, -100, 100)
  assertRange('contrast', settings.contrast, -100, 100)
  if (typeof settings.invert !== 'boolean') {
    throw new TypeError('Contour invert must be boolean')
  }
  assertColor('lineColor', settings.lineColor)
  assertColor('background', settings.background)
}

function assertRange(name: string, value: number, min: number, max: number) {
  if (!Number.isFinite(value)) throw new RangeError(`Contour ${name} must be finite`)
  if (value < min || value > max) {
    throw new RangeError(`Contour ${name} must be between ${min} and ${max}`)
  }
}

function assertColor(name: string, color: ContourRgb) {
  if (!Array.isArray(color) || color.length !== 3) {
    throw new RangeError(`Contour ${name} must have three color channels`)
  }
  for (const channel of color) {
    if (!Number.isFinite(channel) || channel < 0 || channel > 255) {
      throw new RangeError(`Contour ${name} color channel must be between 0 and 255`)
    }
  }
}

function mix(from: number, to: number, amount: number) {
  return from + (to - from) * amount
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}
