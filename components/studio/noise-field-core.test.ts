import { describe, expect, it } from 'vitest'

import {
  DEFAULT_NOISE_FIELD_SETTINGS,
  fbmNoise,
  getNoise,
  noiseFieldHash,
  noiseFieldHash2,
  renderNoiseFieldReference,
  sampleNoiseFieldSourceLinear,
  simplexNoise,
  traceNoiseFieldAt,
  valueNoise,
  worleyNoise,
} from './noise-field-core'

describe('Noise Field CPU reference', () => {
  it('keeps the exact production defaults', () => {
    expect(DEFAULT_NOISE_FIELD_SETTINGS).toEqual({
      animate: true,
      brightness: 0,
      contrast: 0,
      distortOnly: false,
      intensity: 1,
      noiseType: 'perlin',
      octaves: 4,
      scale: 50,
      speed: 1,
    })
  })

  it('ports the scalar/vector hashes and smooth value-noise branch exactly', () => {
    expect(noiseFieldHash([0, 0])).toBe(0)
    expect(noiseFieldHash([1, 2])).toBeCloseTo(0.48287847430947295, 14)
    expect(noiseFieldHash2([-2.25, 4.5])).toEqual([
      expect.closeTo(0.685329214502417, 14),
      expect.closeTo(0.5491665651279618, 14),
    ])
    expect(valueNoise([1.25, 2.75])).toBeCloseTo(0.4123566262948959, 14)
    expect(valueNoise([-0.5, 0.125])).toBeCloseTo(0.3464422689520532, 14)
  })

  it('ports the exact three-corner Simplex approximation and 3x3 Worley search', () => {
    expect(simplexNoise([0.2, 0.7])).toBeCloseTo(0.30847423031321747, 14)
    expect(simplexNoise([1.25, 2.75])).toBeCloseTo(-0.06509679683322227, 14)
    expect(worleyNoise([0.2, 0.7])).toBeCloseTo(0.5322281116633178, 14)
    expect(worleyNoise([-0.5, 0.125])).toBeCloseTo(0.5153882032022076, 14)
  })

  it('maps all three branches and accumulates unnormalized half-amplitude FBM', () => {
    const point = [0.2, 0.7] as const
    expect(getNoise(point, 'perlin')).toBe(valueNoise(point))
    expect(getNoise(point, 'simplex')).toBeCloseTo(simplexNoise(point) * 0.5 + 0.5, 14)
    expect(getNoise(point, 'worley')).toBe(worleyNoise(point))

    const expected = getNoise(point, 'perlin') * 0.5
      + getNoise([point[0] * 2, point[1] * 2], 'perlin') * 0.25
      + getNoise([point[0] * 4, point[1] * 4], 'perlin') * 0.125
    expect(fbmNoise(point, 3, 'perlin')).toBeCloseTo(expected, 14)
    expect(fbmNoise(point, 1, 'perlin')).not.toBeCloseTo(fbmNoise(point, 8, 'perlin'), 12)
  })

  it('samples the displaced source with normalized linear clamp filtering', () => {
    const source = new Uint8ClampedArray([
      0, 10, 20,
      100, 110, 120,
      200, 210, 220,
      240, 250, 255,
    ])
    const center = sampleNoiseFieldSourceLinear(source, 4, 1, 0.5, 0.5)
    expect(center[0]).toBeCloseTo(150 / 255, 14)
    expect(center[1]).toBeCloseTo(160 / 255, 14)
    expect(center[2]).toBeCloseTo(170 / 255, 14)
    expect(sampleNoiseFieldSourceLinear(source, 4, 1, -1, 2)).toEqual([0, 10 / 255, 20 / 255])
  })

  it('wires time, FBM displacement, displaced sampling, B/C, and overlay in production order', () => {
    const input = makeInput({
      height: 6,
      rgb: gradientRgb(8, 6),
      settings: {
        brightness: 25,
        contrast: 50,
        intensity: 1.4,
        noiseType: 'perlin',
        octaves: 3,
        scale: 10,
        speed: 1.5,
      },
      time: 2,
      width: 8,
    })
    const trace = traceNoiseFieldAt(input, 2, 4)
    const uv = [2.5 / 8, 4.5 / 6] as const
    const animatedTime = 3
    const position = [uv[0] * 10 + 0.3, uv[1] * 10 + 0.3] as const
    const first = fbmNoise(position, 3, 'perlin')
    const second = fbmNoise([position[0] + 100, position[1] + 100], 3, 'perlin')
    const displacement = [
      (first - 0.5) * 2 * 1.4 * 0.02,
      (second - 0.5) * 2 * 1.4 * 0.02,
    ] as const
    const sampled = sampleNoiseFieldSourceLinear(
      input.rgb,
      input.width,
      input.height,
      uv[0] + displacement[0],
      uv[1] + displacement[1],
    )
    const factor = 1.5 / 0.505
    const adjusted = sampled.map((channel) => clamp01((channel + 0.25 - 0.5) * factor + 0.5))
    const overlay = fbmNoise([
      uv[0] * 20 + animatedTime,
      uv[1] * 20 + animatedTime,
    ], 3, 'perlin') * 0.1

    expect(trace.animatedTime).toBe(3)
    expect(trace.noisePosition).toEqual(position)
    expect(trace.noiseValues[0]).toBeCloseTo(first, 14)
    expect(trace.noiseValues[1]).toBeCloseTo(second, 14)
    expect(trace.displacement[0]).toBeCloseTo(displacement[0], 14)
    expect(trace.displacement[1]).toBeCloseTo(displacement[1], 14)
    expect(trace.sampledSource).toEqual(sampled)
    expect(trace.adjustedSource).toEqual(adjusted)
    expect(trace.overlay).toBeCloseTo(overlay, 14)
    expect(trace.output).toEqual(adjusted.map((channel) => clamp01(channel + overlay * 1.4 * 0.3)))
  })

  it('renders an interleaved opaque RGB reference from the per-pixel equations', () => {
    const input = makeInput({ height: 3, width: 4 })
    const output = renderNoiseFieldReference(input)
    const trace = traceNoiseFieldAt(input, 2, 1)

    expect(output).toMatchObject({ channels: 3, height: 3, width: 4 })
    expect(output.data).toHaveLength(36)
    expect(pixelAt(output.data, 4, 2, 1)).toEqual(
      trace.output.map((channel) => Math.round(channel * 255)),
    )
  })

  it('freezes effect time at zero and makes Speed a no-op when Animate is off', () => {
    const frozenSlow = traceNoiseFieldAt(makeInput({
      settings: { animate: false, speed: 0.1 },
      time: 1,
    }), 3, 2)
    const frozenFast = traceNoiseFieldAt(makeInput({
      settings: { animate: false, speed: 3 },
      time: 999,
    }), 3, 2)
    const animated = traceNoiseFieldAt(makeInput({
      settings: { animate: true, speed: 3 },
      time: 1,
    }), 3, 2)

    expect(frozenSlow).toEqual(frozenFast)
    expect(frozenSlow.animatedTime).toBe(0)
    expect(animated.noisePosition).not.toEqual(frozenSlow.noisePosition)
  })

  it('makes Distort Only suppress only the positive overlay while preserving displacement', () => {
    const withOverlay = traceNoiseFieldAt(makeInput({ settings: { distortOnly: false } }), 3, 2)
    const distortionOnly = traceNoiseFieldAt(makeInput({ settings: { distortOnly: true } }), 3, 2)

    expect(withOverlay.overlay).toBeGreaterThan(0)
    expect(distortionOnly.overlay).toBe(0)
    expect(distortionOnly.displacement).toEqual(withOverlay.displacement)
    expect(distortionOnly.sampledSource).toEqual(withOverlay.sampledSource)
    expect(distortionOnly.output).not.toEqual(withOverlay.output)
  })

  it('keeps all noise controls contextual no-ops on a constant source in Distort Only', () => {
    const rgb = solidRgb(8, 6, [80, 120, 160])
    const base = renderNoiseFieldReference(makeInput({
      rgb,
      settings: { distortOnly: true },
    })).data
    const changed = renderNoiseFieldReference(makeInput({
      rgb,
      settings: {
        animate: false,
        distortOnly: true,
        intensity: 3,
        noiseType: 'worley',
        octaves: 8,
        scale: 100,
        speed: 3,
      },
      time: 12,
    })).data

    expect(changed).toEqual(base)
  })

  it('rejects malformed input and every out-of-contract setting', () => {
    expect(() => renderNoiseFieldReference({
      height: 1,
      rgb: new Uint8Array(2),
      settings: DEFAULT_NOISE_FIELD_SETTINGS,
      time: 0,
      width: 1,
    })).toThrow('width * height * 3')
    expect(() => render({ width: 0 })).toThrow('positive integers')
    expect(() => render({ time: Number.NaN })).toThrow('time must be finite')
    expect(() => render({ settings: { noiseType: 'bad' as 'perlin' } })).toThrow('noiseType')
    expect(() => render({ settings: { scale: 11 } })).toThrow('increments of 5')
    expect(() => render({ settings: { intensity: 0.4 } })).toThrow('between 0.5 and 3')
    expect(() => render({ settings: { intensity: 0.55 } })).toThrow('increments of 0.1')
    expect(() => render({ settings: { octaves: 4.5 } })).toThrow('integer')
    expect(() => render({ settings: { speed: 0 } })).toThrow('between 0.1 and 3')
    expect(() => render({ settings: { speed: 0.15 } })).toThrow('increments of 0.1')
    expect(() => render({ settings: { animate: 1 as unknown as boolean } })).toThrow('boolean')
    expect(() => render({ settings: { distortOnly: 0 as unknown as boolean } })).toThrow('boolean')
    expect(() => render({ settings: { brightness: 0.5 } })).toThrow('integer')
    expect(() => render({ settings: { contrast: 101 } })).toThrow('between -100 and 100')
    expect(() => traceNoiseFieldAt(makeInput(), -1, 0)).toThrow('in-bounds')
  })

  it('clamps displaced UVs at source edges instead of wrapping', () => {
    const trace = traceNoiseFieldAt(makeInput({
      height: 100,
      settings: { animate: false, intensity: 3, scale: 10 },
      width: 100,
    }), 0, 0)

    expect(trace.uv).toEqual([0.005, 0.005])
    expect(trace.uv[0] + trace.displacement[0]).toBeLessThan(0)
    expect(trace.uv[1] + trace.displacement[1]).toBeLessThan(0)
    expect(trace.sampleUv).toEqual([0, 0])
  })

  it('makes every functional setting observable in an active context', () => {
    const input = makeInput({ height: 8, rgb: gradientRgb(12, 8), time: 1.25, width: 12 })
    const base = renderNoiseFieldReference(input).data
    const variants: ReadonlyArray<Partial<import('./noise-field-core').NoiseFieldSettings>> = [
      { noiseType: 'simplex' },
      { noiseType: 'worley' },
      { scale: 10 },
      { intensity: 3 },
      { octaves: 8 },
      { speed: 3 },
      { animate: false },
      { distortOnly: true },
      { brightness: 25 },
      { contrast: 50 },
    ]

    for (const settings of variants) {
      const output = renderNoiseFieldReference({
        ...input,
        settings: { ...input.settings, ...settings },
      }).data
      expect(output, JSON.stringify(settings)).not.toEqual(base)
    }
  })
})

function makeInput(options: {
  height?: number
  rgb?: Uint8Array | Uint8ClampedArray
  settings?: Partial<import('./noise-field-core').NoiseFieldSettings>
  time?: number
  width?: number
} = {}) {
  const width = options.width ?? 8
  const height = options.height ?? 6
  return {
    height,
    rgb: options.rgb ?? gradientRgb(width, height),
    settings: { ...DEFAULT_NOISE_FIELD_SETTINGS, ...options.settings },
    time: options.time ?? 0,
    width,
  }
}

function render(options: Parameters<typeof makeInput>[0] = {}) {
  return renderNoiseFieldReference(makeInput(options))
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

function pixelAt(data: Uint8ClampedArray, width: number, x: number, y: number) {
  const offset = (y * width + x) * 3
  return Array.from(data.slice(offset, offset + 3))
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}
