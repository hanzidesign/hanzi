export const DITHERING_ALGORITHM_IDS = {
  'floyd-steinberg': 0,
  atkinson: 1,
  'jarvis-judice-ninke': 2,
  stucki: 3,
  burkes: 4,
  sierra: 5,
  'sierra-two-row': 6,
  'sierra-lite': 7,
  'bayer-2x2': 8,
  'bayer-4x4': 9,
  'bayer-8x8': 10,
  'bayer-16x16': 11,
  'clustered-dot': 14,
  'blue-noise': 17,
  'interleaved-gradient': 19,
  crosshatch: 20,
} as const

export type DitheringAlgorithm = keyof typeof DITHERING_ALGORITHM_IDS

export type DitheringMatrixSize = 2 | 4 | 8 | 16
export type DitheringRgb = readonly [number, number, number]
export type DitheringModulationType = 'wave' | 'grid' | 'horizontal' | 'radial' | 'rgb-split'
export type DitheringModulation = Readonly<{
  amplitude: number
  enabled: boolean
  frequency: number
  phase: number
  type: DitheringModulationType
}>
export type DitheringChromatic = Readonly<{
  blueChannel: number
  enabled: boolean
  greenChannel: number
  maxDisplace: number
  redChannel: number
}>

export type DitheringSettings = Readonly<{
  algorithm: DitheringAlgorithm
  background: DitheringRgb
  brightness: number
  chromatic: DitheringChromatic
  colorMode: 'mono' | 'tonal' | 'palette' | 'rgb' | 'original'
  contrast: number
  customPalette: readonly DitheringRgb[]
  foreground: DitheringRgb
  gamma: number
  intensity: number
  levels: number
  lineSpacing: number
  lineWeight: number
  layers: number
  matrixSize: DitheringMatrixSize
  modulation: DitheringModulation
  palette: 'gameboy' | 'custom'
  sharpen: number
}>

export type DitheringReferenceInput = Readonly<{
  grayscale: Uint8Array | Uint8ClampedArray
  width: number
  height: number
  settings: DitheringSettings
}>

export type DitheringReferenceOutput = Readonly<{
  data: Uint8ClampedArray
  width: number
  height: number
  channels: 1 | 3
}>

export const DEFAULT_DITHERING_SETTINGS: DitheringSettings = {
  algorithm: 'bayer-8x8',
  background: [0, 0, 0],
  brightness: 0,
  chromatic: {
    blueChannel: 80,
    enabled: false,
    greenChannel: 50,
    maxDisplace: 6,
    redChannel: 23,
  },
  colorMode: 'mono',
  contrast: 0,
  customPalette: [[0, 0, 0], [255, 255, 255]],
  foreground: [255, 255, 255],
  gamma: 1,
  intensity: 1,
  levels: 2,
  lineSpacing: 10,
  lineWeight: 0.5,
  layers: 2,
  matrixSize: 4,
  modulation: {
    amplitude: 0.1,
    enabled: false,
    frequency: 5,
    phase: 0,
    type: 'wave',
  },
  palette: 'gameboy',
  sharpen: 0,
}

const BAYER_8X8 = [
  0, 32, 8, 40, 2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44, 4, 36, 14, 46, 6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
  3, 35, 11, 43, 1, 33, 9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47, 7, 39, 13, 45, 5, 37,
  63, 31, 55, 23, 61, 29, 53, 21,
] as const

const BAYER_2X2 = [
  0, 2,
  3, 1,
] as const

const BAYER_4X4 = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
] as const

const ERROR_DIFFUSION_SPREAD: Partial<Record<DitheringAlgorithm, number>> = {
  'floyd-steinberg': 0.5,
  atkinson: 0.35,
  'jarvis-judice-ninke': 0.65,
  stucki: 0.6,
  burkes: 0.55,
  sierra: 0.58,
  'sierra-two-row': 0.52,
  'sierra-lite': 0.4,
}

const GAMEBOY_PALETTE: readonly DitheringRgb[] = [
  [15, 56, 15],
  [48, 98, 48],
  [139, 172, 15],
  [155, 188, 15],
]

