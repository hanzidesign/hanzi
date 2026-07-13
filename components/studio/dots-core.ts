export type DotsRgb = readonly [number, number, number]
export type DotsVec2 = readonly [number, number]
export type DotsShape = 'circle' | 'square' | 'diamond'
export type DotsGridType = 'square' | 'hex'
export type DotsColorMode = 'original' | 'custom'

export type DotsSettings = Readonly<{
  shape: DotsShape
  gridType: DotsGridType
  sizeMultiplier: number
  spacing: number
  invert: boolean
  brightness: number
  contrast: number
  colorMode: DotsColorMode
  foreground: DotsRgb
  background: DotsRgb
}>

export type DotsReferenceInput = Readonly<{
  rgb: Uint8Array | Uint8ClampedArray
  width: number
  height: number
  settings: DotsSettings
}>

export type DotsReferenceOutput = Readonly<{
  data: Uint8ClampedArray
  width: number
  height: number
  channels: 3
}>

export const DEFAULT_DOTS_SETTINGS: DotsSettings = {
  shape: 'circle',
  gridType: 'square',
  sizeMultiplier: 1,
  spacing: 1,
  invert: false,
  brightness: 0,
  contrast: 0,
  colorMode: 'original',
  foreground: [255, 255, 255],
  background: [0, 0, 0],
}

const HEX_RATIO = 0.866
const DIAMOND_SCALE = 1.4

/** Returns the production shader's lattice center in output-pixel coordinates. */
export function getDotsCellCenter(
  pixelX: number,
  pixelY: number,
  spacing: number,
  gridType: DotsGridType,
): DotsVec2 {
  const baseSpacing = 8 * spacing

  if (gridType === 'hex') {
    const hexSpacingY = baseSpacing * HEX_RATIO
    const row = Math.floor(pixelY / hexSpacingY)
    const xOffset = (row & 1) === 1 ? baseSpacing * 0.5 : 0
    const cellX = Math.floor((pixelX - xOffset) / baseSpacing)
    return [
      (cellX + 0.5) * baseSpacing + xOffset,
      (row + 0.5) * hexSpacingY,
    ]
  }

  return [
    (Math.floor(pixelX / baseSpacing) + 0.5) * baseSpacing,
    (Math.floor(pixelY / baseSpacing) + 0.5) * baseSpacing,
  ]
}

/** Uses strict comparisons because Grainrad leaves exact shape boundaries outside. */
export function isInsideDotsShape(
  localX: number,
  localY: number,
  radius: number,
  shape: DotsShape,
) {
  switch (shape) {
    case 'circle':
      return localX * localX + localY * localY < radius * radius
    case 'square':
      return Math.max(Math.abs(localX), Math.abs(localY)) < radius
    case 'diamond':
      return Math.abs(localX) + Math.abs(localY) < radius * DIAMOND_SCALE
  }
}

export function renderDotsReference({
  rgb,
  width,
  height,
  settings,
}: DotsReferenceInput): DotsReferenceOutput {
  assertInput(rgb, width, height, settings)

  const data = new Uint8ClampedArray(width * height * 3)
  const baseSpacing = 8 * settings.spacing
  const baseRadius = baseSpacing * 0.4 * settings.sizeMultiplier
  const background = normalizeRgb(settings.background)

  // Grainrad uploads UI `custom` as shader mode 1 (grayscale), not mode 2
  // (foreground tint). Keep foreground validated but deliberately unused.
  void settings.foreground

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelX = x + 0.5
      const pixelY = y + 0.5
      const center = getDotsCellCenter(pixelX, pixelY, settings.spacing, settings.gridType)
      const source = sampleLinear(rgb, width, height, center[0] / width, center[1] / height)
      const adjusted = adjustSource(source, settings.brightness, settings.contrast)
      const sourceLuminance = luminance(adjusted)
      const mappedLuminance = settings.invert ? 1 - sourceLuminance : sourceLuminance
      const radius = baseRadius * (0.2 + mappedLuminance * 0.8)
      const inside = isInsideDotsShape(
        pixelX - center[0],
        pixelY - center[1],
        radius,
        settings.shape,
      )
      const dotColor: DotsRgb = settings.colorMode === 'custom'
        ? [mappedLuminance, mappedLuminance, mappedLuminance]
        : adjusted
      const color = inside ? dotColor : background
      const offset = (y * width + x) * 3

      data[offset] = clamp01(color[0]) * 255
      data[offset + 1] = clamp01(color[1]) * 255
      data[offset + 2] = clamp01(color[2]) * 255
    }
  }

  return { channels: 3, data, height, width }
}

