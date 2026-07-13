import { describe, expect, it } from 'vitest'

import {
  DEFAULT_THRESHOLD_SETTINGS,
  getThresholdBayer4Value,
  renderThresholdReference,
  sampleThresholdSourceLinear,
} from './threshold-core'

describe('Threshold CPU reference', () => {
  it('returns an interleaved RGB output for the default settings', () => {
    const output = renderThresholdReference({
      height: 1,
      rgb: new Uint8ClampedArray([255, 255, 255]),
      settings: DEFAULT_THRESHOLD_SETTINGS,
      width: 1,
    })

    expect(output).toEqual({
      channels: 3,
      data: new Uint8ClampedArray([255, 255, 255]),
      height: 1,
      width: 1,
    })
  })

  it('samples the source with normalized linear clamp filtering', () => {
    const source = new Uint8ClampedArray([
      0, 10, 20,
      100, 110, 120,
      200, 210, 220,
      240, 250, 255,
    ])

    const center = sampleThresholdSourceLinear(source, 4, 1, 0.5, 0.5)
    expect(center[0]).toBeCloseTo(150 / 255)
    expect(center[1]).toBeCloseTo(160 / 255)
    expect(center[2]).toBeCloseTo(170 / 255)
    expect(sampleThresholdSourceLinear(source, 4, 1, -1, 2)).toEqual([
      0,
      10 / 255,
      20 / 255,
    ])
  })

  it('uses strict two-level thresholding and flips the light boolean for Invert', () => {
    const dark = renderPixel([0, 204, 68], {
      thresholdPoint: 0.5,
    })
    const inverted = renderPixel([0, 204, 68], {
      invert: true,
      thresholdPoint: 0.5,
    })

    expect(dark).toEqual([0, 0, 0])
    expect(inverted).toEqual([255, 255, 255])
  })

  it('applies Brightness before production Contrast and uses adjusted source in Original', () => {
    expect(renderPixel([64, 128, 192], {
      brightness: 25,
      colorMode: 'color',
      contrast: 50,
      thresholdPoint: 0.1,
    })).toEqual([128, 255, 255])
  })

  it('uses the exact Bayer 4x4 values with x/y modulo indexing', () => {
    const values = Array.from({ length: 4 }, (_, y) => (
      Array.from({ length: 4 }, (_, x) => getThresholdBayer4Value(x, y))
    ))

    expect(values).toEqual([
      [0, 8, 2, 10],
      [12, 4, 14, 6],
      [3, 11, 1, 9],
      [15, 7, 13, 5],
    ])
    expect(getThresholdBayer4Value(5, 6)).toBe(11)
  })

  it('uses Dither for the binary decision but returns undithered adjusted Original color', () => {
    const source = new Uint8ClampedArray(4 * 3).fill(128)
    const output = renderThresholdReference({
      height: 1,
      rgb: source,
      settings: {
        ...DEFAULT_THRESHOLD_SETTINGS,
        colorMode: 'color',
        dither: true,
        thresholdPoint: 0.5,
      },
      width: 4,
    })

    expect(pixelAt(output.data, 4, 0, 0)).toEqual([0, 0, 0])
    expect(pixelAt(output.data, 4, 3, 0)).toEqual([128, 128, 128])
  })

  it('uses selected Foreground and Background for two-level Mono output', () => {
    expect(renderPixel([255, 255, 255], {
      background: [7, 17, 27],
      foreground: [207, 117, 67],
    })).toEqual([207, 117, 67])
    expect(renderPixel([0, 0, 0], {
      background: [7, 17, 27],
      foreground: [207, 117, 67],
    })).toEqual([7, 17, 27])
  })

  it('posterizes each adjusted channel independently above two Levels', () => {
    expect(renderPixel([51, 128, 230], {
      colorMode: 'color',
      levels: 3,
    })).toEqual([0, 128, 255])
    expect(renderPixel([51, 128, 230], {
      colorMode: 'color',
      invert: true,
      levels: 3,
    })).toEqual([255, 128, 0])
  })

  it('uses posterized Rec.601 luminance as the Mono tint ramp above two Levels', () => {
    expect(renderPixel([255, 128, 0], {
      background: [10, 20, 30],
      foreground: [210, 120, 70],
      levels: 3,
    })).toEqual([128, 79, 54])
    expect(renderPixel([255, 128, 0], {
      background: [10, 20, 30],
      foreground: [210, 120, 70],
      invert: true,
      levels: 3,
    })).toEqual([91, 61, 46])
  })

  it('applies Bayer Dither before component posterization above two Levels', () => {
    expect(renderPixel([69, 69, 69], {
      colorMode: 'color',
      dither: false,
      levels: 3,
    })).toEqual([128, 128, 128])
    expect(renderPixel([69, 69, 69], {
      colorMode: 'color',
      dither: true,
      levels: 3,
    })).toEqual([0, 0, 0])
  })

  it('keeps Threshold Point as a contextual no-op above two Levels', () => {
    const source: readonly [number, number, number] = [90, 140, 210]
    expect(renderPixel(source, { levels: 5, thresholdPoint: 0.1 })).toEqual(
      renderPixel(source, { levels: 5, thresholdPoint: 0.9 }),
    )
  })

  it('ignores hidden Mono colors in Original mode', () => {
    for (const levels of [2, 5]) {
      expect(renderPixel([180, 80, 220], {
        background: [1, 2, 3],
        colorMode: 'color',
        foreground: [4, 5, 6],
        levels,
      })).toEqual(renderPixel([180, 80, 220], {
        background: [201, 202, 203],
        colorMode: 'color',
        foreground: [204, 205, 206],
        levels,
      }))
    }
  })

  it('rejects malformed input and every out-of-contract setting', () => {
    expect(() => renderThresholdReference({
      height: 1,
      rgb: new Uint8Array(2),
      settings: DEFAULT_THRESHOLD_SETTINGS,
      width: 1,
    })).toThrow('width * height * 3')
    expect(() => render({ width: 0 })).toThrow('positive integers')
    expect(() => render({ settings: { levels: 1 } })).toThrow('between 2 and 8')
    expect(() => render({ settings: { levels: 2.5 } })).toThrow('integer')
    expect(() => render({ settings: { thresholdPoint: 0.11 } })).toThrow('increments of 0.05')
    expect(() => render({ settings: { brightness: 0.5 } })).toThrow('integer')
    expect(() => render({ settings: { contrast: 101 } })).toThrow('between -100 and 100')
    expect(() => render({ settings: { dither: 1 as unknown as boolean } })).toThrow('boolean')
    expect(() => render({ settings: { invert: 0 as unknown as boolean } })).toThrow('boolean')
    expect(() => render({
      settings: { colorMode: 'mono' as import('./threshold-core').ThresholdColorMode },
    })).toThrow('color mode')
    expect(() => render({ settings: { foreground: [0, 0, 256] } })).toThrow('color channel')
    expect(() => render({ settings: { background: [0, 0] as unknown as readonly [number, number, number] } }))
      .toThrow('three color channels')
  })

  it('makes every functional Threshold setting observable in its active context', () => {
    const rgb = gradientRgb(8, 4)
    const base = render({ height: 4, rgb, width: 8 }).data
    const variants: ReadonlyArray<Partial<import('./threshold-core').ThresholdSettings>> = [
      { levels: 4 },
      { thresholdPoint: 0.8 },
      { invert: true },
      { brightness: 30 },
      { contrast: 60 },
      { colorMode: 'color' },
      { foreground: [255, 20, 100] },
      { background: [20, 100, 255] },
    ]

    for (const settings of variants) {
      expect(render({ height: 4, rgb, settings, width: 8 }).data, JSON.stringify(settings))
        .not.toEqual(base)
    }

    const flat = new Uint8ClampedArray(4 * 3).fill(128)
    expect(render({
      height: 1,
      rgb: flat,
      settings: { dither: true, thresholdPoint: 0.5 },
      width: 4,
    }).data).not.toEqual(render({
      height: 1,
      rgb: flat,
      settings: { dither: false, thresholdPoint: 0.5 },
      width: 4,
    }).data)
  })
})

