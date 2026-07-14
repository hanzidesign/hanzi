import { describe, expect, it } from 'vitest'

import {
  DEFAULT_PIXEL_SORT_SETTINGS,
  getPixelSortThreshold,
  hashPixelSort11,
  isPixelSortSpanStart,
  renderPixelSortReference,
  samplePixelSortSourceLinear,
  tracePixelSortSpan,
  type PixelSortSettings,
} from './pixel-sort-core'

describe('Pixel Sort deterministic equations', () => {
  it('defaults Sort Mode to hue', () => {
    expect(DEFAULT_PIXEL_SORT_SETTINGS.mode).toBe('hue')
  })

  it('matches the per-line Grainrad hash and ±25% Randomness threshold range', () => {
    expect(hashPixelSort11(0)).toBe(0)
    expect(hashPixelSort11(0.173)).toBeCloseTo(0.707_578_868_380_525, 12)
    expect(hashPixelSort11(-0.173)).toBeCloseTo(0.401_791_092_032_453_9, 12)
    expect(getPixelSortThreshold(0, 0.25, 1)).toBe(0.1875)
    expect(getPixelSortThreshold(1, 0.25, 1)).toBeCloseTo(0.275_947_358_547_565_64, 12)
    expect(getPixelSortThreshold(7, 0.25, 0)).toBe(0.25)
  })

  it('preserves the UI mode mismatch and hidden dark mode', () => {
    const darkGray = [0.1, 0.1, 0.1] as const
    expect(isPixelSortSpanStart(darkGray, 0.25, 'brightness')).toBe(true)
    expect(isPixelSortSpanStart(darkGray, 0.25, 'hue')).toBe(true)
    expect(isPixelSortSpanStart(darkGray, 0.25, 'saturation')).toBe(false)
    expect(isPixelSortSpanStart(darkGray, 0.25, 'dark')).toBe(true)

    const saturatedButDark = [0.3, 0, 0] as const
    expect(isPixelSortSpanStart(saturatedButDark, 0.25, 'saturation')).toBe(true)
  })

  it('uses linear clamp-to-edge source sampling', () => {
    const rgb = rowRgb([[100, 100, 100], [200, 200, 200]])
    expect(samplePixelSortSourceLinear(rgb, 2, 1, 0, 0.5)).toEqual([
      100 / 255,
      100 / 255,
      100 / 255,
    ])
    expect(samplePixelSortSourceLinear(rgb, 2, 1, 0.5, 0.5)).toEqual([
      150 / 255,
      150 / 255,
      150 / 255,
    ])
    expect(samplePixelSortSourceLinear(rgb, 2, 1, 1, 0.5)).toEqual([
      200 / 255,
      200 / 255,
      200 / 255,
    ])
  })

  it('includes terminal non-span pixels in span distances and sample endpoints', () => {
    const rgb = rowRgb([
      [0, 0, 0],
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [0, 0, 0],
    ])
    const trace = tracePixelSortSpan({
      height: 1,
      rgb,
      settings: { ...DEFAULT_PIXEL_SORT_SETTINGS, mode: 'brightness', randomness: 0, streakLength: 10 },
      width: 5,
      x: 2,
      y: 0,
    })

    expect(trace).toMatchObject({
      actualSamples: 4,
      endDistance: 2,
      sortable: true,
      spanSize: 4,
      startDistance: 2,
    })
    expect(trace.sampleOffsets[0]).toBe(-2)
    expect(trace.sampleOffsets.at(-1)).toBe(2)
  })

  it('caps collected samples at exactly 24 while Streak Length still changes search distances', () => {
    const rgb = solidRgb(100, 1, [255, 255, 255])
    const short = tracePixelSortSpan({
      height: 1,
      rgb,
      settings: { ...DEFAULT_PIXEL_SORT_SETTINGS, mode: 'brightness', randomness: 0, streakLength: 10 },
      width: 100,
      x: 50,
      y: 0,
    })
    const long = tracePixelSortSpan({
      height: 1,
      rgb,
      settings: { ...DEFAULT_PIXEL_SORT_SETTINGS, mode: 'brightness', randomness: 0, streakLength: 100 },
      width: 100,
      x: 50,
      y: 0,
    })

    expect(short).toMatchObject({ actualSamples: 20, spanSize: 20 })
    expect(long).toMatchObject({ actualSamples: 24, endDistance: 50, spanSize: 101, startDistance: 51 })
    expect(long.sampleOffsets).toHaveLength(24)
  })

  it('uses the exact horizontal, vertical, and normalized diagonal axes and line coordinates', () => {
    const rgb = solidRgb(6, 5, [255, 255, 255])
    const trace = (direction: PixelSortSettings['direction']) => tracePixelSortSpan({
      height: 5,
      rgb,
      settings: { ...DEFAULT_PIXEL_SORT_SETTINGS, direction, randomness: 0, streakLength: 10 },
      width: 6,
      x: 3,
      y: 1,
    })

    expect(trace('horizontal')).toMatchObject({ direction: [1, 0], lineCoordinate: 1 })
    expect(trace('vertical')).toMatchObject({ direction: [0, 1], lineCoordinate: 3 })
    expect(trace('diagonal').lineCoordinate).toBe(2)
    expect(trace('diagonal').direction).toEqual([
      expect.closeTo(Math.SQRT1_2, 12),
      expect.closeTo(Math.SQRT1_2, 12),
    ])
  })
})

