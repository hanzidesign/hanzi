import { describe, expect, it } from 'vitest'

import {
  DEFAULT_PIXEL_SORT_SETTINGS,
  getPixelSortThreshold,
  hashPixelSort11,
  isPixelSortSpanStart,
  renderPixelSortFrame,
  tracePixelSortSpan,
  type PixelSortDirection,
  type PixelSortSettings,
} from './pixel-sort-core'

describe('Pixel Sort production contracts', () => {
  it('keeps the production defaults, hash, and interval predicates', () => {
    expect(DEFAULT_PIXEL_SORT_SETTINGS.mode).toBe('hue')
    expect(hashPixelSort11(0)).toBe(0)
    expect(hashPixelSort11(0.173)).toBeCloseTo(0.707_578_868_380_525, 12)
    expect(getPixelSortThreshold(0, 0.25, 1)).toBe(0.1875)

    const darkGray = [0.1, 0.1, 0.1] as const
    expect(isPixelSortSpanStart(darkGray, 0.25, 'brightness')).toBe(true)
    expect(isPixelSortSpanStart(darkGray, 0.25, 'hue')).toBe(true)
    expect(isPixelSortSpanStart(darkGray, 0.25, 'saturation')).toBe(false)
    expect(isPixelSortSpanStart(darkGray, 0.25, 'dark')).toBe(true)
  })

  it('accepts and returns RGBA and validates every public domain', () => {
    const output = render({ width: 3, height: 2 })
    expect(output).toMatchObject({ channels: 4, height: 2, width: 3 })
    expect(output.data).toHaveLength(3 * 2 * 4)

    expect(() => renderPixelSortFrame({
      height: 1,
      rgba: new Uint8Array(3),
      settings: DEFAULT_PIXEL_SORT_SETTINGS,
      width: 1,
    })).toThrow('width * height * 4')
    expect(() => render({ settings: { threshold: Number.NaN } })).toThrow('finite')
    expect(() => render({ settings: { streakLength: 9 } })).toThrow('between 10 and 300')
    expect(() => render({ settings: { streakLength: 10.5 } })).toThrow('integer')
    expect(() => render({ settings: { intensity: 1.1 } })).toThrow('between 0 and 1')
    expect(() => render({
      settings: { direction: 'radial' as PixelSortSettings['direction'] },
    })).toThrow('direction')
  })
})

