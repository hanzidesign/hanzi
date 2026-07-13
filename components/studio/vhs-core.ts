export type VhsRgb = readonly [number, number, number]
export type VhsVec2 = readonly [number, number]

export type VhsSettings = Readonly<{
  distortion: number
  noise: number
  colorBleed: number
  vhsScanlines: number
  trackingError: number
  brightness: number
  contrast: number
}>

export type VhsReferenceInput = Readonly<{
  rgb: Uint8Array | Uint8ClampedArray
  width: number
  height: number
  time: number
  settings: VhsSettings
}>

export type VhsTrace = Readonly<{
  uv: VhsVec2
  trackNoise: number
  trackingOffset: number
  jumpGate: boolean
  bigJump: number
  warpFrequency: number
  wobble: number
  shake: number
  edgeWarp: number
  warpedUv: VhsVec2
  bleedAmount: number
  separatedColor: VhsRgb
  chromaBlur: VhsRgb
  colorAfterBleed: VhsRgb
  scanlinePattern: number
  scanlineMultiplier: number
  oddRowMask: number
  colorAfterScanlines: VhsRgb
  grain: number
  bandGate: boolean
  band: number
  rollingBarGate: boolean
  rollingBar: number
  colorAfterNoise: VhsRgb
  luminance: number
  desaturatedColor: VhsRgb
  gradedColor: VhsRgb
  vignette: number
  preAdjustmentColor: VhsRgb
  output: VhsRgb
}>

export type VhsReferenceOutput = Readonly<{
  data: Uint8ClampedArray
  width: number
  height: number
  channels: 3
}>

export const DEFAULT_VHS_SETTINGS: VhsSettings = {
  distortion: 0.5,
  noise: 0.3,
  colorBleed: 0.5,
  vhsScanlines: 0.3,
  trackingError: 0.2,
  brightness: 0,
  contrast: 0,
}

export function vhsHash([x, y]: VhsVec2) {
  return fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453)
}

export function vhsValueNoise([x, y]: VhsVec2) {
  const integerX = Math.floor(x)
  const integerY = Math.floor(y)
  const fractionalX = fract(x)
  const fractionalY = fract(y)
  const smoothX = fractionalX * fractionalX * (3 - 2 * fractionalX)
  const smoothY = fractionalY * fractionalY * (3 - 2 * fractionalY)
  const lower = mix(
    vhsHash([integerX, integerY]),
    vhsHash([integerX + 1, integerY]),
    smoothX,
  )
  const upper = mix(
    vhsHash([integerX, integerY + 1]),
    vhsHash([integerX + 1, integerY + 1]),
    smoothX,
  )
  return mix(lower, upper, smoothY)
}

export function sampleVhsSourceLinear(
  rgb: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  u: number,
  v: number,
): VhsRgb {
  const texelX = clamp01(u) * width - 0.5
  const texelY = clamp01(v) * height - 0.5
  const x0 = Math.floor(texelX)
  const y0 = Math.floor(texelY)
  const amountX = texelX - x0
  const amountY = texelY - y0
  const topLeft = sampleTexel(rgb, width, height, x0, y0)
  const topRight = sampleTexel(rgb, width, height, x0 + 1, y0)
  const bottomLeft = sampleTexel(rgb, width, height, x0, y0 + 1)
  const bottomRight = sampleTexel(rgb, width, height, x0 + 1, y0 + 1)
  const channel = (index: 0 | 1 | 2) => mix(
    mix(topLeft[index], topRight[index], amountX),
    mix(bottomLeft[index], bottomRight[index], amountX),
    amountY,
  )
  return [channel(0), channel(1), channel(2)]
}

export function traceVhsAt(input: VhsReferenceInput, x: number, y: number): VhsTrace {
  assertSource(input)
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x >= input.width || y < 0 || y >= input.height) {
    throw new RangeError('VHS trace coordinates must be in-bounds integers')
  }
  return traceVhsUnchecked(input, x, y)
}

