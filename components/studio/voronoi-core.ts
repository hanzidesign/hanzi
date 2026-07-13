export type VoronoiRgb = readonly [number, number, number]
export type VoronoiVec2 = readonly [number, number]
export type VoronoiEdgeColor = 0 | 1 | 2
export type VoronoiColorMode = 0 | 1 | 2

export type VoronoiSettings = Readonly<{
  cellSize: number
  edgeWidth: number
  edgeColor: VoronoiEdgeColor
  colorMode: VoronoiColorMode
  randomize: number
  brightness: number
  contrast: number
}>

export type VoronoiReferenceInput = Readonly<{
  rgb: Uint8Array | Uint8ClampedArray
  width: number
  height: number
  settings: VoronoiSettings
}>

export type VoronoiTrace = Readonly<{
  uv: VoronoiVec2
  scaledPoint: VoronoiVec2
  closestCell: VoronoiVec2
  closestDistance: number
  secondDistance: number
  edgeDistance: number
  interiorMask: number
  centerUv: VoronoiVec2
  averageSampleCount: number
  cellColor: VoronoiRgb
  edgeColor: VoronoiRgb
  composedColor: VoronoiRgb
  output: VoronoiRgb
}>

export type VoronoiReferenceOutput = Readonly<{
  data: Uint8ClampedArray
  width: number
  height: number
  channels: 3
}>

export const DEFAULT_VORONOI_SETTINGS: VoronoiSettings = {
  cellSize: 30,
  edgeWidth: 0.3,
  edgeColor: 0,
  colorMode: 0,
  randomize: 0.8,
  brightness: 0,
  contrast: 0,
}

export type VoronoiCellResult = Readonly<{
  closestCell: VoronoiVec2
  closestDistance: number
  secondDistance: number
}>

export function voronoiHash2([x, y]: VoronoiVec2): VoronoiVec2 {
  const k: VoronoiVec2 = [0.3183099, 0.3678794]
  const point: VoronoiVec2 = [x * k[0] + k[1], y * k[1] + k[0]]
  const shared = fract(point[0] * point[1] * (point[0] + point[1]))
  return [fract(16 * k[0] * shared) * 2 - 1, fract(16 * k[1] * shared) * 2 - 1]
}

export function findVoronoiCell(
  [x, y]: VoronoiVec2,
  randomize: number,
): VoronoiCellResult {
  const integerX = Math.floor(x)
  const integerY = Math.floor(y)
  const fractionalX = fract(x)
  const fractionalY = fract(y)
  let closestDistance = 8
  let secondDistance = 8
  let closestCell: VoronoiVec2 = [0, 0]

  for (let neighborY = -1; neighborY <= 1; neighborY += 1) {
    for (let neighborX = -1; neighborX <= 1; neighborX += 1) {
      const cell: VoronoiVec2 = [integerX + neighborX, integerY + neighborY]
      const hash = voronoiHash2(cell)
      const pointX = neighborX + 0.5 + hash[0] * randomize * 0.5
      const pointY = neighborY + 0.5 + hash[1] * randomize * 0.5
      const distance = Math.hypot(pointX - fractionalX, pointY - fractionalY)
      if (distance < closestDistance) {
        secondDistance = closestDistance
        closestDistance = distance
        closestCell = cell
      } else if (distance < secondDistance) {
        secondDistance = distance
      }
    }
  }

  return { closestCell, closestDistance, secondDistance }
}

export function sampleVoronoiSourceLinear(
  rgb: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  u: number,
  v: number,
): VoronoiRgb {
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

export function traceVoronoiAt(
  input: VoronoiReferenceInput,
  x: number,
  y: number,
): VoronoiTrace {
  assertSource(input)
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x >= input.width || y < 0 || y >= input.height) {
    throw new RangeError('Voronoi trace coordinates must be in-bounds integers')
  }
  return traceVoronoiUnchecked(input, x, y)
}

function traceVoronoiUnchecked(
  input: VoronoiReferenceInput,
  x: number,
  y: number,
): VoronoiTrace {
  const { rgb, width, height, settings } = input
  const uv: VoronoiVec2 = [(x + 0.5) / width, (y + 0.5) / height]
  const scaledPoint: VoronoiVec2 = [
    uv[0] * width / settings.cellSize,
    uv[1] * height / settings.cellSize,
  ]
  const cell = findVoronoiCell(scaledPoint, settings.randomize)
  const edgeDistance = cell.secondDistance - cell.closestDistance
  const interiorMask = smoothstep(0, settings.edgeWidth * 0.3, edgeDistance)
  const centerUv: VoronoiVec2 = [
    clamp01((cell.closestCell[0] + 0.5) * settings.cellSize / width),
    clamp01((cell.closestCell[1] + 0.5) * settings.cellSize / height),
  ]
  let cellColor: VoronoiRgb
  let averageSampleCount = 0

  if (settings.colorMode < 0.5) {
    const sum = [0, 0, 0]
    for (let deltaY = -2; deltaY <= 2; deltaY += 1) {
      for (let deltaX = -2; deltaX <= 2; deltaX += 1) {
        const sample = sampleVoronoiSourceLinear(
          rgb,
          width,
          height,
          (cell.closestCell[0] + 0.5 + deltaX * 0.2) * settings.cellSize / width,
          (cell.closestCell[1] + 0.5 + deltaY * 0.2) * settings.cellSize / height,
        )
        sum[0] += sample[0]
        sum[1] += sample[1]
        sum[2] += sample[2]
        averageSampleCount += 1
      }
    }
    cellColor = [sum[0] / averageSampleCount, sum[1] / averageSampleCount, sum[2] / averageSampleCount]
  } else if (settings.colorMode < 1.5) {
    cellColor = sampleVoronoiSourceLinear(rgb, width, height, centerUv[0], centerUv[1])
  } else {
    const currentColor = sampleVoronoiSourceLinear(rgb, width, height, uv[0], uv[1])
    const centerColor = sampleVoronoiSourceLinear(rgb, width, height, centerUv[0], centerUv[1])
    const gradient = smoothstep(0, 0.7, cell.closestDistance) * 0.5
    cellColor = mixRgb(centerColor, currentColor, gradient)
  }

  const edgeColor: VoronoiRgb = settings.edgeColor < 0.5
    ? [0, 0, 0]
    : settings.edgeColor < 1.5
      ? [1, 1, 1]
      : scaleRgb(cellColor, 0.3)
  const composedColor = mixRgb(edgeColor, cellColor, interiorMask)
  const output = adjustSource(composedColor, settings.brightness, settings.contrast)

  return {
    averageSampleCount,
    cellColor,
    centerUv,
    closestCell: cell.closestCell,
    closestDistance: cell.closestDistance,
    composedColor,
    edgeColor,
    edgeDistance,
    interiorMask,
    output,
    scaledPoint,
    secondDistance: cell.secondDistance,
    uv,
  }
}