describe('Pixel Sort exact CPU scanline oracle', () => {
  it('stably permutes complete RGBA texels by luminance in either order', () => {
    const source = row([
      [90, 90, 90, 1],
      [30, 30, 30, 2],
      [30, 30, 30, 3],
      [70, 70, 70, 4],
    ])
    const ascending = render({ rgba: source, settings: exactSettings(), width: 4 }).data
    const descending = render({ rgba: source, settings: exactSettings({ reverse: true }), width: 4 }).data

    expect(texels(ascending)).toEqual([
      [30, 30, 30, 2],
      [30, 30, 30, 3],
      [70, 70, 70, 4],
      [90, 90, 90, 1],
    ])
    expect(texels(descending)).toEqual([
      [90, 90, 90, 1],
      [70, 70, 70, 4],
      [30, 30, 30, 2],
      [30, 30, 30, 3],
    ])
  })

  it('preserves every unique texel in runs longer than the old 24-sample cap', () => {
    const values = Array.from({ length: 80 }, (_, index) => 30 + ((index * 37) % 80))
    const source = row(values.map((value, index) => [value, value, value, index + 1]))
    const output = render({
      rgba: source,
      settings: exactSettings({ streakLength: 100 }),
      width: 80,
    }).data

    expect(multiset(output)).toEqual(multiset(source))
    expect(new Set(texels(output).map((pixel) => pixel[3])).size).toBe(80)
    expect(texels(output).map((pixel) => pixel[0])).toEqual([...values].sort((a, b) => a - b))
  })

  it('uses coherent globally anchored chunks no longer than Streak Length', () => {
    const source = solid(25, 1, [80, 80, 80, 255])
    const settings = exactSettings({ streakLength: 10 })
    const traces = [0, 4, 9, 10, 15, 19, 20, 24].map((x) => tracePixelSortSpan({
      height: 1,
      rgba: source,
      settings,
      width: 25,
      x,
      y: 0,
    }))

    expect(traces.slice(0, 3).map(spanIdentity)).toEqual(Array(3).fill('0:10:0:9'))
    expect(traces.slice(3, 6).map(spanIdentity)).toEqual(Array(3).fill('10:20:10:19'))
    expect(traces.slice(6).map(spanIdentity)).toEqual(Array(2).fill('20:25:20:24'))
    expect(traces.every((trace) => trace.spanSize <= settings.streakLength)).toBe(true)
  })

  it('splits an anchored block at threshold gaps without sliding endpoints', () => {
    const source = row([
      ...Array.from({ length: 4 }, () => [80, 80, 80, 255] as const),
      [0, 0, 0, 255],
      ...Array.from({ length: 5 }, () => [80, 80, 80, 255] as const),
    ])
    const settings = exactSettings({ streakLength: 10 })
    const left = tracePixelSortSpan({ height: 1, rgba: source, settings, width: 10, x: 1, y: 0 })
    const gap = tracePixelSortSpan({ height: 1, rgba: source, settings, width: 10, x: 4, y: 0 })
    const right = tracePixelSortSpan({ height: 1, rgba: source, settings, width: 10, x: 7, y: 0 })

    expect(left).toMatchObject({ spanStart: 0, spanEnd: 3, spanSize: 4 })
    expect(gap).toMatchObject({ spanSize: 0, sortable: false })
    expect(right).toMatchObject({ spanStart: 5, spanEnd: 9, spanSize: 5 })
  })

  it.each<PixelSortDirection>(['horizontal', 'vertical', 'diagonal'])(
    'never moves provenance across an integer %s scanline',
    (direction) => {
      const width = 7
      const height = 6
      const source = taggedFixture(width, height)
      const output = render({
        height,
        rgba: source,
        settings: exactSettings({ direction, streakLength: 20 }),
        width,
      }).data

      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const tag = output[(y * width + x) * 4 + 3] - 1
          const sourceX = tag % width
          const sourceY = Math.floor(tag / width)
          if (direction === 'horizontal') expect(sourceY).toBe(y)
          if (direction === 'vertical') expect(sourceX).toBe(x)
          if (direction === 'diagonal') expect(sourceX - sourceY).toBe(x - y)
        }
      }
    },
  )

  it('uses deterministic line randomness for threshold and anchored phase', () => {
    const source = taggedFixture(30, 4)
    const settings = exactSettings({ randomness: 1, streakLength: 10 })
    const first = render({ height: 4, rgba: source, settings, width: 30 }).data
    const second = render({ height: 4, rgba: source, settings, width: 30 }).data
    const starts = Array.from({ length: 4 }, (_, y) => tracePixelSortSpan({
      height: 4,
      rgba: source,
      settings,
      width: 30,
      x: 15,
      y,
    }).blockStart)

    expect(second).toEqual(first)
    expect(new Set(starts).size).toBeGreaterThan(1)
    expect(first).not.toEqual(render({
      height: 4,
      rgba: source,
      settings: exactSettings({ randomness: 0, streakLength: 10 }),
      width: 30,
    }).data)
  })

  it('applies Intensity before RGB-only Brightness and Contrast adjustments', () => {
    const source = row([
      [200, 200, 200, 40],
      [50, 50, 50, 200],
    ])
    const output = render({
      rgba: source,
      settings: exactSettings({ brightness: 10, intensity: 0.5 }),
      width: 2,
    }).data

    expect(texels(output)).toEqual([
      [150, 150, 150, 120],
      [150, 150, 150, 120],
    ])
    expect(render({ rgba: source, settings: exactSettings({ intensity: 0 }), width: 2 }).data).toEqual(source)
  })

  it('keeps Brightness and Contrast out of classification and span construction', () => {
    const source = taggedFixture(20, 3)
    const base = tracePixelSortSpan({
      height: 3,
      rgba: source,
      settings: exactSettings(),
      width: 20,
      x: 8,
      y: 1,
    })
    const adjusted = tracePixelSortSpan({
      height: 3,
      rgba: source,
      settings: exactSettings({ brightness: 80, contrast: -70 }),
      width: 20,
      x: 8,
      y: 1,
    })
    expect(adjusted).toEqual(base)
  })

  it('makes every Pixel Sort renderer controller observable on a mixed 2D frame', () => {
    const width = 32
    const height = 24
    const source = colorfulFixture(width, height)
    const baseSettings = exactSettings({
      mode: 'brightness',
      threshold: 0.3,
      streakLength: 20,
      randomness: 0,
    })
    const base = renderPixelSortFrame({ rgba: source, width, height, settings: baseSettings }).data
    const variants: ReadonlyArray<Partial<PixelSortSettings>> = [
      { direction: 'vertical' },
      { direction: 'diagonal' },
      { mode: 'hue' },
      { mode: 'saturation' },
      { threshold: 0.05 },
      { streakLength: 10 },
      { intensity: 0.35 },
      { randomness: 1 },
      { reverse: true },
      { brightness: 30 },
      { contrast: 60 },
    ]

    for (const variant of variants) {
      const output = renderPixelSortFrame({
        rgba: source,
        width,
        height,
        settings: { ...baseSettings, ...variant },
      }).data
      expect(output, JSON.stringify(variant)).not.toEqual(base)
    }
  })

  it('keeps Mix zero exact while fixed Streak palette, Mix, and Background remain observable', () => {
    const width = 32
    const height = 24
    const source = colorfulFixture(width, height)
    const originalSettings = exactSettings({
      mode: 'brightness',
      threshold: 0.3,
      streakLength: 20,
    })
    const original = renderPixelSortFrame({ rgba: source, width, height, settings: originalSettings }).data
    const paletteSettings: PixelSortSettings = {
      ...originalSettings,
      mix: 1,
      shadow: '#102030',
      midtone: '#d04080',
      highlight: '#ffe080',
      background: '#000000',
    }

    const palette = renderPixelSortFrame({ rgba: source, width, height, settings: paletteSettings }).data
    expect(palette).not.toEqual(original)
    const mixZero = renderPixelSortFrame({
      rgba: source,
      width,
      height,
      settings: { ...paletteSettings, mix: 0 },
    }).data
    const mixTwo = renderPixelSortFrame({
      rgba: source,
      width,
      height,
      settings: { ...paletteSettings, mix: 2 },
    }).data
    expect(mixZero).toEqual(original)
    expect(mixTwo).not.toEqual(palette)

    const background = render({
      rgba: row([[0, 0, 0, 255]]),
      settings: { ...paletteSettings, background: '#123456', brightness: 0, contrast: 0 },
      width: 1,
    }).data
    expect(texels(background)).toEqual([[0x12, 0x34, 0x56, 255]])
  })
})