function traceVhsUnchecked(input: VhsReferenceInput, x: number, y: number): VhsTrace {
  const { rgb, width, height, time, settings } = input
  const uv: VhsVec2 = [(x + 0.5) / width, (y + 0.5) / height]
  let warpedX = uv[0]
  let trackNoise = 0
  let trackingOffset = 0
  let jumpGate = false
  let bigJump = 0
  if (settings.trackingError > 0.01) {
    trackNoise = vhsValueNoise([Math.floor(uv[1] * 20), Math.floor(time * 2)])
    trackingOffset = (trackNoise - 0.5) * 0.1 * settings.trackingError
    jumpGate = vhsValueNoise([time * 0.5, 0]) >= 0.92
    bigJump = jumpGate
      ? (vhsValueNoise([uv[1] * 5, time]) - 0.5) * 0.3 * settings.trackingError
      : 0
    warpedX += trackingOffset + bigJump
  }

  let warpFrequency = 0
  let wobble = 0
  let shake = 0
  let edgeWarp = 0
  if (settings.distortion > 0.01) {
    warpFrequency = 3 + vhsValueNoise([time * 0.1, 0]) * 5
    wobble = Math.sin(uv[1] * warpFrequency * 6.28 + time * 2) * settings.distortion * 0.02
    shake = (vhsValueNoise([time * 10, 0]) - 0.5) * settings.distortion * 0.01
    edgeWarp = Math.sin(time * 3 + uv[1] * 10)
      * (Math.abs(uv[1] - 0.5) * 2) ** 3
      * settings.distortion
      * 0.1
    warpedX += wobble + shake + edgeWarp
  }
  const warpedUv: VhsVec2 = [clamp01(warpedX), clamp01(uv[1])]

  let bleedAmount = 0
  let separatedColor: VhsRgb
  let chromaBlur: VhsRgb
  let colorAfterBleed: VhsRgb
  if (settings.colorBleed > 0.01) {
    bleedAmount = 0.01 * settings.colorBleed
    separatedColor = [
      sampleVhsSourceLinear(rgb, width, height, warpedUv[0] + bleedAmount * 2, warpedUv[1])[0],
      sampleVhsSourceLinear(rgb, width, height, warpedUv[0], warpedUv[1])[1],
      sampleVhsSourceLinear(rgb, width, height, warpedUv[0] - bleedAmount * 2, warpedUv[1])[2],
    ]
    const totals = [0, 0, 0]
    for (let tap = -2; tap <= 2; tap += 1) {
      const sampled = sampleVhsSourceLinear(
        rgb,
        width,
        height,
        warpedUv[0] + tap * bleedAmount,
        warpedUv[1],
      )
      totals[0] += sampled[0]
      totals[1] += sampled[1]
      totals[2] += sampled[2]
    }
    chromaBlur = [totals[0] / 5, totals[1] / 5, totals[2] / 5]
    colorAfterBleed = mixRgb(separatedColor, chromaBlur, 0.3)
  } else {
    colorAfterBleed = sampleVhsSourceLinear(rgb, width, height, warpedUv[0], warpedUv[1])
    separatedColor = colorAfterBleed
    chromaBlur = colorAfterBleed
  }

  let scanlinePattern = 0
  let scanlineMultiplier = 1
  let oddRowMask = 0
  let colorAfterScanlines = colorAfterBleed
  if (settings.vhsScanlines > 0.01) {
    scanlinePattern = Math.sin(warpedUv[1] * height * 3.14159) * 0.5 + 0.5
    scanlineMultiplier = mix(1, scanlinePattern, settings.vhsScanlines * 0.5)
    const phase = Math.floor(warpedUv[1] * height)
    oddRowMask = step(0.5, fract(phase * 0.5))
    colorAfterScanlines = [
      colorAfterBleed[0] * scanlineMultiplier * (1 - settings.vhsScanlines * 0.1 * oddRowMask),
      colorAfterBleed[1] * scanlineMultiplier,
      colorAfterBleed[2] * scanlineMultiplier,
    ]
  }

  let grain = 0
  let bandGate = false
  let band = 0
  let rollingBarGate = false
  let rollingBar = 0
  if (settings.noise > 0.01) {
    grain = (vhsHash([
      warpedUv[0] * width + time * 1000,
      warpedUv[1] * height + time * 1000,
    ]) - 0.5) * settings.noise * 0.3
    bandGate = vhsValueNoise([warpedUv[1] * 100, time * 5]) >= 0.97
    band = bandGate
      ? (vhsHash([warpedUv[0] * 100, time]) - 0.5) * settings.noise
      : 0
    rollingBarGate = Math.abs(warpedUv[1] - fract(time * 0.3)) <= 0.02
    rollingBar = rollingBarGate
      ? (vhsHash([warpedUv[0] * 500, Math.floor(time * 60)]) - 0.5) * settings.noise * 0.5
      : 0
  }
  const colorAfterNoise: VhsRgb = [
    colorAfterScanlines[0] + grain + band + rollingBar,
    colorAfterScanlines[1] + grain + band + rollingBar,
    colorAfterScanlines[2] + grain + band + rollingBar,
  ]

  const luminance = colorAfterNoise[0] * 0.299
    + colorAfterNoise[1] * 0.587
    + colorAfterNoise[2] * 0.114
  const desaturatedColor: VhsRgb = [
    mix(colorAfterNoise[0], luminance, 0.1),
    mix(colorAfterNoise[1], luminance, 0.1),
    mix(colorAfterNoise[2], luminance, 0.1),
  ]
  const gradedColor: VhsRgb = [
    desaturatedColor[0] * 1.1,
    desaturatedColor[1],
    desaturatedColor[2] * 0.9,
  ]
  const vignette = 1 - Math.hypot(
    (warpedUv[0] - 0.5) * 0.5,
    (warpedUv[1] - 0.5) * 0.7,
  ) * 0.5
  const preAdjustmentColor: VhsRgb = [
    gradedColor[0] * vignette,
    gradedColor[1] * vignette,
    gradedColor[2] * vignette,
  ]
  const brightness = settings.brightness / 100
  const contrast = settings.contrast / 100
  const contrastFactor = (1 + contrast) / (1 - 0.99 * contrast)
  const adjust = (channel: number) => clamp01(
    (channel + brightness - 0.5) * contrastFactor + 0.5,
  )
  const output: VhsRgb = [
    adjust(preAdjustmentColor[0]),
    adjust(preAdjustmentColor[1]),
    adjust(preAdjustmentColor[2]),
  ]

  return {
    band,
    bandGate,
    bigJump,
    bleedAmount,
    chromaBlur,
    colorAfterBleed,
    colorAfterNoise,
    colorAfterScanlines,
    desaturatedColor,
    edgeWarp,
    gradedColor,
    grain,
    jumpGate,
    luminance,
    oddRowMask,
    output,
    preAdjustmentColor,
    rollingBar,
    rollingBarGate,
    scanlineMultiplier,
    scanlinePattern,
    separatedColor,
    shake,
    trackNoise,
    trackingOffset,
    uv,
    vignette,
    wobble,
    warpedUv,
    warpFrequency,
  }
}

