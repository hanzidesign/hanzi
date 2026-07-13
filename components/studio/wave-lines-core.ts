export type WaveLinesRgb = readonly [number, number, number]
export type WaveLinesDirection = 'horizontal' | 'vertical'
export type WaveLinesColorMode = 'original' | 'custom'

export type WaveLinesSettings = Readonly<{
  lineCount: number
  amplitude: number
  frequency: number
  lineThickness: number
  direction: WaveLinesDirection
  animate: boolean
  brightness: number
  contrast: number
  colorMode: WaveLinesColorMode
  lineColor: WaveLinesRgb
  background: WaveLinesRgb
}>

export type WaveLinesReferenceInput = Readonly<{
  rgb: Uint8Array | Uint8ClampedArray
  width: number
  height: number
  time: number
  settings: WaveLinesSettings
}>

export type WaveLinesTrace = Readonly<{
  adjustedSource: WaveLinesRgb
  luminance: number
  animTime: number
  spacing: number
  index: number
  phase: number
  offset: number
  center: number
  distance: number
  halfWidth: number
  isLine: boolean
}>

export type WaveLinesReferenceOutput = Readonly<{
  data: Uint8ClampedArray
  width: number
  height: number
  channels: 3
}>

export const DEFAULT_WAVE_LINES_SETTINGS: WaveLinesSettings = {
  lineCount: 50,
  amplitude: 20,
  frequency: 1,
  lineThickness: 0.4,
  direction: 'horizontal',
  animate: true,
  brightness: 0,
  contrast: 0,
  colorMode: 'original',
  lineColor: [255, 255, 255],
  background: [0, 0, 0],
}

export function traceWaveLinesAt(
  input: WaveLinesReferenceInput,
  x: number,
  y: number,
): WaveLinesTrace {
  assertInput(input)
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x >= input.width || y < 0 || y >= input.height) {
    throw new RangeError('Wave Lines trace coordinates must be in-bounds integers')
  }

  return traceWaveLinesUnchecked(input, x, y)
}

function traceWaveLinesUnchecked(
  input: WaveLinesReferenceInput,
  x: number,
  y: number,
): WaveLinesTrace {
  const { rgb, width, height, time, settings } = input
  const pixelX = x + 0.5
  const pixelY = y + 0.5
  const adjustedSource = adjustSource(
    sampleWaveLinesSourceLinear(rgb, width, height, pixelX / width, pixelY / height),
    settings.brightness,
    settings.contrast,
  )
  const luminance = rec601(adjustedSource)
  const animTime = settings.animate ? time : 0
  const vertical = settings.direction === 'vertical'
  const extent = vertical ? width : height
  const coordinate = vertical ? pixelX : pixelY
  const phaseCoordinate = vertical ? pixelY / height : pixelX / width
  const spacing = extent / settings.lineCount
  const index = Math.floor(coordinate / spacing)
  const phase = phaseCoordinate * Math.PI * 2 * settings.frequency
  const offset = Math.sin(phase + animTime) * settings.amplitude * luminance
  const center = (index + 0.5) * spacing + offset
  const distance = Math.abs(coordinate - center)
  const halfWidth = spacing * settings.lineThickness * luminance

  return {
    adjustedSource,
    animTime,
    center,
    distance,
    halfWidth,
    index,
    isLine: distance < halfWidth,
    luminance,
    offset,
    phase,
    spacing,
  }
}

export function renderWaveLinesReference(
  input: WaveLinesReferenceInput,
): WaveLinesReferenceOutput {
  assertInput(input)
  const { width, height, settings } = input
  const data = new Uint8ClampedArray(width * height * 3)
  const background = normalizeRgb(settings.background)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const trace = traceWaveLinesUnchecked(input, x, y)
      const color: WaveLinesRgb = trace.isLine
        ? (settings.colorMode === 'custom'
            ? [trace.luminance, trace.luminance, trace.luminance]
            : trace.adjustedSource)
        : background
      const offset = (y * width + x) * 3
      data[offset] = color[0] * 255
      data[offset + 1] = color[1] * 255
      data[offset + 2] = color[2] * 255
    }
  }

  return { channels: 3, data, height, width }
}

