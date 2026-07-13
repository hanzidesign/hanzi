import { describe, expect, it } from 'vitest'

import {
  DEFAULT_DOTS_SETTINGS,
  getDotsCellCenter,
  isInsideDotsShape,
  renderDotsReference,
  type DotsSettings,
} from './dots-core'

describe('Dots deterministic equations', () => {
  it('uses Grainrad square and offset-row hex cell centers', () => {
    expect(getDotsCellCenter(0.5, 0.5, 1, 'square')).toEqual([4, 4])
    expect(getDotsCellCenter(12.5, 9.5, 1, 'square')).toEqual([12, 12])

    expect(getDotsCellCenter(4.5, 0.5, 1, 'hex')).toEqual([4, expect.closeTo(3.464, 12)])
    expect(getDotsCellCenter(4.5, 7, 1, 'hex')).toEqual([8, expect.closeTo(10.392, 12)])
    expect(getDotsCellCenter(0.5, 7, 1, 'hex')).toEqual([0, expect.closeTo(10.392, 12)])
  })

  it('uses strict circle, square, and 1.4-scaled diamond boundaries', () => {
    expect(isInsideDotsShape(3, 4, 5, 'circle')).toBe(false)
    expect(isInsideDotsShape(2.999, 4, 5, 'circle')).toBe(true)
    expect(isInsideDotsShape(5, 0, 5, 'square')).toBe(false)
    expect(isInsideDotsShape(4.999, 0, 5, 'square')).toBe(true)
    expect(isInsideDotsShape(4, 3, 5, 'diamond')).toBe(false)
    expect(isInsideDotsShape(3.999, 3, 5, 'diamond')).toBe(true)
  })
})

describe('Dots CPU reference', () => {
  it('returns opaque RGB output and rejects malformed inputs or settings', () => {
    const output = render()
    expect(output).toMatchObject({ channels: 3, width: 24, height: 16 })
    expect(output.data).toHaveLength(24 * 16 * 3)

    expect(() => renderDotsReference({
      height: 1,
      rgb: new Uint8Array(2),
      settings: DEFAULT_DOTS_SETTINGS,
      width: 1,
    })).toThrow('width * height * 3')
    expect(() => render({ settings: { spacing: Number.NaN } })).toThrow('finite')
    expect(() => render({ settings: { sizeMultiplier: 2.1 } })).toThrow('between 0.5 and 2')
    expect(() => render({ settings: { shape: 'line' as DotsSettings['shape'] } })).toThrow('shape')
    expect(() => render({ settings: { background: [0, 0, 256] } })).toThrow('color channel')
  })

  it('samples adjusted source at each cell center with Rec.601 luminance', () => {
    const rgb = solidRgb(8, 8, [255, 0, 0])
    const output = render({
      height: 8,
      rgb,
      settings: { colorMode: 'custom', shape: 'square', sizeMultiplier: 2 },
      width: 8,
    })

    expect(pixelAt(output.data, 8, 3, 3)).toEqual([76, 76, 76])
  })

  it('keeps Grainrad dark-value dots at twenty percent of the base radius', () => {
    const output = render({
      height: 8,
      rgb: solidRgb(8, 8, [0, 0, 0]),
      settings: {
        colorMode: 'custom',
        shape: 'square',
        sizeMultiplier: 1,
        background: [9, 8, 7],
      },
      width: 8,
    })

    expect(pixelAt(output.data, 8, 3, 3)).toEqual([0, 0, 0])
    expect(pixelAt(output.data, 8, 2, 3)).toEqual([9, 8, 7])
  })

  it('preserves adjusted source color in Original mode when Invert only changes radius', () => {
    const baseOptions = {
      height: 8,
      rgb: solidRgb(8, 8, [255, 0, 0]),
      settings: { colorMode: 'original' as const, shape: 'square' as const },
      width: 8,
    }
    const normal = render(baseOptions)
    const inverted = render({ ...baseOptions, settings: { ...baseOptions.settings, invert: true } })

    expect(pixelAt(normal.data, 8, 3, 3)).toEqual([255, 0, 0])
    expect(pixelAt(inverted.data, 8, 3, 3)).toEqual([255, 0, 0])
    expect(pixelAt(normal.data, 8, 2, 3)).toEqual([0, 0, 0])
    expect(pixelAt(inverted.data, 8, 2, 3)).toEqual([255, 0, 0])
  })

  it('preserves the production Mono upload bug: grayscale output and dead Dot Color', () => {
    const source = gradientRgb(24, 16)
    const red = render({
      rgb: source,
      settings: { colorMode: 'custom', foreground: [255, 0, 0] },
    }).data
    const cyan = render({
      rgb: source,
      settings: { colorMode: 'custom', foreground: [0, 255, 255] },
    }).data

    expect(cyan).toEqual(red)
    const visible = firstNonBlackPixel(red)
    expect(visible[0]).toBe(visible[1])
    expect(visible[1]).toBe(visible[2])
  })

  it('uses Background in Original mode even though Grainrad hides that control', () => {
    const source = solidRgb(8, 8, [0, 0, 0])
    const output = render({
      height: 8,
      rgb: source,
      settings: { background: [17, 18, 19], colorMode: 'original' },
      width: 8,
    })

    expect(pixelAt(output.data, 8, 0, 0)).toEqual([17, 18, 19])
  })

  it('makes every functional Dots control observable while keeping Dot Color a no-op', () => {
    const source = gradientRgb(32, 24)
    const base = render({ height: 24, rgb: source, width: 32 }).data
    const variants: ReadonlyArray<Partial<DotsSettings>> = [
      { shape: 'square' },
      { gridType: 'hex' },
      { sizeMultiplier: 1.8 },
      { spacing: 1.7 },
      { invert: true },
      { brightness: 35 },
      { contrast: 65 },
      { colorMode: 'custom' },
      { background: [16, 32, 48] },
    ]

    for (const settings of variants) {
      expect(
        render({ height: 24, rgb: source, settings, width: 32 }).data,
        JSON.stringify(settings),
      ).not.toEqual(base)
    }

    const mono = render({
      height: 24,
      rgb: source,
      settings: { colorMode: 'custom' },
      width: 32,
    }).data
    const monoWithOtherForeground = render({
      height: 24,
      rgb: source,
      settings: { colorMode: 'custom', foreground: [12, 34, 56] },
      width: 32,
    }).data
    expect(monoWithOtherForeground).toEqual(mono)
  })
})

function render(options: {
  height?: number
  rgb?: Uint8Array | Uint8ClampedArray
  settings?: Partial<DotsSettings>
  width?: number
} = {}) {
  const height = options.height ?? 16
  const width = options.width ?? 24
  const rgb = options.rgb ?? gradientRgb(width, height)
  return renderDotsReference({
    height,
    rgb,
    settings: { ...DEFAULT_DOTS_SETTINGS, ...options.settings },
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

function pixelAt(data: Uint8ClampedArray, width: number, x: number, y: number) {
  const offset = (y * width + x) * 3
  return [data[offset], data[offset + 1], data[offset + 2]]
}

function firstNonBlackPixel(data: Uint8ClampedArray) {
  for (let offset = 0; offset < data.length; offset += 3) {
    if (data[offset] || data[offset + 1] || data[offset + 2]) {
      return [data[offset], data[offset + 1], data[offset + 2]]
    }
  }
  throw new Error('Expected at least one visible dot')
}
