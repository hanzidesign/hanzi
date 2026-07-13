export type ThresholdRgb = readonly [number, number, number]
export type ThresholdColorMode = 'custom' | 'color'

export type ThresholdSettings = Readonly<{
  levels: number
  thresholdPoint: number
  dither: boolean
  invert: boolean
  brightness: number
  contrast: number
  colorMode: ThresholdColorMode
  foreground: ThresholdRgb
  background: ThresholdRgb
}>

export type ThresholdReferenceInput = Readonly<{
  rgb: Uint8Array | Uint8ClampedArray
  width: number
  height: number
  settings: ThresholdSettings
}>

export type ThresholdReferenceOutput = Readonly<{
  data: Uint8ClampedArray
  width: number
  height: number
  channels: 3
}>

export const DEFAULT_THRESHOLD_SETTINGS: ThresholdSettings = {
  levels: 2,
  thresholdPoint: 0.5,
  dither: false,
  invert: false,
  brightness: 0,
  contrast: 0,
  colorMode: 'custom',
  foreground: [255, 255, 255],
  background: [0, 0, 0],
}

const BAYER_4X4 = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
] as const

export function getThresholdBayer4Value(x: number, y: number) {
  const matrixX = ((Math.floor(x) % 4) + 4) % 4
  const matrixY = ((Math.floor(y) % 4) + 4) % 4
  return BAYER_4X4[matrixY * 4 + matrixX]
}

export function sampleThresholdSourceLinear(
  rgb: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  u: number,
  v: number,
): ThresholdRgb {
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

export function renderThresholdReference({
  rgb,
  width,
  height,
  settings,
}: ThresholdReferenceInput): ThresholdReferenceOutput {
  assertInput(rgb, width, height, settings)

  const data = new Uint8ClampedArray(width * height * 3)
  const foreground = normalizeRgb(settings.foreground)
  const background = normalizeRgb(settings.background)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const source = sampleThresholdSourceLinear(
        rgb,
        width,
        height,
        (x + 0.5) / width,
        (y + 0.5) / height,
      )
      const adjusted = adjustSource(source, settings.brightness, settings.contrast)
      const decisionColor = settings.dither
        ? addDither(adjusted, getThresholdBayer4Value(x, y))
        : adjusted
      const levels = Math.max(2, settings.levels)
      let color: ThresholdRgb

      if (levels <= 2) {
        let light = rec601(decisionColor) > settings.thresholdPoint
        if (settings.invert) light = !light
        color = settings.colorMode === 'color'
          ? (light ? adjusted : [0, 0, 0])
          : (light ? foreground : background)
      } else {
        let posterized = posterize(decisionColor, levels)
        if (settings.invert) posterized = invertRgb(posterized)
        color = settings.colorMode === 'color'
          ? posterized
          : mixRgb(background, foreground, rec601(posterized))
      }
      const offset = (y * width + x) * 3
      data[offset] = clamp01(color[0]) * 255
      data[offset + 1] = clamp01(color[1]) * 255
      data[offset + 2] = clamp01(color[2]) * 255
    }
  }

  return { channels: 3, data, height, width }
}

function posterize(color: ThresholdRgb, levels: number): ThresholdRgb {
  const denominator = levels - 1
  const quantize = (channel: number) => Math.floor(channel * denominator + 0.5) / denominator
  return [quantize(color[0]), quantize(color[1]), quantize(color[2])]
}

function invertRgb(color: ThresholdRgb): ThresholdRgb {
  return [1 - color[0], 1 - color[1], 1 - color[2]]
}

function mixRgb(from: ThresholdRgb, to: ThresholdRgb, amount: number): ThresholdRgb {
  return [
    mix(from[0], to[0], amount),
    mix(from[1], to[1], amount),
    mix(from[2], to[2], amount),
  ]
}

