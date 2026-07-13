export type EdgeDetectionRgb = readonly [number, number, number]
export type EdgeDetectionAlgorithm = 'sobel' | 'prewitt' | 'laplacian'
export type EdgeDetectionColorMode = 'custom' | 'original'

export type EdgeDetectionSettings = Readonly<{
  algorithm: EdgeDetectionAlgorithm
  threshold: number
  lineWidth: number
  invert: boolean
  brightness: number
  contrast: number
  colorMode: EdgeDetectionColorMode
  edgeColor: EdgeDetectionRgb
  background: EdgeDetectionRgb
}>

export type EdgeDetectionReferenceInput = Readonly<{
  rgb: Uint8Array | Uint8ClampedArray
  width: number
  height: number
  settings: EdgeDetectionSettings
}>

export type EdgeDetectionReferenceOutput = Readonly<{
  data: Uint8ClampedArray
  width: number
  height: number
  channels: 3
}>

export type EdgeDetectionTrace = Readonly<{
  coarseEdge: number
  fineEdge: number
  combinedEdge: number
  mask: number
  processedOriginal: EdgeDetectionRgb
}>

export const DEFAULT_EDGE_DETECTION_SETTINGS: EdgeDetectionSettings = {
  algorithm: 'sobel',
  threshold: 0.3,
  lineWidth: 1,
  invert: false,
  brightness: 0,
  contrast: 0,
  colorMode: 'custom',
  edgeColor: [255, 255, 255],
  background: [0, 0, 0],
}

const GAUSSIAN_WEIGHTS = [
  0.0625, 0.125, 0.0625,
  0.125, 0.25, 0.125,
  0.0625, 0.125, 0.0625,
] as const

export function sampleEdgeDetectionSourceLinear(
  rgb: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  u: number,
  v: number,
): EdgeDetectionRgb {
  const texelX = clamp01(u) * width - 0.5
  const texelY = clamp01(v) * height - 0.5
  const x0 = Math.floor(texelX)
  const y0 = Math.floor(texelY)
  const mixX = texelX - x0
  const mixY = texelY - y0
  const samples = [
    sampleTexel(rgb, width, height, x0, y0),
    sampleTexel(rgb, width, height, x0 + 1, y0),
    sampleTexel(rgb, width, height, x0, y0 + 1),
    sampleTexel(rgb, width, height, x0 + 1, y0 + 1),
  ] as const
  const channel = (index: 0 | 1 | 2) => mix(
    mix(samples[0][index], samples[1][index], mixX),
    mix(samples[2][index], samples[3][index], mixX),
    mixY,
  )
  return [channel(0), channel(1), channel(2)]
}

export function traceEdgeDetectionAt(
  input: EdgeDetectionReferenceInput,
  x: number,
  y: number,
): EdgeDetectionTrace {
  const { rgb, width, height, settings } = input
  assertInput(input)
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x >= width || y < 0 || y >= height) {
    throw new RangeError('Edge Detection trace coordinates must be in-bounds integers')
  }

  const u = (x + 0.5) / width
  const v = (y + 0.5) / height
  const stepU = settings.lineWidth / width
  const stepV = settings.lineWidth / height
  const coarseEdge = detectorMagnitude(input, u, v, stepU, stepV, settings.algorithm)
  const fineAlgorithm = settings.algorithm === 'laplacian' ? 'laplacian' : 'sobel'
  const fineEdge = detectorMagnitude(input, u, v, stepU * 0.5, stepV * 0.5, fineAlgorithm)
  const combinedEdge = Math.max(coarseEdge, fineEdge * 0.7)
  const softness = settings.threshold * 0.3
  let mask = smoothstep(settings.threshold - softness, settings.threshold + softness, combinedEdge)
  if (settings.invert) mask = 1 - mask
  const processedOriginal = adjustSource(
    sampleEdgeDetectionSourceLinear(rgb, width, height, u, v),
    settings.brightness,
    settings.contrast,
  )
  return { coarseEdge, fineEdge, combinedEdge, mask, processedOriginal }
}

export function renderEdgeDetectionReference(input: EdgeDetectionReferenceInput): EdgeDetectionReferenceOutput {
  assertInput(input)
  const { width, height, settings } = input
  const data = new Uint8ClampedArray(width * height * 3)
  const edgeColor = normalizeColor(settings.edgeColor)
  const background = normalizeColor(settings.background)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const trace = traceEdgeDetectionAt(input, x, y)
      const foreground = settings.colorMode === 'original' ? trace.processedOriginal : edgeColor
      const color = mixRgb(background, foreground, trace.mask)
      const offset = (y * width + x) * 3
      data[offset] = clamp01(color[0]) * 255
      data[offset + 1] = clamp01(color[1]) * 255
      data[offset + 2] = clamp01(color[2]) * 255
    }
  }
  return { channels: 3, data, height, width }
}