export function renderDitheringReference({
  grayscale,
  width,
  height,
  settings,
}: DitheringReferenceInput): DitheringReferenceOutput {
  assertDimensions(grayscale, width, height)

  const channels = settings.colorMode === 'mono' && !settings.chromatic.enabled ? 1 : 3
  const data = new Uint8ClampedArray(width * height * channels)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const gridX = Math.floor(x / settings.matrixSize) * settings.matrixSize
      const gridY = Math.floor(y / settings.matrixSize) * settings.matrixSize
      const [sourceX, sourceY] = getModulatedSourcePosition(
        x,
        y,
        width,
        height,
        gridX,
        gridY,
        settings,
      )
      const sourceColor = sampleSourceColor(
        grayscale,
        width,
        height,
        x,
        y,
        sourceX,
        sourceY,
        settings,
      )
      const adjustedLuminance = adjustLuminance(
        sampleSharpenedLuminance(
          grayscale,
          width,
          height,
          sourceX,
          sourceY,
          settings.sharpen,
        ),
        settings,
      )
      const cellX = Math.floor(x / settings.matrixSize)
      const cellY = Math.floor(y / settings.matrixSize)

      if (settings.algorithm === 'crosshatch') {
        const luminance = applyAdaptiveIntensity(adjustedLuminance, settings.intensity)
        const isForeground = crosshatch(
          x / width,
          y / height,
          luminance,
          settings,
        )

        writeAdaptiveOutput(
          data,
          y * width + x,
          channels,
          isForeground,
          adjustedLuminance,
          sourceColor,
          settings,
        )
        continue
      }

      if (settings.algorithm === 'clustered-dot') {
        const luminance = applyAdaptiveIntensity(adjustedLuminance, settings.intensity)
        const isForeground = clusteredDot(
          gridX,
          gridY,
          settings.matrixSize,
          luminance,
        )

        writeAdaptiveOutput(
          data,
          y * width + x,
          channels,
          isForeground,
          adjustedLuminance,
          sourceColor,
          settings,
        )
        continue
      }

      let threshold = getThreshold(
        settings.algorithm,
        cellX,
        cellY,
        gridX,
        gridY,
      )

      if (settings.modulation.enabled) {
        threshold += getThresholdModulationOffset(
          x / width,
          y / height,
          settings.modulation,
        )
      }

      if (settings.colorMode === 'rgb') {
        const value = quantizeRgbChannel(adjustedLuminance, threshold, settings.levels)
        const outputIndex = (y * width + x) * 3

        data[outputIndex] = value
        data[outputIndex + 1] = value
        data[outputIndex + 2] = value
      } else if (settings.colorMode === 'tonal') {
        const luminance = applyOrderedIntensity(adjustedLuminance, settings.intensity)
        const tonalValue = quantizeTonal(luminance, threshold, settings.levels)

        writeRgb(
          data,
          y * width + x,
          mixRgb(settings.background, settings.foreground, tonalValue),
        )
      } else if (settings.colorMode === 'original') {
        const color: DitheringRgb = adjustedLuminance > threshold
          ? sourceColor
          : settings.background

        writeRgb(data, y * width + x, color)
      } else if (settings.colorMode === 'palette') {
        const thresholdWithIntensity = clamp01(
          threshold + (settings.intensity - 1) * 0.3,
        )
        const gray = Math.round(adjustedLuminance * 255)
        const color = ditherPalette(
          [gray, gray, gray],
          thresholdWithIntensity,
          settings.palette === 'custom' ? settings.customPalette : GAMEBOY_PALETTE,
        )

        writeRgb(data, y * width + x, color)
      } else {
        const luminance = applyOrderedIntensity(adjustedLuminance, settings.intensity)
        const isForeground = luminance > threshold

        writeMonoOutput(data, y * width + x, channels, isForeground, settings)
      }
    }
  }

  if (settings.chromatic.enabled && channels === 3) {
    applyChromatic(data, grayscale, width, height, settings.chromatic)
  }

  return {
    channels,
    data,
    height,
    width,
  }
}

function writeAdaptiveOutput(
  data: Uint8ClampedArray,
  pixelIndex: number,
  channels: 1 | 3,
  isForeground: boolean,
  luminance: number,
  sourceColor: DitheringRgb,
  settings: DitheringSettings,
) {
  if (settings.colorMode === 'mono') {
    writeMonoOutput(data, pixelIndex, channels, isForeground, settings)
    return
  }

  if (settings.colorMode === 'tonal') {
    const tonalColor = mixRgb(settings.background, settings.foreground, luminance)

    writeRgb(data, pixelIndex, isForeground ? tonalColor : settings.background)
    return
  }

  if (settings.colorMode === 'palette') {
    const gray = Math.round(luminance * 255)
    const color = ditherPalette(
      [gray, gray, gray],
      isForeground ? 0 : 1,
      settings.palette === 'custom' ? settings.customPalette : GAMEBOY_PALETTE,
    )

    writeRgb(data, pixelIndex, color)
    return
  }

  writeRgb(data, pixelIndex, isForeground ? sourceColor : settings.background)
}