function sampleLinear(
  rgb: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  u: number,
  v: number,
): DotsRgb {
  const texelX = clamp01(u) * width - 0.5
  const texelY = clamp01(v) * height - 0.5
  const x0 = Math.floor(texelX)
  const y0 = Math.floor(texelY)
  const x1 = x0 + 1
  const y1 = y0 + 1
  const mixX = texelX - x0
  const mixY = texelY - y0
  const topLeft = sampleTexel(rgb, width, height, x0, y0)
  const topRight = sampleTexel(rgb, width, height, x1, y0)
  const bottomLeft = sampleTexel(rgb, width, height, x0, y1)
  const bottomRight = sampleTexel(rgb, width, height, x1, y1)

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
): DotsRgb {
  const clampedX = Math.min(width - 1, Math.max(0, x))
  const clampedY = Math.min(height - 1, Math.max(0, y))
  const offset = (clampedY * width + clampedX) * 3
  return [rgb[offset] / 255, rgb[offset + 1] / 255, rgb[offset + 2] / 255]
}

function adjustSource(source: DotsRgb, brightness: number, contrast: number): DotsRgb {
  const normalizedBrightness = brightness / 100
  const normalizedContrast = contrast / 100
  const contrastFactor = (1 + normalizedContrast) / (1 - normalizedContrast * 0.99)
  const adjust = (channel: number) => clamp01(
    (channel + normalizedBrightness - 0.5) * contrastFactor + 0.5,
  )
  return [adjust(source[0]), adjust(source[1]), adjust(source[2])]
}

function luminance(color: DotsRgb) {
  return color[0] * 0.299 + color[1] * 0.587 + color[2] * 0.114
}

function normalizeRgb(color: DotsRgb): DotsRgb {
  return [color[0] / 255, color[1] / 255, color[2] / 255]
}

function assertInput(
  rgb: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  settings: DotsSettings,
) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new RangeError('Dots dimensions must be positive integers')
  }
  if (rgb.length !== width * height * 3) {
    throw new RangeError('Dots RGB input length must equal width * height * 3')
  }
  assertSettings(settings)
}

function assertSettings(settings: DotsSettings) {
  if (!(['circle', 'square', 'diamond'] as const).includes(settings.shape)) {
    throw new RangeError('Dots shape must be circle, square, or diamond')
  }
  if (!(['square', 'hex'] as const).includes(settings.gridType)) {
    throw new RangeError('Dots grid type must be square or hex')
  }
  if (!(['original', 'custom'] as const).includes(settings.colorMode)) {
    throw new RangeError('Dots color mode must be original or custom')
  }
  assertRange('sizeMultiplier', settings.sizeMultiplier, 0.5, 2)
  assertRange('spacing', settings.spacing, 0.5, 2)
  assertRange('brightness', settings.brightness, -100, 100)
  assertRange('contrast', settings.contrast, -100, 100)
  if (typeof settings.invert !== 'boolean') {
    throw new TypeError('Dots invert must be boolean')
  }
  assertColor('foreground', settings.foreground)
  assertColor('background', settings.background)
}

function assertRange(name: string, value: number, min: number, max: number) {
  if (!Number.isFinite(value)) throw new RangeError(`Dots ${name} must be finite`)
  if (value < min || value > max) {
    throw new RangeError(`Dots ${name} must be between ${min} and ${max}`)
  }
}

function assertColor(name: string, color: DotsRgb) {
  if (!Array.isArray(color) || color.length !== 3) {
    throw new RangeError(`Dots ${name} must have three color channels`)
  }
  for (const channel of color) {
    if (!Number.isFinite(channel) || channel < 0 || channel > 255) {
      throw new RangeError(`Dots ${name} color channel must be between 0 and 255`)
    }
  }
}

function mix(from: number, to: number, amount: number) {
  return from + (to - from) * amount
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}
