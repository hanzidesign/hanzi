import { describe, expect, it } from 'vitest'

import {
  DEFAULT_BLOCKIFY_SETTINGS,
  isBlockifyOutlinePixel,
  renderBlockifyReference,
  sampleBlockifySourceLinear,
  type BlockifySettings,
} from './blockify-core'

describe('Blockify CPU reference', () => {
  it('returns RGB output and rejects malformed input or settings', () => {
    const output = render()
    expect(output).toMatchObject({ channels: 3, height: 16, width: 24 })
    expect(output.data).toHaveLength(24 * 16 * 3)

    expect(() => renderBlockifyReference({
      height: 1,
      rgb: new Uint8Array(2),
      settings: DEFAULT_BLOCKIFY_SETTINGS,
      width: 1,
    })).toThrow('width * height * 3')
    expect(() => render({ settings: { blockSize: Number.NaN } })).toThrow('finite')
    expect(() => render({ settings: { blockSize: 3 } })).toThrow('between 4 and 20')
    expect(() => render({ settings: { blockSize: 4.5 } })).toThrow('integer')
    expect(() => render({ settings: { borderWidth: 0.25 } })).toThrow('increments of 0.5')
    expect(() => render({ settings: { style: 'tiles' as BlockifySettings['style'] } })).toThrow(
      'style',
    )
    expect(() => render({ settings: { colorMode: 'grayscale' as BlockifySettings['colorMode'] } })).toThrow(
      'color mode',
    )
    expect(() => render({ settings: { foreground: [0, 0, 256] } })).toThrow('color channel')
    expect(() => render({ settings: { background: [0, -1, 0] } })).toThrow('color channel')
  })

  it('samples exactly one block center with a linear clamp sampler', () => {
    const rgb = rowRgb([[0, 0, 0], [64, 0, 0], [128, 0, 0], [255, 0, 0]])

    expect(sampleBlockifySourceLinear(rgb, 4, 1, 0.5, 0.5)).toEqual([96 / 255, 0, 0])
    const output = render({
      height: 1,
      rgb,
      settings: { blockSize: 4, colorMode: 'color' },
      width: 4,
    })
    expect(Array.from(output.data)).toEqual([
      96, 0, 0,
      96, 0, 0,
      96, 0, 0,
      96, 0, 0,
    ])
  })

  it('clamps a last partial block center beyond the source edge', () => {
    const rgb = rowRgb([
      [0, 0, 0], [64, 0, 0], [128, 0, 0], [160, 0, 0], [200, 0, 0], [250, 0, 0],
    ])
    const output = render({
      height: 1,
      rgb,
      settings: { blockSize: 4, colorMode: 'color' },
      width: 6,
    })

    expect(pixelAt(output.data, 6, 3, 0)).toEqual([96, 0, 0])
    expect(pixelAt(output.data, 6, 4, 0)).toEqual([250, 0, 0])
    expect(pixelAt(output.data, 6, 5, 0)).toEqual([250, 0, 0])
  })

  it('adds brightness before applying production contrast and clamps channels', () => {
    const output = render({
      height: 1,
      rgb: solidRgb(1, 1, [64, 128, 192]),
      settings: { brightness: 25, colorMode: 'color', contrast: 50 },
      width: 1,
    })

    expect(pixelAt(output.data, 1, 0, 0)).toEqual([128, 255, 255])
  })

  it('maps source luminance between the Background and Foreground colors in Mono', () => {
    const foreground = render({
      height: 1,
      rgb: solidRgb(1, 1, [255, 255, 255]),
      settings: { background: [0, 0, 255], foreground: [255, 0, 0] },
      width: 1,
    })
    const background = render({
      height: 1,
      rgb: solidRgb(1, 1, [0, 0, 0]),
      settings: { background: [0, 0, 255], foreground: [255, 0, 0] },
      width: 1,
    })

    expect(pixelAt(foreground.data, 1, 0, 0)).toEqual([255, 0, 0])
    expect(pixelAt(background.data, 1, 0, 0)).toEqual([0, 0, 255])
  })

  it('uses the fixed within-block radial multiplier for Shaded', () => {
    const output = render({
      height: 4,
      rgb: solidRgb(4, 4, [200, 200, 200]),
      settings: { blockSize: 4, colorMode: 'color', style: 'shaded' },
      width: 4,
    })

    expect(pixelAt(output.data, 4, 0, 0)).toEqual([185, 185, 185])
    expect(pixelAt(output.data, 4, 1, 1)).toEqual([195, 195, 195])
    expect(pixelAt(output.data, 4, 3, 3)).toEqual([185, 185, 185])
  })

  it('uses strict Outline comparisons and draws Foreground over Background', () => {
    expect(isBlockifyOutlinePixel(0.5, 0.5, 4, 0.5)).toBe(false)
    expect(isBlockifyOutlinePixel(3.5, 3.5, 4, 0.5)).toBe(false)
    expect(isBlockifyOutlinePixel(0.5, 1.5, 4, 1)).toBe(true)
    expect(isBlockifyOutlinePixel(1.5, 1.5, 4, 1)).toBe(false)

    const output = render({
      height: 4,
      rgb: solidRgb(4, 4, [255, 255, 255]),
      settings: {
        blockSize: 4,
        background: [1, 2, 3],
        borderWidth: 1,
        foreground: [9, 19, 29],
        style: 'outline',
      },
      width: 4,
    })

    expect(pixelAt(output.data, 4, 0, 1)).toEqual([9, 19, 29])
    expect(pixelAt(output.data, 4, 1, 1)).toEqual([1, 2, 3])
  })

  it('keeps the Foreground and Background palette inactive in Color mode', () => {
    const source = gradientRgb(24, 16)
    const full = render({
      height: 16,
      rgb: source,
      settings: { colorMode: 'color', style: 'full' },
      width: 24,
    }).data
    const recoloredPalette = render({
      height: 16,
      rgb: source,
      settings: {
        background: [255, 0, 200],
        colorMode: 'color',
        foreground: [0, 255, 100],
        style: 'full',
      },
      width: 24,
    }).data
    expect(recoloredPalette).toEqual(full)
  })

  it('makes every functional Blockify setting observable in its active context', () => {
    const source = gradientRgb(32, 24)
    const base = render({ height: 24, rgb: source, width: 32 }).data
    const variants: ReadonlyArray<Partial<BlockifySettings>> = [
      { blockSize: 4 },
      { style: 'shaded' },
      { brightness: 35 },
      { contrast: 65 },
      { colorMode: 'color' },
    ]

    for (const settings of variants) {
      expect(
        render({ height: 24, rgb: source, settings, width: 32 }).data,
        JSON.stringify(settings),
      ).not.toEqual(base)
    }

    const outline = render({
      height: 24,
      rgb: source,
      settings: { blockSize: 8, borderWidth: 1, style: 'outline' },
      width: 32,
    }).data
    const wideOutline = render({
      height: 24,
      rgb: source,
      settings: { blockSize: 8, borderWidth: 3, style: 'outline' },
      width: 32,
    }).data
    const coloredOutline = render({
      height: 24,
      rgb: source,
      settings: { blockSize: 8, borderWidth: 1, foreground: [255, 20, 100], style: 'outline' },
      width: 32,
    }).data
    expect(wideOutline).not.toEqual(outline)
    expect(coloredOutline).not.toEqual(outline)
  })
})

function render(options: {
  height?: number
  rgb?: Uint8Array | Uint8ClampedArray
  settings?: Partial<BlockifySettings>
  width?: number
} = {}) {
  const height = options.height ?? 16
  const width = options.width ?? 24
  return renderBlockifyReference({
    height,
    rgb: options.rgb ?? gradientRgb(width, height),
    settings: { ...DEFAULT_BLOCKIFY_SETTINGS, ...options.settings },
    width,
  })
}

function solidRgb(width: number, height: number, color: readonly [number, number, number]) {
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