function writeMonoOutput(
  data: Uint8ClampedArray,
  pixelIndex: number,
  channels: 1 | 3,
  isForeground: boolean,
  settings: DitheringSettings,
) {
  if (channels === 1) {
    data[pixelIndex] = isForeground ? 255 : 0
    return
  }

  writeRgb(
    data,
    pixelIndex,
    isForeground ? settings.foreground : settings.background,
  )
}

function applyChromatic(
  data: Uint8ClampedArray,
  grayscale: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  chromatic: DitheringChromatic,
) {
  const amount = clamp01(chromatic.maxDisplace / 100)
  const angles = [
    chromatic.redChannel,
    chromatic.greenChannel,
    chromatic.blueChannel,
  ]

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelIndex = y * width + x

      for (let channel = 0; channel < 3; channel += 1) {
        const angle = angles[channel] * Math.PI / 180
        const sampleX = Math.round(x + Math.cos(angle) * chromatic.maxDisplace)
        const sampleY = Math.round(y + Math.sin(angle) * chromatic.maxDisplace)
        const clampedX = Math.min(width - 1, Math.max(0, sampleX))
        const clampedY = Math.min(height - 1, Math.max(0, sampleY))
        const original = data[pixelIndex * 3 + channel]
        const displaced = grayscale[clampedY * width + clampedX]

        data[pixelIndex * 3 + channel] = Math.round(
          original + (displaced - original) * amount,
        )
      }
    }
  }
}

function getModulatedSourcePosition(
  x: number,
  y: number,
  width: number,
  height: number,
  gridX: number,
  gridY: number,
  settings: DitheringSettings,
): [number, number] {
  const modulation = settings.modulation

  if (!modulation.enabled || modulation.type === 'rgb-split') {
    return [gridX, gridY]
  }

  const [offsetU, offsetV] = getModulationDisplacement(
    x / width,
    y / height,
    modulation,
  )
  const displacedX = Math.floor(
    (x + offsetU * width) / settings.matrixSize,
  ) * settings.matrixSize
  const displacedY = Math.floor(
    (y + offsetV * height) / settings.matrixSize,
  ) * settings.matrixSize

  return [
    Math.min(width - 1, Math.max(0, displacedX)),
    Math.min(height - 1, Math.max(0, displacedY)),
  ]
}

function getModulationDisplacement(
  u: number,
  v: number,
  modulation: DitheringModulation,
): [number, number] {
  const amplitude = modulation.amplitude * 0.05
  const frequency = modulation.frequency * Math.PI * 2

  if (modulation.type === 'wave') {
    return [0, Math.sin(u * frequency + modulation.phase) * amplitude]
  }

  if (modulation.type === 'grid') {
    return [
      Math.sin(v * frequency + modulation.phase) * amplitude,
      Math.sin(u * frequency + modulation.phase) * amplitude,
    ]
  }

  if (modulation.type === 'horizontal') {
    return [Math.sin(v * frequency + modulation.phase) * amplitude, 0]
  }

  if (modulation.type === 'radial') {
    const centerX = u - 0.5
    const centerY = v - 0.5
    const distance = Math.hypot(centerX, centerY)
    const directionLength = Math.hypot(centerX + 0.0001, centerY + 0.0001)
    const offset = Math.sin(
      distance * modulation.frequency * Math.PI * 4 + modulation.phase,
    ) * amplitude

    return [
      (centerX + 0.0001) / directionLength * offset,
      (centerY + 0.0001) / directionLength * offset,
    ]
  }

  return [0, 0]
}

function sampleSourceColor(
  grayscale: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  sourceX: number,
  sourceY: number,
  settings: DitheringSettings,
): DitheringRgb {
  const fallback = grayscale[sourceY * width + sourceX]

  if (!settings.modulation.enabled || settings.modulation.type !== 'rgb-split') {
    return [fallback, fallback, fallback]
  }

  const amplitude = settings.modulation.amplitude * 0.02
  const basePhase = y / height * settings.modulation.frequency * Math.PI * 2
    + settings.modulation.phase
  const sampleChannel = (phaseOffset: number) => {
    const wave = Math.sin(basePhase + phaseOffset) * amplitude
    const displacedX = Math.floor(
      (x + wave * width) / settings.matrixSize,
    ) * settings.matrixSize
    const clampedX = Math.min(width - 1, Math.max(0, displacedX))

    return grayscale[sourceY * width + clampedX]
  }

  return [
    sampleChannel(0),
    sampleChannel(Math.PI * 0.666),
    sampleChannel(Math.PI * 1.333),
  ]
}

