export type BlockifyRgb = readonly [number, number, number]
export type BlockifyStyle = 'full' | 'shaded' | 'outline'
export type BlockifyColorMode = 'color' | 'mono'

export type BlockifySettings = Readonly<{
  style: BlockifyStyle
  blockSize: number
  borderWidth: number
  brightness: number
  contrast: number
  colorMode: BlockifyColorMode
  foreground: BlockifyRgb
  background: BlockifyRgb
}>

export type BlockifyReferenceInput = Readonly<{
  rgb: Uint8Array | Uint8ClampedArray
  width: number
  height: number
  settings: BlockifySettings
}>

export type BlockifyReferenceOutput = Readonly<{
  data: Uint8ClampedArray
  width: number
  height: number
  channels: 3
}>

export const DEFAULT_BLOCKIFY_SETTINGS: BlockifySettings = {
  style: 'full',
  blockSize: 8,
  borderWidth: 1,
  brightness: 0,
  contrast: 0,
  colorMode: 'mono',
  foreground: [255, 255, 255],
  background: [0, 0, 0],
}

/**
 * Mirrors Studio's normalized-coordinate linear clamp sampler. Coordinates
 * outside the texture are clamped before bilinear interpolation.
 */
export function sampleBlockifySourceLinear(
  rgb: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  u: number,
  v: number,
): BlockifyRgb {
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

/** Studio uses strict comparisons, leaving values exactly on an edge inside. */
export function isBlockifyOutlinePixel(
  localX: number,
  localY: number,
  blockSize: number,
  borderWidth: number,
) {
  return localX < borderWidth
    || localX > blockSize - borderWidth
    || localY < borderWidth
    || localY > blockSize - borderWidth
}

export function renderBlockifyReference({
  rgb,
  width,
  height,
  settings,
}: BlockifyReferenceInput): BlockifyReferenceOutput {
  assertInput(rgb, width, height, settings)

  const data = new Uint8ClampedArray(width * height * 3)
  const foreground = normalizeRgb(settings.foreground)
  const background = normalizeRgb(settings.background)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelX = x + 0.5
      const pixelY = y + 0.5
      const blockX = Math.floor(pixelX / settings.blockSize)
      const blockY = Math.floor(pixelY / settings.blockSize)
      const blockCenterX = (blockX + 0.5) * settings.blockSize
      const blockCenterY = (blockY + 0.5) * settings.blockSize
      const sampled = sampleBlockifySourceLinear(
        rgb,
        width,
        height,
        blockCenterX / width,
        blockCenterY / height,
      )
      const adjusted = adjustSource(sampled, settings.brightness, settings.contrast)
      const baseColor = settings.colorMode === 'mono'
        ? paletteColor(adjusted, foreground, background)
        : adjusted
      const localX = pixelX - blockX * settings.blockSize
      const localY = pixelY - blockY * settings.blockSize
      const color = applyStyle(baseColor, localX, localY, background, settings)
      const offset = (y * width + x) * 3

      data[offset] = clamp01(color[0]) * 255
      data[offset + 1] = clamp01(color[1]) * 255
      data[offset + 2] = clamp01(color[2]) * 255
    }
  }

  return { channels: 3, data, height, width }
}

function applyStyle(
  color: BlockifyRgb,
  localX: number,
  localY: number,
  background: BlockifyRgb,
  settings: BlockifySettings,
): BlockifyRgb {
  if (settings.style === 'outline') {
    return isBlockifyOutlinePixel(
      localX,
      localY,
      settings.blockSize,
      settings.borderWidth,
    ) ? color : background
  }

  if (settings.style === 'shaded') {
    const normalizedX = localX / settings.blockSize
    const normalizedY = localY / settings.blockSize
    const distance = Math.hypot(normalizedX - 0.5, normalizedY - 0.5)
    const shade = 0.9 + 0.1 * (1 - distance * 1.4)
    return [color[0] * shade, color[1] * shade, color[2] * shade]
  }

  return color
}

function adjustSource(source: BlockifyRgb, brightness: number, contrast: number): BlockifyRgb {
  const normalizedBrightness = brightness / 100
  const normalizedContrast = contrast / 100
  const factor = (1 + normalizedContrast) / (1 - 0.99 * normalizedContrast)
  const adjust = (channel: number) => clamp01(
    (channel + normalizedBrightness - 0.5) * factor + 0.5,
  )
  return [adjust(source[0]), adjust(source[1]), adjust(source[2])]
}

function paletteColor(
  color: BlockifyRgb,
  foreground: BlockifyRgb,
  background: BlockifyRgb,
): BlockifyRgb {
  const luminance = color[0] * 0.299 + color[1] * 0.587 + color[2] * 0.114
  return [
    mix(background[0], foreground[0], luminance),
    mix(background[1], foreground[1], luminance),
    mix(background[2], foreground[2], luminance),
  ]
}

function sampleTexel(
  rgb: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): BlockifyRgb {
  const clampedX = Math.min(width - 1, Math.max(0, x))
  const clampedY = Math.min(height - 1, Math.max(0, y))
  const offset = (clampedY * width + clampedX) * 3
  return [rgb[offset] / 255, rgb[offset + 1] / 255, rgb[offset + 2] / 255]
}

function assertInput(
  rgb: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  settings: BlockifySettings,
) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new RangeError('Blockify dimensions must be positive integers')
  }
  if (rgb.length !== width * height * 3) {
    throw new RangeError('Blockify RGB input length must equal width * height * 3')
  }
  assertSettings(settings)
}

function assertSettings(settings: BlockifySettings) {
  if (!(['full', 'shaded', 'outline'] as const).includes(settings.style)) {
    throw new RangeError('Blockify style must be full, shaded, or outline')
  }
  if (!(['color', 'mono'] as const).includes(settings.colorMode)) {
    throw new RangeError('Blockify color mode must be color or mono')
  }
  assertRange('blockSize', settings.blockSize, 4, 20)
  if (!Number.isInteger(settings.blockSize)) {
    throw new RangeError('Blockify blockSize must be an integer')
  }
  assertRange('borderWidth', settings.borderWidth, 0, 3)
  if (!Number.isInteger(settings.borderWidth * 2)) {
    throw new RangeError('Blockify borderWidth must use increments of 0.5')
  }
  assertRange('brightness', settings.brightness, -100, 100)
  assertRange('contrast', settings.contrast, -100, 100)
  assertColor('foreground', settings.foreground)
  assertColor('background', settings.background)
}

function assertRange(name: string, value: number, min: number, max: number) {
  if (!Number.isFinite(value)) throw new RangeError(`Blockify ${name} must be finite`)
  if (value < min || value > max) {
    throw new RangeError(`Blockify ${name} must be between ${min} and ${max}`)
  }
}

function assertColor(name: string, color: BlockifyRgb) {
  if (!Array.isArray(color) || color.length !== 3) {
    throw new RangeError(`Blockify ${name} must have three color channels`)
  }
  for (const channel of color) {
    if (!Number.isFinite(channel) || channel < 0 || channel > 255) {
      throw new RangeError(`Blockify ${name} color channel must be between 0 and 255`)
    }
  }
}

function normalizeRgb(color: BlockifyRgb): BlockifyRgb {
  return [color[0] / 255, color[1] / 255, color[2] / 255]
}

function mix(from: number, to: number, amount: number) {
  return from + (to - from) * amount
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}