function detectorMagnitude(
  input: EdgeDetectionReferenceInput,
  u: number,
  v: number,
  stepU: number,
  stepV: number,
  algorithm: EdgeDetectionAlgorithm,
) {
  const values = new Float64Array(9)
  let index = 0
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      values[index] = gaussianLuminance(input, u + dx * stepU, v + dy * stepV, stepU, stepV)
      index += 1
    }
  }
  const [tl, tc, tr, ml, mc, mr, bl, bc, br] = values
  if (algorithm === 'laplacian') {
    return Math.abs(mc * 8 - (tl + tc + tr + ml + mr + bl + bc + br))
  }
  const middleWeight = algorithm === 'sobel' ? 2 : 1
  const gx = -tl - middleWeight * ml - bl + tr + middleWeight * mr + br
  const gy = -tl - middleWeight * tc - tr + bl + middleWeight * bc + br
  return Math.hypot(gx, gy)
}

function gaussianLuminance(
  input: EdgeDetectionReferenceInput,
  u: number,
  v: number,
  stepU: number,
  stepV: number,
) {
  let result = 0
  let index = 0
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const sampled = sampleEdgeDetectionSourceLinear(
        input.rgb,
        input.width,
        input.height,
        u + dx * stepU,
        v + dy * stepV,
      )
      result += rec601(adjustSource(sampled, input.settings.brightness, input.settings.contrast))
        * GAUSSIAN_WEIGHTS[index]
      index += 1
    }
  }
  return result
}

function adjustSource(source: EdgeDetectionRgb, brightness: number, contrast: number): EdgeDetectionRgb {
  const b = brightness / 100
  const c = contrast / 100
  const factor = (1 + c) / (1 - 0.99 * c)
  const adjust = (channel: number) => clamp01((channel + b - 0.5) * factor + 0.5)
  return [adjust(source[0]), adjust(source[1]), adjust(source[2])]
}

function assertInput(input: EdgeDetectionReferenceInput) {
  const { rgb, width, height, settings } = input
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new RangeError('Edge Detection dimensions must be positive integers')
  }
  if (rgb.length !== width * height * 3) {
    throw new RangeError('Edge Detection RGB input length must equal width * height * 3')
  }
  if (!(['sobel', 'prewitt', 'laplacian'] as const).includes(settings.algorithm)) {
    throw new RangeError('Edge Detection algorithm is invalid')
  }
  if (!(['custom', 'original'] as const).includes(settings.colorMode)) {
    throw new RangeError('Edge Detection colorMode is invalid')
  }
  assertRange('threshold', settings.threshold, 0.1, 0.8)
  assertRange('lineWidth', settings.lineWidth, 0.5, 4)
  assertRange('brightness', settings.brightness, -100, 100)
  assertRange('contrast', settings.contrast, -100, 100)
  if (typeof settings.invert !== 'boolean') throw new TypeError('Edge Detection invert must be boolean')
  assertColor(settings.edgeColor, 'edgeColor')
  assertColor(settings.background, 'background')
}

function assertRange(name: string, value: number, min: number, max: number) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`Edge Detection ${name} must be between ${min} and ${max}`)
  }
}

function assertColor(color: EdgeDetectionRgb, name: string) {
  if (!Array.isArray(color) || color.length !== 3 || color.some((channel) => !Number.isFinite(channel) || channel < 0 || channel > 255)) {
    throw new RangeError(`Edge Detection ${name} must contain RGB channels between 0 and 255`)
  }
}

function sampleTexel(rgb: Uint8Array | Uint8ClampedArray, width: number, height: number, x: number, y: number): EdgeDetectionRgb {
  const px = Math.min(width - 1, Math.max(0, x))
  const py = Math.min(height - 1, Math.max(0, y))
  const offset = (py * width + px) * 3
  return [rgb[offset] / 255, rgb[offset + 1] / 255, rgb[offset + 2] / 255]
}

function normalizeColor(color: EdgeDetectionRgb): EdgeDetectionRgb {
  return [color[0] / 255, color[1] / 255, color[2] / 255]
}

function rec601(color: EdgeDetectionRgb) {
  return color[0] * 0.299 + color[1] * 0.587 + color[2] * 0.114
}

function mixRgb(from: EdgeDetectionRgb, to: EdgeDetectionRgb, amount: number): EdgeDetectionRgb {
  return [mix(from[0], to[0], amount), mix(from[1], to[1], amount), mix(from[2], to[2], amount)]
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

function mix(from: number, to: number, amount: number) {
  return from + (to - from) * amount
}

function clamp01(value: number) {
  return clamp(value, 0, 1)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