function getThresholdModulationOffset(
  u: number,
  v: number,
  modulation: DitheringModulation,
) {
  if (modulation.type === 'wave') {
    return Math.sin(
      u * modulation.frequency * Math.PI * 2 + modulation.phase,
    ) * modulation.amplitude
  }

  if (modulation.type === 'grid') {
    const xWave = Math.sin(u * modulation.frequency * Math.PI * 2)
    const yWave = Math.sin(v * modulation.frequency * Math.PI * 2)

    return xWave * yWave * modulation.amplitude
  }

  if (modulation.type === 'horizontal') {
    return Math.sin(
      v * modulation.frequency * Math.PI * 2 + modulation.phase,
    ) * modulation.amplitude
  }

  if (modulation.type === 'radial') {
    const distance = Math.hypot(u - 0.5, v - 0.5)

    return Math.sin(
      distance * modulation.frequency * Math.PI * 4 + modulation.phase,
    ) * modulation.amplitude
  }

  return 0
}

function ditherPalette(
  color: DitheringRgb,
  threshold: number,
  palette: readonly DitheringRgb[],
) {
  const usablePalette = palette.length >= 2 ? palette.slice(0, 64) : GAMEBOY_PALETTE
  const nearest = usablePalette
    .map((candidate) => ({
      color: candidate,
      distance: rgbDistance(color, candidate),
    }))
    .sort((left, right) => left.distance - right.distance)
    .slice(0, 2)
  const totalDistance = nearest[0].distance + nearest[1].distance

  if (totalDistance < 0.001) {
    return nearest[0].color
  }

  const blend = nearest[0].distance / totalDistance

  return threshold < blend ? nearest[0].color : nearest[1].color
}

function rgbDistance(left: DitheringRgb, right: DitheringRgb) {
  return Math.hypot(
    left[0] - right[0],
    left[1] - right[1],
    left[2] - right[2],
  )
}

function quantizeTonal(luminance: number, threshold: number, levels: number) {
  const colorLevels = Math.max(2, Math.round(levels))
  const ditherOffset = (threshold - 0.5) * 0.5 / colorLevels

  return clamp01(
    Math.floor((luminance + ditherOffset) * colorLevels) / (colorLevels - 1),
  )
}

function mixRgb(from: DitheringRgb, to: DitheringRgb, amount: number): DitheringRgb {
  return [
    Math.round(from[0] + (to[0] - from[0]) * amount),
    Math.round(from[1] + (to[1] - from[1]) * amount),
    Math.round(from[2] + (to[2] - from[2]) * amount),
  ]
}

function writeRgb(data: Uint8ClampedArray, pixelIndex: number, color: DitheringRgb) {
  const outputIndex = pixelIndex * 3

  data[outputIndex] = color[0]
  data[outputIndex + 1] = color[1]
  data[outputIndex + 2] = color[2]
}

function quantizeRgbChannel(luminance: number, threshold: number, levels: number) {
  const colorLevels = Math.max(2, Math.round(levels))
  const ditherOffset = (threshold - 0.5) * 0.5 / colorLevels
  const quantized = Math.floor(
    (luminance + ditherOffset) * (colorLevels - 1) + 0.5,
  ) / (colorLevels - 1)

  return Math.round(clamp01(quantized) * 255)
}

function getThreshold(
  algorithm: DitheringAlgorithm,
  cellX: number,
  cellY: number,
  pixelX: number,
  pixelY: number,
) {
  if (algorithm === 'interleaved-gradient') {
    return interleavedGradientNoise(pixelX, pixelY)
  }

  if (algorithm === 'blue-noise') {
    return blueNoise(pixelX, pixelY)
  }

  const spread = ERROR_DIFFUSION_SPREAD[algorithm]

  if (spread !== undefined) {
    return 0.5 + (blueNoise(pixelX, pixelY) - 0.5) * spread
  }

  return getBayerThreshold(algorithm, cellX, cellY)
}

function applyAdaptiveIntensity(luminance: number, intensity: number) {
  return clamp01(luminance + (intensity - 1) * 0.3)
}

function clusteredDot(x: number, y: number, matrixSize: number, luminance: number) {
  const cellSize = matrixSize * 2
  const localX = (x % cellSize) / cellSize
  const localY = (y % cellSize) / cellSize
  const distance = Math.hypot(localX - 0.5, localY - 0.5)
  const radius = (1 - luminance) * 0.48

  return distance < radius
}

