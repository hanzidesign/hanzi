import { describe, expect, it } from 'vitest'

import {
  DEFAULT_MATRIX_RAIN_SETTINGS,
  getMatrixRainIntensity,
  hash11,
  hash21,
  renderMatrixRainReference,
  sampleMatrixGlyphMask,
  selectMatrixGlyphIndex,
  type MatrixGlyphMask,
  type MatrixRainDirection,
  type MatrixRainSettings,
} from './matrix-rain-core'

const SOLID_GLYPH: MatrixGlyphMask = {
  data: new Float32Array(16).fill(1),
  height: 4,
  width: 4,
}

const EMPTY_GLYPH: MatrixGlyphMask = {
  data: new Float32Array(16),
  height: 4,
  width: 4,
}

describe('Matrix Rain deterministic equations', () => {
  it('matches Grainrad hash constants', () => {
    expect(hash11(0)).toBe(0)
    expect(hash11(73.156)).toBeCloseTo(0.047_933_936_557_683_41, 12)
    expect(hash21([1, 2])).toBeCloseTo(0.938_880_302_662_994_4, 12)
  })

  it('uses exactly three seeded drops with Grainrad speed, phase, length, and square falloff', () => {
    expect(getMatrixRainIntensity({
      columnIndex: 1,
      direction: 'down',
      rowPosition: 0.03,
      speed: 1.2,
      time: 0,
      trailLength: 15 / 50,
    })).toEqual({
      intensity: expect.closeTo(0.219_130_866_054_643_7, 12),
      isHead: false,
    })
  })

  it.each([
    ['down', 0.404_769_868_036_380_04],
    ['up', 0.195_923_386_852_061_15],
    ['left', 0.195_923_386_852_061_15],
    ['right', 0.404_769_868_036_380_04],
  ] as const)('wraps %s trail distance in its Grainrad direction', (direction, intensity) => {
    expect(getMatrixRainIntensity({
      columnIndex: 2,
      direction,
      rowPosition: 0.2,
      speed: 1.2,
      time: 4,
      trailLength: 15 / 50,
    }).intensity).toBeCloseTo(intensity, 12)
  })

  it('marks a head only inside the strict 0.02 leading interval', () => {
    const phase = hash11(2 * 73.156 + 17.3)

    expect(getMatrixRainIntensity({
      columnIndex: 2,
      direction: 'down',
      rowPosition: phase - 0.019,
      speed: 0,
      time: 0,
      trailLength: 0.3,
    }).isHead).toBe(true)
    expect(getMatrixRainIntensity({
      columnIndex: 2,
      direction: 'down',
      rowPosition: phase - 0.021,
      speed: 0,
      time: 0,
      trailLength: 0.3,
    }).isHead).toBe(false)
  })

  it('changes glyph selection at floor(hash21(cell) * 50 + time * 2), independent of rain Speed', () => {
    expect(selectMatrixGlyphIndex([0, 0], 0, 7)).toBe(0)
    expect(selectMatrixGlyphIndex([0, 0], 0.49, 7)).toBe(0)
    expect(selectMatrixGlyphIndex([0, 0], 0.5, 7)).toBe(5)
    expect(selectMatrixGlyphIndex([0, 0], 0.5, 7, 0.5)).toBe(5)
    expect(selectMatrixGlyphIndex([0, 0], 0.5, 7, 3)).toBe(5)
  })

  it('applies the exact glyph margin and samples the selected glyph mask', () => {
    const glyph: MatrixGlyphMask = {
      data: new Float32Array([
        0, 1,
        1, 0,
      ]),
      height: 2,
      width: 2,
    }

    expect(sampleMatrixGlyphMask(glyph, [0.04, 0.5], 0)).toBe(0)
    expect(sampleMatrixGlyphMask(glyph, [0.06, 0.06], 0)).toBe(0)
    expect(sampleMatrixGlyphMask(glyph, [0.94, 0.06], 0)).toBe(1)
    expect(sampleMatrixGlyphMask(glyph, [0.1, 0.5], 0.4)).toBe(0)
    expect(sampleMatrixGlyphMask(glyph, [0.5, 0.5], 0.4)).toBe(0)
  })
})