describe('Pixel Sort CPU reference', () => {
  it('returns RGB output and validates source dimensions and every setting domain', () => {
    const output = render()
    expect(output).toMatchObject({ channels: 3, height: 16, width: 24 })
    expect(output.data).toHaveLength(24 * 16 * 3)

    expect(() => renderPixelSortReference({
      height: 1,
      rgb: new Uint8Array(2),
      settings: DEFAULT_PIXEL_SORT_SETTINGS,
      width: 1,
    })).toThrow('width * height * 3')
    expect(() => render({ settings: { threshold: Number.NaN } })).toThrow('finite')
    expect(() => render({ settings: { streakLength: 9 } })).toThrow('between 10 and 300')
    expect(() => render({ settings: { streakLength: 10.5 } })).toThrow('integer')
    expect(() => render({ settings: { intensity: 1.1 } })).toThrow('between 0 and 1')
    expect(() => render({ settings: { direction: 'radial' as PixelSortSettings['direction'] } })).toThrow(
      'direction',
    )
  })

  it('keeps Brightness and Contrast out of span detection and applies them only to final RGB', () => {
    const rgb = gradientRgb(24, 16)
    const baseSettings = { ...DEFAULT_PIXEL_SORT_SETTINGS, randomness: 0, streakLength: 20 }
    const baseTrace = tracePixelSortSpan({ height: 16, rgb, settings: baseSettings, width: 24, x: 12, y: 8 })
    const adjustedTrace = tracePixelSortSpan({
      height: 16,
      rgb,
      settings: { ...baseSettings, brightness: 60, contrast: -80 },
      width: 24,
      x: 12,
      y: 8,
    })
    expect(adjustedTrace).toEqual(baseTrace)

    const base = render({ rgb, settings: baseSettings }).data
    const adjusted = render({ rgb, settings: { ...baseSettings, brightness: 60, contrast: -80 } }).data
    expect(adjusted).not.toEqual(base)
  })

  it('uses Reverse for descending sort and Intensity only for the final blend', () => {
    const rgb = stripedRgb(24, 8)
    const ascending = render({
      height: 8,
      rgb,
      settings: { intensity: 1, randomness: 0, reverse: false, streakLength: 20 },
      width: 24,
    }).data
    const descending = render({
      height: 8,
      rgb,
      settings: { intensity: 1, randomness: 0, reverse: true, streakLength: 20 },
      width: 24,
    }).data
    const untouched = render({
      height: 8,
      rgb,
      settings: { intensity: 0, randomness: 0, reverse: true, streakLength: 20 },
      width: 24,
    }).data

    expect(descending).not.toEqual(ascending)
    expect(untouched).toEqual(rgb)
  })

  it('makes each remaining Pixel Sort output setting observable on mixed spans', () => {
    const source = stripedRgb(32, 24)
    const baseSettings = { mode: 'brightness' as const, randomness: 0.3, streakLength: 30, threshold: 0.4 }
    const base = render({ height: 24, rgb: source, settings: baseSettings, width: 32 }).data
    const variants: ReadonlyArray<Partial<PixelSortSettings>> = [
      { direction: 'vertical' },
      { direction: 'diagonal' },
      { mode: 'hue' },
      { mode: 'saturation' },
      { mode: 'dark' },
      { threshold: 0.1 },
      { intensity: 0.2 },
      { randomness: 1 },
      { reverse: true },
      { brightness: 30 },
      { contrast: 60 },
    ]

    for (const settings of variants) {
      expect(
        render({
          height: 24,
          rgb: source,
          settings: { ...baseSettings, ...settings },
          width: 32,
        }).data,
        JSON.stringify(settings),
      ).not.toEqual(base)
    }
  })
})

function render(options: {
  height?: number
  rgb?: Uint8Array | Uint8ClampedArray
  settings?: Partial<PixelSortSettings>
  width?: number
} = {}) {
  const height = options.height ?? 16
  const width = options.width ?? 24
  return renderPixelSortReference({
    height,
    rgb: options.rgb ?? stripedRgb(width, height),
    settings: { ...DEFAULT_PIXEL_SORT_SETTINGS, ...options.settings },
    width,
  })
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
      data[offset + 2] = (x + y) / Math.max(1, width + height - 2) * 255
    }
  }
  return data
}

function stripedRgb(width: number, height: number) {
  const colors = [
    [0, 0, 0],
    [240, 40, 40],
    [30, 220, 80],
    [40, 80, 245],
    [220, 180, 20],
    [20, 20, 20],
    [80, 80, 80],
  ] as const
  const data = new Uint8ClampedArray(width * height * 3)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const color = colors[(x * 3 + y * 2) % colors.length]
      data.set(color, (y * width + x) * 3)
    }
  }
  return data
}