function crosshatch(
  u: number,
  v: number,
  luminance: number,
  settings: DitheringSettings,
) {
  const darkness = 1 - luminance

  if (settings.layers < 1) {
    return false
  }

  const scaledU = u * settings.lineSpacing * 5
  const scaledV = v * settings.lineSpacing * 5
  const baseThickness = settings.lineWeight * 0.15 * (0.5 + darkness * 1.5)

  if (darkness > 0.15 && lineMatches(scaledV, baseThickness, 0.15, darkness)) {
    return true
  }

  if (settings.layers >= 2 && darkness > 0.35) {
    const rotatedY = scaledU * Math.SQRT1_2 + scaledV * Math.SQRT1_2

    if (lineMatches(rotatedY, baseThickness, 0.35, darkness)) {
      return true
    }
  }

  if (
    settings.layers >= 3
    && darkness > 0.55
    && lineMatches(scaledU, baseThickness, 0.55, darkness)
  ) {
    return true
  }

  if (settings.layers >= 4 && darkness > 0.75) {
    const rotatedY = -scaledU * Math.SQRT1_2 + scaledV * Math.SQRT1_2

    if (lineMatches(rotatedY, baseThickness, 0.75, darkness)) {
      return true
    }
  }

  return false
}

function lineMatches(
  linePosition: number,
  baseThickness: number,
  darknessThreshold: number,
  darkness: number,
) {
  const distanceFromLine = Math.abs(fract(linePosition) - 0.5)
  const strength = smoothstep(darknessThreshold, darknessThreshold + 0.1, darkness)

  return distanceFromLine < baseThickness * strength
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const normalized = clamp01((value - edge0) / (edge1 - edge0))

  return normalized * normalized * (3 - 2 * normalized)
}

function getBayerThreshold(algorithm: DitheringAlgorithm, x: number, y: number) {
  if (algorithm === 'bayer-2x2') {
    return BAYER_2X2[(y % 2) * 2 + (x % 2)] / 4
  }

  if (algorithm === 'bayer-4x4') {
    return BAYER_4X4[(y % 4) * 4 + (x % 4)] / 16
  }

  const base = BAYER_8X8[(y % 8) * 8 + (x % 8)] / 64

  if (algorithm === 'bayer-16x16') {
    const quadrantX = Math.floor((x % 16) / 8)
    const quadrantY = Math.floor((y % 16) / 8)
    const offset = (quadrantX + quadrantY * 2) / 4

    return (base + offset) / 4 + base * 0.75
  }

  return base
}

function interleavedGradientNoise(x: number, y: number) {
  return fract(52.9829189 * fract(x * 0.06711056 + y * 0.00583715))
}

function blueNoise(x: number, y: number) {
  const first = interleavedGradientNoise(x, y)
  const second = interleavedGradientNoise(x * 1.5 + 17, y * 1.5 + 31)
  const third = interleavedGradientNoise(x * 2.3 + 53, y * 2.3 + 97)

  return fract(first + second * 0.5 + third * 0.25)
}

function fract(value: number) {
  return value - Math.floor(value)
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function adjustLuminance(value: number, settings: DitheringSettings) {
  const brightnessAdjusted = value + settings.brightness / 100
  const contrast = Math.min(1, Math.max(-1, settings.contrast / 100))
  const contrastFactor = (1 + contrast) / (1 - contrast * 0.99)

  const contrastAdjusted = clamp01((brightnessAdjusted - 0.5) * contrastFactor + 0.5)
  const gamma = Math.max(settings.gamma, Number.EPSILON)

  return Math.pow(contrastAdjusted, 1 / gamma)
}

function applyOrderedIntensity(luminance: number, intensity: number) {
  const blackPoint = Math.max(0, (intensity - 1) * 0.5)
  const whitePoint = Math.min(1, 1 + (intensity - 1) * 0.5)

  if (luminance < blackPoint) {
    return 0
  }

  if (luminance > whitePoint) {
    return 1
  }

  return clamp01((luminance - blackPoint) / Math.max(whitePoint - blackPoint, 0.001))
}

function sampleSharpenedLuminance(
  grayscale: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  amount: number,
) {
  const sample = (sampleX: number, sampleY: number) => {
    const clampedX = Math.min(width - 1, Math.max(0, sampleX))
    const clampedY = Math.min(height - 1, Math.max(0, sampleY))

    return grayscale[clampedY * width + clampedX] / 255
  }
  const center = sample(x, y)
  const laplacian = center * 4
    - sample(x - 1, y)
    - sample(x + 1, y)
    - sample(x, y - 1)
    - sample(x, y + 1)

  return clamp01(center + laplacian * amount * 0.5)
}

function assertDimensions(
  grayscale: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new RangeError('Dithering dimensions must be positive integers')
  }

  if (grayscale.length !== width * height) {
    throw new RangeError('Grayscale buffer length must equal width * height')
  }
}