export function renderVhsReference(input: VhsReferenceInput): VhsReferenceOutput {
  assertSource(input)
  const data = new Uint8ClampedArray(input.width * input.height * 3)
  for (let y = 0; y < input.height; y += 1) {
    for (let x = 0; x < input.width; x += 1) {
      const output = traceVhsUnchecked(input, x, y).output
      const offset = (y * input.width + x) * 3
      data[offset] = Math.round(output[0] * 255)
      data[offset + 1] = Math.round(output[1] * 255)
      data[offset + 2] = Math.round(output[2] * 255)
    }
  }
  return { channels: 3, data, height: input.height, width: input.width }
}

function assertSource(input: VhsReferenceInput) {
  if (!Number.isInteger(input.width) || !Number.isInteger(input.height) || input.width <= 0 || input.height <= 0) {
    throw new RangeError('VHS width and height must be positive integers')
  }
  if (input.rgb.length !== input.width * input.height * 3) {
    throw new RangeError('VHS rgb length must equal width * height * 3')
  }
  if (!Number.isFinite(input.time)) throw new RangeError('VHS time must be finite')
  const effectSettings = [
    ['distortion', input.settings.distortion],
    ['noise', input.settings.noise],
    ['colorBleed', input.settings.colorBleed],
    ['vhsScanlines', input.settings.vhsScanlines],
    ['trackingError', input.settings.trackingError],
  ] as const
  for (const [name, value] of effectSettings) {
    if (!Number.isFinite(value)) throw new RangeError(`VHS ${name} must be finite`)
    if (value < 0 || value > 1) throw new RangeError(`VHS ${name} must be between 0 and 1`)
  }
  for (const [name, value] of [
    ['brightness', input.settings.brightness],
    ['contrast', input.settings.contrast],
  ] as const) {
    if (!Number.isFinite(value)) throw new RangeError(`VHS ${name} must be finite`)
    if (!Number.isInteger(value)) throw new RangeError(`VHS ${name} must be an integer`)
    if (value < -100 || value > 100) throw new RangeError(`VHS ${name} must be between -100 and 100`)
  }
}

function sampleTexel(
  rgb: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): VhsRgb {
  const clampedX = Math.min(width - 1, Math.max(0, x))
  const clampedY = Math.min(height - 1, Math.max(0, y))
  const offset = (clampedY * width + clampedX) * 3
  return [rgb[offset] / 255, rgb[offset + 1] / 255, rgb[offset + 2] / 255]
}

function mixRgb(from: VhsRgb, to: VhsRgb, amount: number): VhsRgb {
  return [
    mix(from[0], to[0], amount),
    mix(from[1], to[1], amount),
    mix(from[2], to[2], amount),
  ]
}

function step(edge: number, value: number) {
  return value < edge ? 0 : 1
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function fract(value: number) {
  return value - Math.floor(value)
}

function mix(from: number, to: number, amount: number) {
  return from * (1 - amount) + to * amount
}
