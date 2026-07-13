import { describe, expect, it } from 'vitest'

import {
  DEFAULT_VORONOI_SETTINGS,
  findVoronoiCell,
  renderVoronoiReference,
  sampleVoronoiSourceLinear,
  traceVoronoiAt,
  voronoiHash2,
} from './voronoi-core'

describe('Voronoi CPU reference', () => {
  it('keeps the exact production defaults', () => {
    expect(DEFAULT_VORONOI_SETTINGS).toEqual({
      brightness: 0,
      cellSize: 30,
      colorMode: 0,
      contrast: 0,
      edgeColor: 0,
      edgeWidth: 0.3,
      randomize: 0.8,
    })
  })

  it('uses the correlated production hash and exact 3x3 nearest/second-nearest search', () => {
    expect(voronoiHash2([0, 0])).toEqual([
      expect.closeTo(-0.18153581156664744, 14),
      expect.closeTo(-0.05407869952411559, 14),
    ])
    expect(voronoiHash2([1, 2])).toEqual([
      expect.closeTo(-0.3647773921348896, 14),
      expect.closeTo(0.0455983676531968, 14),
    ])

    const result = findVoronoiCell([1.25, 2.75], 0.8)
    expect(result.closestCell).toEqual([1, 2])
    expect(result.closestDistance).toBeCloseTo(0.2540620576820582, 14)
    expect(result.secondDistance).toBeCloseTo(0.6236595323850647, 14)
  })

  it('uses the nominal lattice center for Center Sample and exact second-minus-first edge mask', () => {
    const input = makeInput({ settings: { colorMode: 1 } })
    const trace = traceVoronoiAt(input, 7, 5)
    const centerUv = [
      (trace.closestCell[0] + 0.5) * input.settings.cellSize / input.width,
      (trace.closestCell[1] + 0.5) * input.settings.cellSize / input.height,
    ] as const
    const expectedColor = sampleVoronoiSourceLinear(
      input.rgb,
      input.width,
      input.height,
      centerUv[0],
      centerUv[1],
    )
    const edgeDistance = trace.secondDistance - trace.closestDistance
    const expectedMask = smoothstep(0, input.settings.edgeWidth * 0.3, edgeDistance)

    expect(trace.centerUv).toEqual([clamp01(centerUv[0]), clamp01(centerUv[1])])
    expect(trace.cellColor).toEqual(expectedColor)
    expect(trace.edgeDistance).toBeCloseTo(edgeDistance, 14)
    expect(trace.interiorMask).toBeCloseTo(expectedMask, 14)
  })

  it('takes exactly 25 nominal-square samples for Cell Average', () => {
    const input = makeInput({ settings: { colorMode: 0 } })
    const trace = traceVoronoiAt(input, 7, 5)
    const sum = [0, 0, 0]
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        const sample = sampleVoronoiSourceLinear(
          input.rgb,
          input.width,
          input.height,
          (trace.closestCell[0] + 0.5 + dx * 0.2) * input.settings.cellSize / input.width,
          (trace.closestCell[1] + 0.5 + dy * 0.2) * input.settings.cellSize / input.height,
        )
        sum.forEach((_, channel) => { sum[channel] += sample[channel] })
      }
    }
    expect(trace.averageSampleCount).toBe(25)
    expect(trace.cellColor).toEqual(sum.map((channel) => channel / 25))
  })

  it('caps Gradient current-color contribution at one half', () => {
    const input = makeInput({ settings: { colorMode: 2 } })
    const trace = traceVoronoiAt(input, 7, 5)
    const center = sampleVoronoiSourceLinear(input.rgb, input.width, input.height, trace.centerUv[0], trace.centerUv[1])
    const current = sampleVoronoiSourceLinear(input.rgb, input.width, input.height, trace.uv[0], trace.uv[1])
    const amount = smoothstep(0, 0.7, trace.closestDistance) * 0.5
    expect(amount).toBeLessThanOrEqual(0.5)
    expect(trace.cellColor).toEqual(center.map((channel, index) => (
      channel + (current[index] - channel) * amount
    )))
  })

  it('composes Black, White, or Darkened edges before B/C and renders RGB output', () => {
    const baseInput = makeInput({ settings: { colorMode: 1 } })
    const black = traceVoronoiAt(baseInput, 7, 5)
    const white = traceVoronoiAt({
      ...baseInput,
      settings: { ...baseInput.settings, edgeColor: 1 },
    }, 7, 5)
    const darkened = traceVoronoiAt({
      ...baseInput,
      settings: { ...baseInput.settings, edgeColor: 2 },
    }, 7, 5)
    expect(black.edgeColor).toEqual([0, 0, 0])
    expect(white.edgeColor).toEqual([1, 1, 1])
    expect(darkened.edgeColor).toEqual(darkened.cellColor.map((channel) => channel * 0.3))

    const collapsedInput = {
      ...baseInput,
      settings: { ...baseInput.settings, brightness: 100, contrast: -100 },
    }
    expect(traceVoronoiAt(collapsedInput, 7, 5).output).toEqual([0.5, 0.5, 0.5])
    const output = renderVoronoiReference(collapsedInput)
    expect(output).toMatchObject({ channels: 3, height: baseInput.height, width: baseInput.width })
    expect(new Set(output.data)).toEqual(new Set([128]))
  })

  it('does not invent a corrected Edge Width zero meaning away from the degenerate boundary', () => {
    const trace = traceVoronoiAt(makeInput({ settings: { edgeWidth: 0 } }), 7, 5)
    expect(trace.edgeDistance).toBeGreaterThan(0)
    expect(trace.interiorMask).toBe(1)
  })

  it('keeps all Color Modes equivalent on a constant source', () => {
    const rgb = solidRgb(18, 14, [80, 120, 160])
    const colors = ([0, 1, 2] as const).map((colorMode) => (
      traceVoronoiAt(makeInput({ rgb, settings: { colorMode } }), 7, 5).cellColor
    ))
    for (const color of colors.slice(1)) {
      color.forEach((channel, index) => expect(channel).toBeCloseTo(colors[0][index], 14))
    }
  })

  it('rejects malformed input and every out-of-contract setting', () => {
    expect(() => renderVoronoiReference({
      height: 1,
      rgb: new Uint8Array(2),
      settings: DEFAULT_VORONOI_SETTINGS,
      width: 1,
    })).toThrow('width * height * 3')
    expect(() => render({ width: 0 })).toThrow('positive integers')
    expect(() => render({ settings: { cellSize: 11 } })).toThrow('increments of 5')
    expect(() => render({ settings: { edgeWidth: 1.1 } })).toThrow('between 0 and 1')
    expect(() => render({ settings: { edgeWidth: 0.03 } })).toThrow('increments of 0.05')
    expect(() => render({ settings: { edgeColor: 3 as 0 } })).toThrow('edgeColor')
    expect(() => render({ settings: { colorMode: -1 as 0 } })).toThrow('colorMode')
    expect(() => render({ settings: { randomize: 0.03 } })).toThrow('increments of 0.05')
    expect(() => render({ settings: { brightness: 0.5 } })).toThrow('integer')
    expect(() => render({ settings: { contrast: 101 } })).toThrow('between -100 and 100')
    expect(() => traceVoronoiAt(makeInput(), -1, 0)).toThrow('in-bounds')
  })
})

function render(options: Parameters<typeof makeInput>[0] = {}) {
  return renderVoronoiReference(makeInput(options))
}

function makeInput(options: {
  height?: number
  rgb?: Uint8Array | Uint8ClampedArray
  settings?: Partial<import('./voronoi-core').VoronoiSettings>
  width?: number
} = {}) {
  const width = options.width ?? 18
  const height = options.height ?? 14
  return {
    height,
    rgb: options.rgb ?? gradientRgb(width, height),
    settings: { ...DEFAULT_VORONOI_SETTINGS, cellSize: 10, ...options.settings },
    width,
  }
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

function solidRgb(
  width: number,
  height: number,
  color: readonly [number, number, number],
) {
  const data = new Uint8ClampedArray(width * height * 3)
  for (let index = 0; index < width * height; index += 1) data.set(color, index * 3)
  return data
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp01((value - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}