describe('Matrix Rain CPU reference', () => {
  it('returns opaque RGB output and rejects malformed source or glyph data', () => {
    const output = render({ width: 4, height: 4 })
    expect(output).toMatchObject({ channels: 3, width: 4, height: 4 })
    expect(output.data).toHaveLength(48)

    expect(() => renderMatrixRainReference({
      glyphs: [SOLID_GLYPH],
      height: 1,
      rgb: new Uint8Array(2),
      settings: DEFAULT_MATRIX_RAIN_SETTINGS,
      time: 0,
      width: 1,
    })).toThrow('width * height * 3')
    expect(() => render({ glyphs: [{ data: new Float32Array(1), width: 2, height: 2 }] })).toThrow(
      'glyph data length',
    )
  })

  it('uses the raw source for cell activation, threshold, edge strength, and tint', () => {
    const base = render({
      rgb: solidRgb(8, 8, [96, 96, 96]),
      settings: { threshold: 0.3, bgOpacity: 0 },
    }).data
    const adjusted = render({
      rgb: solidRgb(8, 8, [96, 96, 96]),
      settings: { brightness: -100, contrast: 100, threshold: 0.3, bgOpacity: 0 },
    }).data

    expect(adjusted).toEqual(base)
  })

  it('uses adjusted source only for the faint background hint', () => {
    const dark = pixelAt(render({
      glyphs: [EMPTY_GLYPH],
      rgb: solidRgb(8, 8, [128, 64, 32]),
      settings: { bgOpacity: 1 },
    }).data, 8, 4, 4)
    const bright = pixelAt(render({
      glyphs: [EMPTY_GLYPH],
      rgb: solidRgb(8, 8, [128, 64, 32]),
      settings: { bgOpacity: 1, brightness: 25 },
    }).data, 8, 4, 4)
    const contrast = pixelAt(render({
      glyphs: [EMPTY_GLYPH],
      rgb: solidRgb(8, 8, [128, 64, 32]),
      settings: { bgOpacity: 1, contrast: 100 },
    }).data, 8, 4, 4)

    expect(dark).toEqual([13, 6, 3])
    expect(bright).toEqual([19, 13, 10])
    expect(contrast).not.toEqual(dark)
  })

  it('treats threshold as inclusive raw Rec.601 cell-center luminance', () => {
    const redLuminance = 0.299
    const atThreshold = render({
      rgb: solidRgb(8, 8, [255, 0, 0]),
      settings: { threshold: redLuminance, bgOpacity: 0 },
    }).data
    const aboveThreshold = render({
      rgb: solidRgb(8, 8, [255, 0, 0]),
      settings: { threshold: redLuminance + 0.001, bgOpacity: 0 },
    }).data
    const blackAtZero = render({
      rgb: solidRgb(8, 8, [0, 0, 0]),
      settings: { threshold: 0, bgOpacity: 0 },
    }).data

    expect(sum(atThreshold)).toBeGreaterThan(0)
    expect(sum(aboveThreshold)).toBe(0)
    expect(sum(blackAtZero)).toBeGreaterThan(0)
  })

  it('keeps cell period at cellSize * (1 + spacing) and margin at .05 + spacing * .15', () => {
    const cell = render({ settings: { cellSize: 4, spacing: 0 } }).data
    const largerCell = render({ settings: { cellSize: 8, spacing: 0 } }).data
    const spaced = render({ settings: { cellSize: 4, spacing: 1 } }).data

    expect(largerCell).not.toEqual(cell)
    expect(spaced).not.toEqual(cell)
  })

  it.each(['down', 'up', 'left', 'right'] as const)(
    'renders the %s direction using vertical streams or exact horizontal transposition',
    (direction) => {
      const result = render({
        height: 12,
        rgb: gradientRgb(16, 12),
        settings: { direction },
        width: 16,
      }).data

      expect(result).not.toEqual(render({
        height: 12,
        rgb: gradientRgb(16, 12),
        settings: { direction: nextDirection(direction) },
        width: 16,
      }).data)
    },
  )

  it('uses Matrix-local Speed for drop motion but not glyph animation', () => {
    const slow = render({ settings: { speed: 0.5 }, time: 0.75 }).data
    const fast = render({ settings: { speed: 3 }, time: 0.75 }).data
    expect(fast).not.toEqual(slow)

    expect(selectMatrixGlyphIndex([2, 1], 0.75, 11, 0.5)).toBe(
      selectMatrixGlyphIndex([2, 1], 0.75, 11, 3),
    )
  })

  it('normalizes Trail Length by 50 before squared trail falloff', () => {
    const shortTrail = render({ settings: { trailLength: 5 } }).data
    const longTrail = render({ settings: { trailLength: 30 } }).data
    expect(longTrail).not.toEqual(shortTrail)
  })

  it('uses Glow only for leading-head glyph composition', () => {
    const noGlow = render({ settings: { glow: 0 }, time: 0.1 }).data
    const glow = render({ settings: { glow: 2 }, time: 0.1 }).data
    expect(glow).not.toEqual(noGlow)

    const noHead = render({
      settings: { glow: 0, speed: 0 },
      time: 0,
    }).data
    const noHeadGlow = render({
      settings: { glow: 2, speed: 0 },
      time: 0,
    }).data
    expect(noHeadGlow).toEqual(noHead)
  })

  it('uses BG Opacity only as adjusted source * opacity * .1 while keeping RGB output opaque', () => {
    const hidden = render({ glyphs: [EMPTY_GLYPH], settings: { bgOpacity: 0 } }).data
    const visible = render({ glyphs: [EMPTY_GLYPH], settings: { bgOpacity: 1 } }).data
    expect(sum(hidden)).toBe(0)
    expect(sum(visible)).toBeGreaterThan(0)
  })

  it('composes rain, edge/static reveal, head, and background with the configured Rain Color', () => {
    const source = edgeRgb(8, 8)
    const green = render({ rgb: source, settings: { rainColor: [0, 255, 0], bgOpacity: 0 } }).data
    const magenta = render({ rgb: source, settings: { rainColor: [255, 0, 255], bgOpacity: 0 } }).data
    const empty = render({ glyphs: [EMPTY_GLYPH], rgb: source, settings: { bgOpacity: 0 } }).data

    expect(sum(green)).toBeGreaterThan(0)
    expect(magenta).not.toEqual(green)
    expect(sum(empty)).toBe(0)
  })

  it('uses the selected glyph mask and charset length in deterministic selection', () => {
    const firstOnly: MatrixGlyphMask = {
      data: new Float32Array([
        1, 0,
        0, 0,
      ]),
      height: 2,
      width: 2,
    }
    const secondOnly: MatrixGlyphMask = {
      data: new Float32Array([
        0, 0,
        0, 1,
      ]),
      height: 2,
      width: 2,
    }
    const oneGlyph = render({ glyphs: [firstOnly], time: 0.5 }).data
    const twoGlyphs = render({ glyphs: [firstOnly, secondOnly], time: 0.5 }).data

    expect(twoGlyphs).not.toEqual(oneGlyph)
  })

  it('makes every Matrix Settings row observable in deterministic output', () => {
    const source = gradientRgb(16, 12)
    const base = render({ height: 12, rgb: source, width: 16 }).data
    const variants: ReadonlyArray<Partial<MatrixRainSettings>> = [
      { cellSize: 4 },
      { spacing: 0.6 },
      { speed: 2.4 },
      { trailLength: 30 },
      { direction: 'left' },
      { glow: 0 },
      { bgOpacity: 1 },
      { brightness: 35 },
      { contrast: 65 },
      { threshold: 0.5 },
      { rainColor: [255, 45, 120] },
    ]

    for (const settings of variants) {
      expect(
        render({ height: 12, rgb: source, settings, width: 16 }).data,
        JSON.stringify(settings),
      ).not.toEqual(base)
    }
  })
})

