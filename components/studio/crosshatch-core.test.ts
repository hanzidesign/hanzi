import { describe, expect, it } from 'vitest'

import {
  DEFAULT_CROSSHATCH_SETTINGS,
  calculateTamWeights,
  hash21,
  hatchPattern,
  renderCrosshatchReference,
  sampleCrosshatchSourceLinear,
  traceCrosshatchAt,
  valueNoise,
  type CrosshatchSettings,
} from './crosshatch-core'

describe('Crosshatch CPU reference', () => {
  it('keeps the production defaults with Line Width inside its physical range', () => {
    expect(DEFAULT_CROSSHATCH_SETTINGS).toEqual({
      angle: 45,
      background: [255, 255, 255],
      brightness: -4,
      contrast: 0,
      density: 6,
      invert: false,
      layers: 3,
      lineColor: [0, 0, 0],
      lineWidth: 0.08,
      randomness: 0,
    })
    expect(() => render({ settings: { lineWidth: 0.08 } })).not.toThrow()
  })

  it('ports production hash21 and smooth value noise exactly', () => {
    expect(hash21([0, 0])).toBe(0)
    expect(hash21([1, 2])).toBeCloseTo(0.9388803026629944, 14)
    expect(hash21([-2.25, 4.5])).toBeCloseTo(0.8744137580106326, 14)
    expect(valueNoise([1.25, 2.75])).toBeCloseTo(0.35947372990368076, 14)
    expect(valueNoise([-0.5, 0.125])).toBeCloseTo(0.312184309534255, 14)
    expect(valueNoise([3, -2])).toBeCloseTo(hash21([3, -2]), 14)
  })

  it('uses width-only rotated hatch coordinates, AA, and deterministic phase wobble', () => {
    const base = {
      angle: 0,
      randomness: 0,
      resolutionX: 48,
      seed: 3,
      spacing: 6,
      uv: [0.303125, 0.67] as const,
      width: 0.12,
    }
    const noWobble = hatchPattern(base)
    const wobble = hatchPattern({ ...base, randomness: 0.8 })
    expect(noWobble).toBeGreaterThan(0)
    expect(noWobble).toBeLessThan(1)
    expect(wobble).not.toBe(noWobble)
    expect(hatchPattern({ ...base, randomness: 0.8 })).toBe(
      hatchPattern({ ...base, randomness: 0.8 }),
    )
    expect(hatchPattern({ ...base, resolutionX: 96 })).not.toBe(noWobble)
  })

  it('builds six cumulative TAM patterns with production spacing, width, angle, and seeds', () => {
    const input = makeInput({
      height: 20,
      rgb: solidRgb(24, 20, [128, 128, 128]),
      settings: { angle: 20, randomness: 0.65 },
      width: 24,
    })
    const x = 7
    const y = 13
    const trace = traceCrosshatchAt(input, x, y)
    const uv = [(x + 0.5) / input.width, (y + 0.5) / input.height] as const
    const baseAngle = 20 * Math.PI / 180
    const hatch = (angle: number, spacing: number, width: number, seed: number) => hatchPattern({
      angle,
      randomness: 0.65,
      resolutionX: input.width,
      seed,
      spacing,
      uv,
      width,
    })
    const expected0 = hatch(baseAngle, 9, input.settings.lineWidth * 0.7, 0)
    const expected1 = Math.max(expected0, hatch(baseAngle + Math.PI * 0.5, 9, input.settings.lineWidth * 0.7, 1))
    const expected2 = Math.max(expected1, hatch(baseAngle, 6, input.settings.lineWidth * 0.8, 2))
    const expected3 = Math.max(expected2, hatch(baseAngle + Math.PI * 0.5, 6, input.settings.lineWidth * 0.8, 3))
    const expected4 = Math.max(expected3, hatch(baseAngle + Math.PI * 0.25, 5.1, input.settings.lineWidth * 0.9, 4))
    const expected5 = Math.max(expected4, hatch(baseAngle + Math.PI * 0.75, 5.1, input.settings.lineWidth * 0.9, 5))

    expect(trace.patterns).toEqual([
      expected0,
      expected1,
      expected2,
      expected3,
      expected4,
      expected5,
    ])
    for (let index = 1; index < trace.patterns.length; index += 1) {
      expect(trace.patterns[index]).toBeGreaterThanOrEqual(trace.patterns[index - 1])
    }
  })

  it('collapses direction availability exactly at Layers 1, 2, 3, and 4', () => {
    const traces = ([1, 2, 3, 4] as const).map((layers) => trace({ layers }))

    expect(traces[0].levels).toEqual(Array(6).fill(traces[0].patterns[0]))
    expect(traces[1].levels).toEqual([
      ...traces[1].patterns.slice(0, 4),
      traces[1].patterns[3],
      traces[1].patterns[3],
    ])
    expect(traces[2].levels).toEqual([
      ...traces[2].patterns.slice(0, 5),
      traces[2].patterns[4],
    ])
    expect(traces[3].levels).toEqual(traces[3].patterns)
  })

  it('uses six clamped darkness ramps and adjacent differences', () => {
    expect(calculateTamWeights(0)).toEqual([0, 0, 0, 0, 0, 0])
    expect(calculateTamWeights(0.25)).toEqual([0.5, 0.5, 0, 0, 0, 0])
    expect(calculateTamWeights(0.5)).toEqual([0, 0, 1, 0, 0, 0])
    expect(calculateTamWeights(5.5 / 6)).toEqual([0, 0, 0, 0, 0.5, 0.5])
    expect(calculateTamWeights(1)).toEqual([0, 0, 0, 0, 0, 1])
  })

  it('uses the production 0.2326 red luma bug after source Brightness then Contrast', () => {
    const red = trace({ brightness: 0 }, [255, 0, 0])
    expect(red.adjustedSource).toEqual([1, 0, 0])
    expect(red.luminance).toBeCloseTo(0.2326, 12)

    const adjusted = trace({ brightness: 25, contrast: 50 }, [64, 64, 64])
    const brightened = 64 / 255 + 0.25
    const factor = 1.5 / 0.505
    expect(adjusted.adjustedSource[0]).toBeCloseTo(
      (brightened - 0.5) * factor + 0.5,
      12,
    )
  })

  it('inverts luminance only and always mixes Background toward Line Color', () => {
    const settings = {
      background: [20, 40, 60] as const,
      brightness: 0,
      lineColor: [220, 180, 140] as const,
    }
    const normalTrace = trace(settings, [180, 120, 60])
    const invertedTrace = trace({ ...settings, invert: true }, [180, 120, 60])
    expect(invertedTrace.luminance).toBeCloseTo(1 - normalTrace.luminance, 12)

    const output = render({ height: 1, rgb: solidRgb(2, 1, [255, 255, 255]), settings, width: 2 })
    const fieldPixel = pixelAt(output.data, 2, 0, 0)
    expect(fieldPixel).not.toEqual(settings.background)
    fieldPixel.forEach((value, index) => {
      expect(value).toBeGreaterThanOrEqual(Math.min(settings.background[index], settings.lineColor[index]))
      expect(value).toBeLessThanOrEqual(Math.max(settings.background[index], settings.lineColor[index]))
    })
  })

  it('keeps hatch gaps visible instead of filling a dark Character with Line Color', () => {
    const output = render({
      height: 36,
      rgb: solidRgb(48, 36, [0, 0, 0]),
      width: 48,
    }).data

    expect(new Set(output).size).toBeGreaterThan(1)
    expect(output).toContain(255)
  })

  it('allows negative Brightness to extend hatch lines across the source field', () => {
    const output = render({
      height: 64,
      rgb: solidRgb(64, 64, [255, 255, 255]),
      width: 64,
    }).data

    expect(new Set(output).size).toBeGreaterThan(1)
    expect(output).toContain(255)
  })

  it('keeps background hatch responsive when canonical Brightness increases', () => {
    const source = solidRgb(64, 48, [255, 255, 255])
    const neutral = render({ height: 48, rgb: source, settings: { brightness: 0 }, width: 64 }).data
    const darkerUiDirection = render({
      height: 48,
      rgb: source,
      settings: { brightness: 25 },
      width: 64,
    }).data

    expect(darkerUiDirection).not.toEqual(neutral)
    expect(new Set(darkerUiDirection).size).toBeGreaterThan(1)
    expect(darkerUiDirection).toContain(255)
  })

  it('keeps canonical Brightness in source-luminance and hatch-density space', () => {
    const source = solidRgb(64, 48, [192, 192, 192])
    const atNegative = render({ height: 48, rgb: source, settings: { brightness: -25 }, width: 64 }).data
    const atZero = render({ height: 48, rgb: source, settings: { brightness: 0 }, width: 64 }).data
    const atPositive = render({ height: 48, rgb: source, settings: { brightness: 25 }, width: 64 }).data

    expect(atNegative).not.toEqual(atZero)
    expect(atPositive).not.toEqual(atZero)
    expect(averageChannel(atNegative)).toBeLessThan(averageChannel(atPositive))
  })

  it('preserves documented contextual no-ops', () => {
    const source = gradientRgb(36, 24)
    const equalPalette = render({
      height: 24,
      rgb: source,
      settings: { background: [77, 88, 99], brightness: 0, lineColor: [77, 88, 99] },
      width: 36,
    }).data
    expect(new Set(equalPalette)).toEqual(new Set([77, 88, 99]))

    const bright = solidRgb(24, 16, [255, 255, 255])
    expect(render({ height: 16, rgb: bright, settings: { angle: 0, brightness: 0 }, width: 24 }).data)
      .not.toEqual(render({ height: 16, rgb: bright, settings: { angle: 90, brightness: 0, randomness: 1 }, width: 24 }).data)

    const dark = solidRgb(24, 16, [0, 0, 0])
    expect(render({ height: 16, rgb: dark, settings: { density: 2 }, width: 24 }).data)
      .not.toEqual(render({ height: 16, rgb: dark, settings: { density: 12, layers: 4 }, width: 24 }).data)

    const gray = solidRgb(24, 16, [128, 128, 128])
    expect(render({ height: 16, rgb: gray, settings: { angle: 0, lineWidth: 0.5 }, width: 24 }).data)
      .not.toEqual(render({
        height: 16,
        rgb: gray,
        settings: { angle: 90, density: 12, layers: 4, lineWidth: 0.5, randomness: 1 },
        width: 24,
      }).data)
  })

  it('makes every functional setting observable in an active context', () => {
    const width = 48
    const height = 36
    const source = gradientRgb(width, height)
    const base = render({ height, rgb: source, width }).data
    const variants: ReadonlyArray<Partial<CrosshatchSettings>> = [
      { density: 8 },
      { layers: 4 },
      { angle: 70 },
      { lineWidth: 0.5 },
      { randomness: 0.8 },
      { invert: true },
      { brightness: 25 },
      { contrast: 60 },
      { lineColor: [255, 40, 80] },
      { background: [12, 34, 56] },
    ]

    for (const settings of variants) {
      expect(render({ height, rgb: source, settings, width }).data, JSON.stringify(settings))
        .not.toEqual(base)
    }
  })

  it('uses clamp-to-edge linear source sampling', () => {
    const rgb = rowRgb([[0, 10, 20], [200, 210, 220]])
    expect(sampleCrosshatchSourceLinear(rgb, 2, 1, -1, 0.5)).toEqual([0, 10 / 255, 20 / 255])
    const midpoint = sampleCrosshatchSourceLinear(rgb, 2, 1, 0.5, 0.5)
    expect(midpoint[0]).toBeCloseTo(100 / 255, 14)
    expect(midpoint[1]).toBeCloseTo(110 / 255, 14)
    expect(midpoint[2]).toBeCloseTo(120 / 255, 14)
  })

  it('rejects malformed input and settings across the full Line Width range', () => {
    expect(() => renderCrosshatchReference({
      height: 1,
      rgb: new Uint8Array(2),
      settings: DEFAULT_CROSSHATCH_SETTINGS,
      width: 1,
    })).toThrow('width * height * 3')
    expect(() => render({ settings: { density: 2.5 } })).toThrow('integer')
    expect(() => render({ settings: { layers: 5 } })).toThrow('between 1 and 4')
    expect(() => render({ settings: { angle: 12 } })).toThrow('increments of 5')
    expect(() => render({ settings: { lineWidth: 0 } })).toThrow('between 0.01 and 0.5')
    expect(() => render({ settings: { lineWidth: 0.51 } })).toThrow('between 0.01 and 0.5')
    expect(() => render({ settings: { lineWidth: 0.015 } })).toThrow('increments of 0.01')
    expect(() => render({ settings: { randomness: 0.03 } })).toThrow('increments of 0.05')
    expect(() => render({ settings: { brightness: 1.5 } })).toThrow('integer')
    expect(() => render({ settings: { invert: 1 as unknown as boolean } })).toThrow('boolean')
    expect(() => render({ settings: { lineColor: [0, 0, 256] } })).toThrow('color channel')
    expect(() => traceCrosshatchAt(makeInput(), -1, 0)).toThrow('in-bounds')
  })
})

