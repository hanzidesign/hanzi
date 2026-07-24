import { describe, expect, it } from 'vitest'

import {
  DEFAULT_CONTOUR_SETTINGS,
  renderContourReference,
  type ContourSettings,
} from './contour-core'

describe('Contour CPU reference', () => {
  it('returns RGB output and rejects malformed input or settings', () => {
    const output = render()
    expect(output).toMatchObject({ channels: 3, height: 16, width: 24 })
    expect(output.data).toHaveLength(24 * 16 * 3)

    expect(() => renderContourReference({
      height: 1,
      rgb: new Uint8Array(2),
      settings: DEFAULT_CONTOUR_SETTINGS,
      width: 1,
    })).toThrow('width * height * 3')
    expect(() => render({ settings: { lineThickness: Number.NaN } })).toThrow('finite')
    expect(() => render({ settings: { levels: 2 } })).toThrow('between 3 and 20')
    expect(() => render({ settings: { levels: 3.5 } })).toThrow('integer')
    expect(() => render({ settings: { fillMode: 'dots' as ContourSettings['fillMode'] } })).toThrow(
      'fill mode',
    )
    expect(() => render({ settings: { lineColor: [-1, 0, 0] } })).toThrow('color channel')
  })

  it('uses linear clamp-to-edge samples for fractional neighbor offsets', () => {
    const output = render({
      height: 1,
      rgb: rowRgb([[100, 100, 100], [200, 200, 200]]),
      settings: {
        background: [255, 255, 255],
        fillMode: 'lines',
        levels: 3,
        lineColor: [0, 0, 0],
        lineThickness: 0.5,
      },
      width: 2,
    })

    // At x=0, the left sample clamps to 100 and the right sample linearly
    // interpolates to 150. Both stay in bin 1; nearest/wrapped sampling would not.
    expect(pixelAt(output.data, 2, 0, 0)).toEqual([255, 255, 255])
    expect(pixelAt(output.data, 2, 1, 0)).toEqual([0, 0, 0])
  })

  it('uses Line Thickness as neighbor sample distance rather than geometric stroke width', () => {
    const rgb = rowRgb([
      [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0],
      [255, 255, 255], [255, 255, 255], [255, 255, 255], [255, 255, 255],
    ])
    const settings = {
      background: [255, 255, 255] as const,
      fillMode: 'lines' as const,
      levels: 3,
      lineColor: [0, 0, 0] as const,
    }
    const near = render({ height: 1, rgb, settings: { ...settings, lineThickness: 0.5 }, width: 8 })
    const far = render({ height: 1, rgb, settings: { ...settings, lineThickness: 3 }, width: 8 })

    expect(pixelAt(near.data, 8, 2, 0)).toEqual([255, 255, 255])
    expect(pixelAt(far.data, 8, 2, 0)).toEqual([0, 0, 0])
  })

  it('preserves Studio’s Invert bug: center is inverted while neighbors are not', () => {
    const output = render({
      height: 4,
      rgb: solidRgb(4, 4, [64, 64, 64]),
      settings: { invert: true, lineColor: [255, 0, 0] },
      width: 4,
    })

    for (let y = 0; y < 4; y += 1) {
      for (let x = 0; x < 4; x += 1) {
        expect(pixelAt(output.data, 4, x, y)).toEqual([255, 0, 0])
      }
    }
  })

  it('midpoint-quantizes adjusted RGB independently in Original filled mode', () => {
    const output = render({
      height: 1,
      rgb: solidRgb(1, 1, [100, 150, 200]),
      width: 1,
    })
    expect(pixelAt(output.data, 1, 0, 0)).toEqual([112, 143, 207])

    const white = render({ height: 1, rgb: solidRgb(1, 1, [255, 255, 255]), width: 1 })
    expect(pixelAt(white.data, 1, 0, 0)).toEqual([255, 255, 255])
  })

  it('uses two-color midpoint bands for Custom and exposes hidden grayscale mode', () => {
    const rgb = solidRgb(1, 1, [64, 64, 64])
    const custom = render({
      height: 1,
      rgb,
      settings: {
        background: [0, 0, 0],
        colorMode: 'custom',
        lineColor: [200, 100, 0],
      },
      width: 1,
    })
    const grayscale = render({
      height: 1,
      rgb,
      settings: { colorMode: 'grayscale' },
      width: 1,
    })

    expect(pixelAt(custom.data, 1, 0, 0)).toEqual([62, 31, 0])
    expect(pixelAt(grayscale.data, 1, 0, 0)).toEqual([80, 80, 80])
  })

  it('uses hidden Line Color in Original boundaries and hidden Background in Lines Only', () => {
    const rgb = rowRgb([[0, 0, 0], [255, 255, 255]])
    const redBoundary = render({
      height: 1,
      rgb,
      settings: { colorMode: 'original', lineColor: [255, 0, 0] },
      width: 2,
    })
    const blueBoundary = render({
      height: 1,
      rgb,
      settings: { colorMode: 'original', lineColor: [0, 0, 255] },
      width: 2,
    })
    expect(redBoundary.data).not.toEqual(blueBoundary.data)

    const lines = render({
      height: 1,
      rgb: solidRgb(1, 1, [64, 64, 64]),
      settings: {
        background: [11, 22, 33],
        colorMode: 'original',
        fillMode: 'lines',
      },
      width: 1,
    })
    expect(pixelAt(lines.data, 1, 0, 0)).toEqual([11, 22, 33])

    const filled = render({ height: 1, rgb: solidRgb(1, 1, [64, 64, 64]), width: 1 }).data
    const otherHiddenBackground = render({
      height: 1,
      rgb: solidRgb(1, 1, [64, 64, 64]),
      settings: { background: [99, 88, 77] },
      width: 1,
    }).data
    expect(otherHiddenBackground).toEqual(filled)
  })

  it('makes every functional Contour setting observable in its active context', () => {
    const source = gradientRgb(32, 24)
    const base = render({ height: 24, rgb: source, width: 32 }).data
    const variants: ReadonlyArray<Partial<ContourSettings>> = [
      { fillMode: 'lines' },
      { levels: 3 },
      { lineThickness: 3 },
      { invert: true },
      { brightness: 35 },
      { contrast: 65 },
      { colorMode: 'custom' },
      { lineColor: [255, 40, 80] },
    ]

    for (const settings of variants) {
      expect(
        render({ height: 24, rgb: source, settings, width: 32 }).data,
        JSON.stringify(settings),
      ).not.toEqual(base)
    }

    const lines = render({
      height: 24,
      rgb: source,
      settings: { fillMode: 'lines' },
      width: 32,
    }).data
    const linesWithBackground = render({
      height: 24,
      rgb: source,
      settings: { background: [12, 34, 56], fillMode: 'lines' },
      width: 32,
    }).data
    expect(linesWithBackground).not.toEqual(lines)
  })
})

function render(options: {
  height?: number
  rgb?: Uint8Array | Uint8ClampedArray
  settings?: Partial<ContourSettings>
  width?: number
} = {}) {
  const height = options.height ?? 16
  const width = options.width ?? 24
  return renderContourReference({
    height,
    rgb: options.rgb ?? gradientRgb(width, height),
    settings: { ...DEFAULT_CONTOUR_SETTINGS, ...options.settings },
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

function pixelAt(data: Uint8ClampedArray, width: number, x: number, y: number) {
  const offset = (y * width + x) * 3
  return [data[offset], data[offset + 1], data[offset + 2]]
}