function render(options: {
  height?: number
  rgba?: Uint8Array | Uint8ClampedArray
  settings?: Partial<PixelSortSettings>
  width?: number
} = {}) {
  const width = options.width ?? 12
  const height = options.height ?? 1
  return renderPixelSortFrame({
    height,
    rgba: options.rgba ?? taggedFixture(width, height),
    settings: { ...DEFAULT_PIXEL_SORT_SETTINGS, ...options.settings },
    width,
  })
}

function exactSettings(overrides: Partial<PixelSortSettings> = {}): PixelSortSettings {
  return {
    ...DEFAULT_PIXEL_SORT_SETTINGS,
    background: '#000000',
    brightness: 0,
    contrast: 0,
    intensity: 1,
    mix: 0,
    mode: 'brightness',
    randomness: 0,
    ...overrides,
  }
}

function row(colors: ReadonlyArray<readonly [number, number, number, number]>) {
  return Uint8ClampedArray.from(colors.flat())
}

function solid(
  width: number,
  height: number,
  color: readonly [number, number, number, number],
) {
  return row(Array.from({ length: width * height }, () => color))
}

function taggedFixture(width: number, height: number) {
  return row(Array.from({ length: width * height }, (_, index) => {
    const value = 30 + ((index * 47) % 180)
    return [value, value, value, index + 1] as const
  }))
}

function colorfulFixture(width: number, height: number) {
  return row(Array.from({ length: width * height }, (_, index) => {
    const x = index % width
    const y = Math.floor(index / width)
    return [
      (x * 47 + y * 13) % 256,
      (x * 19 + y * 61) % 256,
      (x * 83 + y * 7) % 256,
      255,
    ] as const
  }))
}

function texels(data: Uint8Array | Uint8ClampedArray) {
  const result: number[][] = []
  for (let offset = 0; offset < data.length; offset += 4) {
    result.push(Array.from(data.slice(offset, offset + 4)))
  }
  return result
}

function multiset(data: Uint8Array | Uint8ClampedArray) {
  return texels(data).map((pixel) => pixel.join(',')).sort()
}

function spanIdentity(trace: ReturnType<typeof tracePixelSortSpan>) {
  return `${trace.blockStart}:${trace.blockEnd}:${trace.spanStart}:${trace.spanEnd}`
}