export function sampleWaveLinesSourceLinear(
  rgb: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  u: number,
  v: number,
): WaveLinesRgb {
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

function adjustSource(source: WaveLinesRgb, brightness: number, contrast: number): WaveLinesRgb {
  const normalizedBrightness = brightness / 100
  const normalizedContrast = contrast / 100
  const factor = (1 + normalizedContrast) / (1 - normalizedContrast * 0.99)
  const adjust = (channel: number) => clamp01(
    (channel + normalizedBrightness - 0.5) * factor + 0.5,
  )
  return [adjust(source[0]), adjust(source[1]), adjust(source[2])]
}

function rec601(color: WaveLinesRgb) {
  return color[0] * 0.299 + color[1] * 0.587 + color[2] * 0.114
}

function normalizeRgb(color: WaveLinesRgb): WaveLinesRgb {
  return [color[0] / 255, color[1] / 255, color[2] / 255]
}

function assertInput(input: WaveLinesReferenceInput) {
  const { rgb, width, height, time, settings } = input
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new RangeError('Wave Lines dimensions must be positive integers')
  }
  if (rgb.length !== width * height * 3) {
    throw new RangeError('Wave Lines RGB input length must equal width * height * 3')
  }
  if (!Number.isFinite(time)) throw new RangeError('Wave Lines time must be finite')
  assertRange('lineCount', settings.lineCount, 10, 150)
  assertStep('lineCount', settings.lineCount, 10, 5)
  assertRange('amplitude', settings.amplitude, 5, 50)
  assertInteger('amplitude', settings.amplitude)
  assertRange('frequency', settings.frequency, 0.5, 3)
  assertStep('frequency', settings.frequency, 0.5, 0.1)
  if (settings.lineThickness !== DEFAULT_WAVE_LINES_SETTINGS.lineThickness) {
    assertRange('lineThickness', settings.lineThickness, 0.5, 3)
    assertStep('lineThickness', settings.lineThickness, 0.5, 0.1)
  }
  assertRange('brightness', settings.brightness, -100, 100)
  assertInteger('brightness', settings.brightness)
  assertRange('contrast', settings.contrast, -100, 100)
  assertInteger('contrast', settings.contrast)
  if (!(['horizontal', 'vertical'] as const).includes(settings.direction)) {
    throw new RangeError('Wave Lines direction must be horizontal or vertical')
  }
  if (typeof settings.animate !== 'boolean') {
    throw new TypeError('Wave Lines animate must be a boolean')
  }
  if (!(['original', 'custom'] as const).includes(settings.colorMode)) {
    throw new RangeError('Wave Lines colorMode must be original or custom')
  }
  assertColor('lineColor', settings.lineColor)
  assertColor('background', settings.background)
}

function assertRange(name: string, value: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new RangeError(`Wave Lines ${name} must be between ${minimum} and ${maximum}`)
  }
}

function assertInteger(name: string, value: number) {
  if (!Number.isInteger(value)) {
    throw new RangeError(`Wave Lines ${name} must be an integer`)
  }
}

function assertStep(name: string, value: number, minimum: number, step: number) {
  const steps = (value - minimum) / step
  if (Math.abs(steps - Math.round(steps)) > 1e-9) {
    throw new RangeError(`Wave Lines ${name} must use increments of ${step}`)
  }
}

function assertColor(name: string, color: WaveLinesRgb) {
  if (!Array.isArray(color) || color.length !== 3) {
    throw new RangeError(`Wave Lines ${name} must have three color channels`)
  }
  for (const channel of color) {
    if (!Number.isFinite(channel) || channel < 0 || channel > 255) {
      throw new RangeError(`Wave Lines ${name} color channel must be between 0 and 255`)
    }
  }
}

function sampleTexel(
  rgb: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): WaveLinesRgb {
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