function addDither(color: ThresholdRgb, bayerValue: number): ThresholdRgb {
  const offset = (bayerValue / 16 - 0.5) * 0.1
  return [
    color[0] + offset,
    color[1] + offset,
    color[2] + offset,
  ]
}

function adjustSource(source: ThresholdRgb, brightness: number, contrast: number): ThresholdRgb {
  const normalizedBrightness = brightness / 100
  const normalizedContrast = contrast / 100
  const factor = (1 + normalizedContrast) / (1 - 0.99 * normalizedContrast)
  const adjust = (channel: number) => clamp01(
    (channel + normalizedBrightness - 0.5) * factor + 0.5,
  )
  return [adjust(source[0]), adjust(source[1]), adjust(source[2])]
}

function rec601(color: ThresholdRgb) {
  return color[0] * 0.299 + color[1] * 0.587 + color[2] * 0.114
}

function normalizeRgb(color: ThresholdRgb): ThresholdRgb {
  return [color[0] / 255, color[1] / 255, color[2] / 255]
}

function assertInput(
  rgb: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  settings: ThresholdSettings,
) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new RangeError('Threshold dimensions must be positive integers')
  }
  if (rgb.length !== width * height * 3) {
    throw new RangeError('Threshold RGB input length must equal width * height * 3')
  }
  assertSettings(settings)
}

function assertSettings(settings: ThresholdSettings) {
  assertRange('levels', settings.levels, 2, 8)
  if (!Number.isInteger(settings.levels)) {
    throw new RangeError('Threshold levels must be an integer')
  }
  assertRange('thresholdPoint', settings.thresholdPoint, 0.1, 0.9)
  assertStep('thresholdPoint', settings.thresholdPoint, 0.1, 0.05)
  assertRange('brightness', settings.brightness, -100, 100)
  if (!Number.isInteger(settings.brightness)) {
    throw new RangeError('Threshold brightness must be an integer')
  }
  assertRange('contrast', settings.contrast, -100, 100)
  if (!Number.isInteger(settings.contrast)) {
    throw new RangeError('Threshold contrast must be an integer')
  }
  if (typeof settings.dither !== 'boolean') {
    throw new RangeError('Threshold dither must be a boolean')
  }
  if (typeof settings.invert !== 'boolean') {
    throw new RangeError('Threshold invert must be a boolean')
  }
  if (!(['custom', 'color'] as const).includes(settings.colorMode)) {
    throw new RangeError('Threshold color mode must be custom or color')
  }
  assertColor('foreground', settings.foreground)
  assertColor('background', settings.background)
}

function assertRange(name: string, value: number, min: number, max: number) {
  if (!Number.isFinite(value)) throw new RangeError(`Threshold ${name} must be finite`)
  if (value < min || value > max) {
    throw new RangeError(`Threshold ${name} must be between ${min} and ${max}`)
  }
}

function assertStep(name: string, value: number, min: number, step: number) {
  const stepCount = (value - min) / step
  if (Math.abs(stepCount - Math.round(stepCount)) > 1e-9) {
    throw new RangeError(`Threshold ${name} must use increments of ${step}`)
  }
}

function assertColor(name: string, color: ThresholdRgb) {
  if (!Array.isArray(color) || color.length !== 3) {
    throw new RangeError(`Threshold ${name} must have three color channels`)
  }
  for (const channel of color) {
    if (!Number.isFinite(channel) || channel < 0 || channel > 255) {
      throw new RangeError(`Threshold ${name} color channel must be between 0 and 255`)
    }
  }
}

function sampleTexel(
  rgb: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): ThresholdRgb {
  const clampedX = Math.min(width - 1, Math.max(0, x))
  const clampedY = Math.min(height - 1, Math.max(0, y))
  const offset = (clampedY * width + clampedX) * 3
  return [rgb[offset] / 255, rgb[offset + 1] / 255, rgb[offset + 2] / 255]
}

function mix(from: number, to: number, amount: number) {
  return from + (to - from) * amount
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}