function trace(
  settings: Partial<CrosshatchSettings> = {},
  color: readonly [number, number, number] = [96, 96, 96],
) {
  return traceCrosshatchAt(makeInput({ rgb: solidRgb(16, 12, color), settings }), 5, 7)
}

function render(options: {
  height?: number
  rgb?: Uint8Array | Uint8ClampedArray
  settings?: Partial<CrosshatchSettings>
  width?: number
} = {}) {
  return renderCrosshatchReference(makeInput(options))
}

function makeInput(options: {
  height?: number
  rgb?: Uint8Array | Uint8ClampedArray
  settings?: Partial<CrosshatchSettings>
  width?: number
} = {}) {
  const width = options.width ?? 16
  const height = options.height ?? 12
  return {
    height,
    rgb: options.rgb ?? gradientRgb(width, height),
    settings: { ...DEFAULT_CROSSHATCH_SETTINGS, ...options.settings },
    width,
  }
}

function solidRgb(
  width: number,
  height: number,
  color: readonly [number, number, number],
) {
  const data = new Uint8ClampedArray(width * height * 3)
  for (let index = 0; index < width * height; index += 1) data.set(color, index * 3)
  return data
}

function rowRgb(colors: ReadonlyArray<readonly [number, number, number]>) {
  const data = new Uint8ClampedArray(colors.length * 3)
  colors.forEach((color, index) => data.set(color, index * 3))
  return data
}

function gradientRgb(width: number, height: number) {
  const data = new Uint8ClampedArray(width * height * 3)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 3
      data[offset] = x / Math.max(1, width - 1) * 255
      data[offset + 1] = y / Math.max(1, height - 1) * 255
      data[offset + 2] = (x * 3 + y * 5) % 256
    }
  }
  return data
}

function pixelAt(data: Uint8ClampedArray, width: number, x: number, y: number) {
  const offset = (y * width + x) * 3
  return [data[offset], data[offset + 1], data[offset + 2]]
}

function averageChannel(data: Uint8ClampedArray) {
  return data.reduce((sum, value) => sum + value, 0) / data.length
}