function render(options: {
  glyphs?: readonly MatrixGlyphMask[]
  height?: number
  rgb?: Uint8Array | Uint8ClampedArray
  settings?: Partial<MatrixRainSettings>
  time?: number
  width?: number
} = {}) {
  const glyphs = options.glyphs ?? [SOLID_GLYPH]
  const height = options.height ?? 8
  const settings = options.settings ?? {}
  const time = options.time ?? 0.5
  const width = options.width ?? 8
  const rgb = options.rgb ?? solidRgb(width, height, [192, 192, 192])
  return renderMatrixRainReference({
    glyphs,
    height,
    rgb,
    settings: { ...DEFAULT_MATRIX_RAIN_SETTINGS, ...settings },
    time,
    width,
  })
}

function nextDirection(direction: MatrixRainDirection): MatrixRainDirection {
  const directions: Record<MatrixRainDirection, MatrixRainDirection> = {
    down: 'up',
    up: 'left',
    left: 'right',
    right: 'down',
  }
  return directions[direction]
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
      data.set([
        Math.round(255 * x / Math.max(width - 1, 1)),
        Math.round(255 * y / Math.max(height - 1, 1)),
        (x * 37 + y * 19) % 256,
      ], offset)
    }
  }
  return data
}

function edgeRgb(width: number, height: number) {
  const data = new Uint8ClampedArray(width * height * 3)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = x < width / 2 ? 16 : 240
      data.set([value, value, value], (y * width + x) * 3)
    }
  }
  return data
}

function pixelAt(data: Uint8ClampedArray, width: number, x: number, y: number) {
  const offset = (y * width + x) * 3
  return [data[offset], data[offset + 1], data[offset + 2]]
}

function sum(data: Uint8ClampedArray) {
  return data.reduce((total, value) => total + value, 0)
}