function renderPixel(
  rgb: readonly [number, number, number],
  settings: Partial<import('./threshold-core').ThresholdSettings> = {},
) {
  return Array.from(renderThresholdReference({
    height: 1,
    rgb: new Uint8ClampedArray(rgb),
    settings: { ...DEFAULT_THRESHOLD_SETTINGS, ...settings },
    width: 1,
  }).data)
}

function pixelAt(data: Uint8ClampedArray, width: number, x: number, y: number) {
  const offset = (y * width + x) * 3
  return Array.from(data.slice(offset, offset + 3))
}

function render(options: {
  height?: number
  rgb?: Uint8Array | Uint8ClampedArray
  settings?: Partial<import('./threshold-core').ThresholdSettings>
  width?: number
} = {}) {
  const height = options.height ?? 4
  const width = options.width ?? 8
  return renderThresholdReference({
    height,
    rgb: options.rgb ?? gradientRgb(width, height),
    settings: { ...DEFAULT_THRESHOLD_SETTINGS, ...options.settings },
    width,
  })
}

function gradientRgb(width: number, height: number) {
  const data = new Uint8ClampedArray(width * height * 3)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 3
      data[offset] = x / Math.max(1, width - 1) * 255
      data[offset + 1] = y / Math.max(1, height - 1) * 255
      data[offset + 2] = (x * 37 + y * 61) % 256
    }
  }
  return data
}
