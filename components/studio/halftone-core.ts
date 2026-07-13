export type HalftoneRgb = readonly [number, number, number]
export type HalftoneShape = 'circle' | 'square' | 'diamond' | 'line'
export type HalftoneColorMode = 'mono' | 'original'

export type HalftoneSettings = Readonly<{
  shape: HalftoneShape
  dotScale: number
  spacing: number
  angle: number
  invert: boolean
  brightness: number
  contrast: number
  colorMode: HalftoneColorMode
  foreground: HalftoneRgb
  background: HalftoneRgb
}>

export type HalftoneReferenceInput = Readonly<{
  rgb: Uint8Array | Uint8ClampedArray
  width: number
  height: number
  settings: HalftoneSettings
}>

export type HalftoneReferenceOutput = Readonly<{
  data: Uint8ClampedArray
  width: number
  height: number
  channels: 3
}>

export const DEFAULT_HALFTONE_SETTINGS: HalftoneSettings = {
  shape: 'circle',
  dotScale: 1,
  spacing: 8,
  angle: 45,
  invert: false,
  brightness: 0,
  contrast: 0,
  colorMode: 'mono',
  foreground: [255, 255, 255],
  background: [0, 0, 0],
}

export function renderHalftoneReference({
  rgb,
  width,
  height,
  settings,
}: HalftoneReferenceInput): HalftoneReferenceOutput {
  assertInput(rgb, width, height)

  const data = new Uint8ClampedArray(width * height * 3)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sourceOffset = (y * width + x) * 3
      const source: HalftoneRgb = [
        rgb[sourceOffset],
        rgb[sourceOffset + 1],
        rgb[sourceOffset + 2],
      ]
      const adjustedSource = adjustSourceColor(source, settings.brightness, settings.contrast)
      const luminance = adjustedSource[0] * 0.299
        + adjustedSource[1] * 0.587
        + adjustedSource[2] * 0.114
      const invertedLuminance = settings.invert ? 1 - luminance : luminance
      const value = clamp01(
        invertedLuminance + paperNoise(x, y) * 0.02 * settings.dotScale,
      )
      const radius = Math.sqrt(clamp01(value)) * 0.5
      const local = halftoneCellPosition(x, y, settings.spacing, settings.angle)
      const ink = shapeDistance(local.x, local.y, settings.shape) <= radius
      const color = ink
        ? settings.colorMode === 'original'
          ? normalizedToRgb(adjustedSource)
          : settings.foreground
        : settings.background

      data.set(color, sourceOffset)
    }
  }

  return { channels: 3, data, height, width }
}

function paperNoise(x: number, y: number) {
  return hashNoise(x * 0.1, y * 0.1) * 0.5
    + hashNoise(x * 0.2, y * 0.2) * 0.25
    + hashNoise(x * 0.4, y * 0.4) * 0.125
}

function hashNoise(x: number, y: number) {
  return fract(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) * 2 - 1
}

function adjustSourceColor(source: HalftoneRgb, brightness: number, contrast: number): HalftoneRgb {
  const normalizedBrightness = brightness / 100
  const normalizedContrast = contrast / 100
  const contrastFactor = (1 + normalizedContrast) / (1 - 0.99 * normalizedContrast)

  const adjust = (channel: number) => clamp01(
    (channel / 255 + normalizedBrightness - 0.5) * contrastFactor + 0.5,
  )

  return [adjust(source[0]), adjust(source[1]), adjust(source[2])]
}

function normalizedToRgb(color: HalftoneRgb): HalftoneRgb {
  return [color[0] * 255, color[1] * 255, color[2] * 255]
}

function shapeDistance(x: number, y: number, shape: HalftoneShape) {
  switch (shape) {
    case 'square':
      return Math.max(Math.abs(x), Math.abs(y))
    case 'diamond':
      return Math.abs(x) + Math.abs(y)
    case 'line':
      return Math.abs(y)
    case 'circle':
      return Math.hypot(x, y)
  }
}

function halftoneCellPosition(x: number, y: number, spacing: number, angle: number) {
  const radians = angle * Math.PI / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  const pixelX = x + 0.5
  const pixelY = y + 0.5
  const rotatedX = pixelX * cosine - pixelY * sine
  const rotatedY = pixelX * sine + pixelY * cosine

  return {
    x: fract(rotatedX / spacing) - 0.5,
    y: fract(rotatedY / spacing) - 0.5,
  }
}

function assertInput(rgb: Uint8Array | Uint8ClampedArray, width: number, height: number) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new RangeError('Halftone dimensions must be positive integers')
  }
  if (rgb.length !== width * height * 3) {
    throw new RangeError('Halftone RGB input length must equal width * height * 3')
  }
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function fract(value: number) {
  return value - Math.floor(value)
}
