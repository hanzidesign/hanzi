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
      background: [1, 1, 1],
      cellSize: 30,
      cellShadow: [43 / 255, 45 / 255, 66 / 255],
      cellMidtone: [109 / 255, 89 / 255, 122 / 255],
      cellHighlight: [233 / 255, 196 / 255, 106 / 255],
      contrast: 0,
      edgeColor: [16 / 255, 16 / 255, 16 / 255],
      edgeWidth: 0.3,
      fillCanvas: false,
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

  it('takes exactly 25 nominal-square samples for Cell Average', () => {
    const input = makeInput()
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
    const average = sum.map((channel) => channel / 25)
    const sourceLuminance = average[0] * 0.299 + average[1] * 0.587 + average[2] * 0.114
    const maskSample = sampleVoronoiSourceLinear(
      input.rgb,
      input.width,
      input.height,
      trace.uv[0],
      trace.uv[1],
    )
    const maskLuminance = maskSample[0] * 0.299 + maskSample[1] * 0.587 + maskSample[2] * 0.114
    const expectedTone = smoothstep(0.15, 0.9, sourceLuminance)
    expect(trace.averageSampleCount).toBe(25)
    expect(trace.cellTone).toBeCloseTo(expectedTone, 14)
    expect(trace.modelMask).toBeCloseTo(smoothstep(0.01, 0.12, maskLuminance), 14)
  })

  it('composes the freely selected Edge Color before B/C and renders RGB output', () => {
    const baseInput = makeInput({
      rgb: solidRgb(18, 14, [255, 255, 255]),
      settings: { edgeColor: [0.2, 0.4, 0.6] },
    })
    const trace = traceVoronoiAt(baseInput, 7, 5)
    expect(trace.edgeColor).toBe(baseInput.settings.edgeColor)
    expect(trace.edgeDistance).toBeCloseTo(trace.secondDistance - trace.closestDistance, 14)
    expect(trace.interiorMask).toBeCloseTo(
      smoothstep(0, baseInput.settings.edgeWidth * 0.3, trace.edgeDistance),
      14,
    )

    const collapsedInput = {
      ...baseInput,
      settings: { ...baseInput.settings, brightness: 100, contrast: -100 },
    }
    expect(traceVoronoiAt(collapsedInput, 7, 5).output).toEqual([0.5, 0.5, 0.5])
    const output = renderVoronoiReference(collapsedInput)
    expect(output).toMatchObject({ channels: 3, height: baseInput.height, width: baseInput.width })
    expect(new Set(output.data)).toEqual(new Set([128]))
  })

  it('makes Shadow, Midtone, and Highlight independently visible', () => {
    const input = makeInput()
    const base = renderVoronoiReference(input).data
    for (const settings of [
      { cellShadow: [1, 0, 0] as const },
      { cellMidtone: [0, 1, 0] as const },
      { cellHighlight: [0, 0, 1] as const },
    ]) {
      expect(renderVoronoiReference({
        ...input,
        settings: { ...input.settings, ...settings },
      }).data, Object.keys(settings)[0]).not.toEqual(base)
    }
    expect(Array.from({ length: input.width * input.height }, (_, index) => (
      traceVoronoiAt(input, index % input.width, Math.floor(index / input.width)).cellTone
    )).some((tone) => tone > 0.5)).toBe(true)
  })

  it('keeps model-exterior Background pure unless Fill Canvas is enabled', () => {
    const rgb = solidRgb(18, 14, [0, 0, 0])
    const settings = {
      background: [0.2, 0.3, 0.4] as const,
      brightness: 100,
      contrast: 100,
    }
    const backgroundOnly = renderVoronoiReference(makeInput({ rgb, settings })).data
    const expectedBackground = Array.from(backgroundOnly.slice(0, 3))
    expect(expectedBackground).toEqual([51, 76, 102])
    for (let offset = 0; offset < backgroundOnly.length; offset += 3) {
      expect(Array.from(backgroundOnly.slice(offset, offset + 3))).toEqual(expectedBackground)
    }

    const filled = renderVoronoiReference(makeInput({
      rgb,
      settings: { ...settings, fillCanvas: true },
    })).data
    expect(filled).not.toEqual(backgroundOnly)
  })

  it('uses the current model pixel as the mask even when its Voronoi cell averages model tone', () => {
    const width = 18
    const height = 14
    const rgb = solidRgb(width, height, [255, 255, 255])
    rgb.set([0, 0, 0], 0)
    const background = [0.2, 0.3, 0.4] as const
    const trace = traceVoronoiAt(makeInput({ width, height, rgb, settings: { background } }), 0, 0)

    expect(trace.cellTone).toBeGreaterThan(0)
    expect(trace.modelMask).toBe(0)
    expect(trace.output).toEqual(background)
  })

  it('does not invent a corrected Edge Width zero meaning away from the degenerate boundary', () => {
    const trace = traceVoronoiAt(makeInput({ settings: { edgeWidth: 0 } }), 7, 5)
    expect(trace.edgeDistance).toBeGreaterThan(0)
    expect(trace.interiorMask).toBe(1)
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
    expect(() => render({ settings: { randomize: 0.03 } })).toThrow('increments of 0.05')
    expect(() => render({ settings: { brightness: 0.5 } })).toThrow('integer')
    expect(() => render({ settings: { contrast: 101 } })).toThrow('between -100 and 100')
    expect(() => render({ settings: { fillCanvas: 1 as unknown as boolean } })).toThrow('boolean')
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