export function renderVoronoiReference(
  input: VoronoiReferenceInput,
): VoronoiReferenceOutput {
  assertSource(input)
  const data = new Uint8ClampedArray(input.width * input.height * 3)
  for (let y = 0; y < input.height; y += 1) {
    for (let x = 0; x < input.width; x += 1) {
      const { output } = traceVoronoiUnchecked(input, x, y)
      const offset = (y * input.width + x) * 3
      data[offset] = output[0] * 255
      data[offset + 1] = output[1] * 255
      data[offset + 2] = output[2] * 255
    }
  }
  return { channels: 3, data, height: input.height, width: input.width }
}

function adjustSource(source: VoronoiRgb, brightness: number, contrast: number): VoronoiRgb {
  const normalizedBrightness = brightness / 100
  const normalizedContrast = contrast / 100
  const factor = (1 + normalizedContrast) / (1 - normalizedContrast * 0.99)
  const adjust = (channel: number) => clamp01(
    (channel + normalizedBrightness - 0.5) * factor + 0.5,
  )
  return [adjust(source[0]), adjust(source[1]), adjust(source[2])]
}

function assertSource(input: VoronoiReferenceInput) {
  if (!Number.isInteger(input.width) || !Number.isInteger(input.height) || input.width <= 0 || input.height <= 0) {
    throw new RangeError('Voronoi dimensions must be positive integers')
  }
  if (input.rgb.length !== input.width * input.height * 3) {
    throw new RangeError('Voronoi RGB input length must equal width * height * 3')
  }
  const { settings } = input
  assertRange('cellSize', settings.cellSize, 10, 100)
  assertStep('cellSize', settings.cellSize, 10, 5)
  assertRange('edgeWidth', settings.edgeWidth, 0, 1)
  assertStep('edgeWidth', settings.edgeWidth, 0, 0.05)
  if (![0, 1, 2].includes(settings.edgeColor)) {
    throw new RangeError('Voronoi edgeColor must be 0, 1, or 2')
  }
  if (![0, 1, 2].includes(settings.colorMode)) {
    throw new RangeError('Voronoi colorMode must be 0, 1, or 2')
  }
  assertRange('randomize', settings.randomize, 0, 1)
  assertStep('randomize', settings.randomize, 0, 0.05)
  assertRange('brightness', settings.brightness, -100, 100)
  assertInteger('brightness', settings.brightness)
  assertRange('contrast', settings.contrast, -100, 100)
  assertInteger('contrast', settings.contrast)
}

function assertRange(name: string, value: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new RangeError(`Voronoi ${name} must be between ${minimum} and ${maximum}`)
  }
}

function assertStep(name: string, value: number, minimum: number, step: number) {
  const steps = (value - minimum) / step
  if (Math.abs(steps - Math.round(steps)) > 1e-9) {
    throw new RangeError(`Voronoi ${name} must use increments of ${step}`)
  }
}

function assertInteger(name: string, value: number) {
  if (!Number.isInteger(value)) throw new RangeError(`Voronoi ${name} must be an integer`)
}

function sampleTexel(
  rgb: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): VoronoiRgb {
  const clampedX = Math.min(width - 1, Math.max(0, x))
  const clampedY = Math.min(height - 1, Math.max(0, y))
  const offset = (clampedY * width + clampedX) * 3
  return [rgb[offset] / 255, rgb[offset + 1] / 255, rgb[offset + 2] / 255]
}

function mixRgb(from: VoronoiRgb, to: VoronoiRgb, amount: number): VoronoiRgb {
  return [mix(from[0], to[0], amount), mix(from[1], to[1], amount), mix(from[2], to[2], amount)]
}

function scaleRgb(color: VoronoiRgb, amount: number): VoronoiRgb {
  return [color[0] * amount, color[1] * amount, color[2] * amount]
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp01((value - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

function mix(from: number, to: number, amount: number) {
  return from + (to - from) * amount
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function fract(value: number) {
  return value - Math.floor(value)
}
