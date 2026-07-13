import { describe, expect, it } from 'vitest'

import {
  DEFAULT_VHS_SETTINGS,
  renderVhsReference,
  sampleVhsSourceLinear,
  traceVhsAt,
  vhsHash,
  vhsValueNoise,
} from './vhs-core'

describe('VHS CPU reference', () => {
  it('keeps the exact production defaults', () => {
    expect(DEFAULT_VHS_SETTINGS).toEqual({
      brightness: 0,
      colorBleed: 0.5,
      contrast: 0,
      distortion: 0.5,
      noise: 0.3,
      trackingError: 0.2,
      vhsScanlines: 0.3,
    })
  })

  it('ports the production scalar hash and cubic value noise exactly', () => {
    expect(vhsHash([0, 0])).toBe(0)
    expect(vhsHash([1, 2])).toBeCloseTo(0.48287847430947295, 14)
    expect(vhsValueNoise([1.25, 2.75])).toBeCloseTo(0.4123566262948959, 14)
    expect(vhsValueNoise([-0.5, 0.125])).toBeCloseTo(0.3464422689520532, 14)
  })

  it('applies tracking and distortion to x only, then clamps the warped UV once', () => {
    const input = makeInput({
      height: 10,
      settings: { distortion: 0.8, trackingError: 0.65 },
      time: 1.75,
      width: 12,
    })
    const trace = traceVhsAt(input, 3, 8)
    const uv = [3.5 / 12, 8.5 / 10] as const
    const trackNoise = vhsValueNoise([Math.floor(uv[1] * 20), Math.floor(1.75 * 2)])
    const trackingOffset = (trackNoise - 0.5) * 0.1 * 0.65
    const jumpGate = vhsValueNoise([1.75 * 0.5, 0]) >= 0.92
    const bigJump = jumpGate
      ? (vhsValueNoise([uv[1] * 5, 1.75]) - 0.5) * 0.3 * 0.65
      : 0
    const warpFrequency = 3 + vhsValueNoise([1.75 * 0.1, 0]) * 5
    const wobble = Math.sin(uv[1] * warpFrequency * 6.28 + 1.75 * 2) * 0.8 * 0.02
    const shake = (vhsValueNoise([1.75 * 10, 0]) - 0.5) * 0.8 * 0.01
    const edgeWarp = Math.sin(1.75 * 3 + uv[1] * 10)
      * Math.abs(uv[1] - 0.5) ** 3 * 8 * 0.8 * 0.1

    expect(trace.uv).toEqual(uv)
    expect(trace.trackNoise).toBeCloseTo(trackNoise, 14)
    expect(trace.trackingOffset).toBeCloseTo(trackingOffset, 14)
    expect(trace.jumpGate).toBe(jumpGate)
    expect(trace.bigJump).toBeCloseTo(bigJump, 14)
    expect(trace.warpFrequency).toBeCloseTo(warpFrequency, 14)
    expect(trace.wobble).toBeCloseTo(wobble, 14)
    expect(trace.shake).toBeCloseTo(shake, 14)
    expect(trace.edgeWarp).toBeCloseTo(edgeWarp, 14)
    expect(trace.warpedUv[0]).toBeCloseTo(clamp01(
      uv[0] + trackingOffset + bigJump + wobble + shake + edgeWarp,
    ), 14)
    expect(trace.warpedUv[1]).toBe(uv[1])
  })

  it('uses normalized linear clamp sampling for every source lookup', () => {
    const source = new Uint8ClampedArray([
      0, 10, 20,
      100, 110, 120,
      200, 210, 220,
      240, 250, 255,
    ])
    expect(sampleVhsSourceLinear(source, 4, 1, 0.5, 0.5)).toEqual([
      expect.closeTo(150 / 255, 14),
      expect.closeTo(160 / 255, 14),
      expect.closeTo(170 / 255, 14),
    ])
    expect(sampleVhsSourceLinear(source, 4, 1, -1, 2)).toEqual([
      0,
      10 / 255,
      20 / 255,
    ])
  })

  it('separates RGB, averages five taps, and mixes 30% chroma blur', () => {
    const input = makeInput({
      height: 4,
      settings: optionalSettings({ colorBleed: 0.75 }),
      width: 20,
    })
    const trace = traceVhsAt(input, 9, 1)
    const bleed = 0.0075
    const center = trace.warpedUv
    const red = sampleVhsSourceLinear(input.rgb, 20, 4, center[0] + bleed * 2, center[1])[0]
    const green = sampleVhsSourceLinear(input.rgb, 20, 4, center[0], center[1])[1]
    const blue = sampleVhsSourceLinear(input.rgb, 20, 4, center[0] - bleed * 2, center[1])[2]
    const average = [0, 1, 2].map((channel) => {
      let total = 0
      for (let tap = -2; tap <= 2; tap += 1) {
        total += sampleVhsSourceLinear(input.rgb, 20, 4, center[0] + tap * bleed, center[1])[channel]
      }
      return total / 5
    })

    expect(trace.bleedAmount).toBe(bleed)
    expect(trace.separatedColor).toEqual([red, green, blue])
    expect(trace.chromaBlur).toEqual(average)
    expect(trace.colorAfterBleed).toEqual([
      mix(red, average[0], 0.3),
      mix(green, average[1], 0.3),
      mix(blue, average[2], 0.3),
    ])
  })

  it('applies scanline luminance and odd-row red loss exactly', () => {
    const settings = optionalSettings({ colorBleed: 0, vhsScanlines: 0.6 })
    const even = traceVhsAt(makeInput({ height: 6, settings }), 3, 2)
    const odd = traceVhsAt(makeInput({ height: 6, settings }), 3, 3)

    for (const trace of [even, odd]) {
      const pattern = Math.sin(trace.uv[1] * 6 * 3.14159) * 0.5 + 0.5
      const multiplier = mix(1, pattern, 0.3)
      expect(trace.scanlinePattern).toBeCloseTo(pattern, 14)
      expect(trace.scanlineMultiplier).toBeCloseTo(multiplier, 14)
      expect(trace.colorAfterScanlines).toEqual([
        trace.colorAfterBleed[0] * multiplier * (1 - 0.6 * 0.1 * trace.oddRowMask),
        trace.colorAfterBleed[1] * multiplier,
        trace.colorAfterBleed[2] * multiplier,
      ])
    }
    expect(even.oddRowMask).toBe(0)
    expect(odd.oddRowMask).toBe(1)
  })

  it('adds grain, rare horizontal banding, and the rolling bar before grading', () => {
    const input = makeInput({
      height: 20,
      settings: optionalSettings({ colorBleed: 0, noise: 0.8 }),
      time: 2.25,
      width: 24,
    })
    const trace = traceVhsAt(input, 8, 13)
    const grain = (vhsHash([
      trace.uv[0] * 24 + 2.25 * 1000,
      trace.uv[1] * 20 + 2.25 * 1000,
    ]) - 0.5) * 0.8 * 0.3
    const bandGate = vhsValueNoise([trace.uv[1] * 100, 2.25 * 5]) >= 0.97
    const band = bandGate ? (vhsHash([trace.uv[0] * 100, 2.25]) - 0.5) * 0.8 : 0
    const rollingBarGate = Math.abs(trace.uv[1] - fract(2.25 * 0.3)) <= 0.02
    const rollingBar = rollingBarGate
      ? (vhsHash([trace.uv[0] * 500, Math.floor(2.25 * 60)]) - 0.5) * 0.8 * 0.5
      : 0

    expect(trace.grain).toBeCloseTo(grain, 14)
    expect(trace.bandGate).toBe(bandGate)
    expect(trace.band).toBeCloseTo(band, 14)
    expect(trace.rollingBarGate).toBe(rollingBarGate)
    expect(trace.rollingBar).toBeCloseTo(rollingBar, 14)
    expect(trace.colorAfterNoise).toEqual(trace.colorAfterScanlines.map(
      (channel) => channel + grain + band + rollingBar,
    ))
  })

  it('always grades, tints, and vignettes before brightness and contrast', () => {
    const trace = traceVhsAt(makeInput({
      height: 8,
      rgb: solidRgb(10, 8, [100, 150, 200]),
      settings: optionalSettings({ brightness: 20, contrast: 40 }),
      width: 10,
    }), 0, 0)
    const luminance = trace.colorAfterNoise[0] * 0.299
      + trace.colorAfterNoise[1] * 0.587
      + trace.colorAfterNoise[2] * 0.114
    const desaturated = trace.colorAfterNoise.map((channel) => mix(channel, luminance, 0.1))
    const graded = [desaturated[0] * 1.1, desaturated[1], desaturated[2] * 0.9]
    const vignette = 1 - Math.hypot(
      (trace.uv[0] - 0.5) * 0.5,
      (trace.uv[1] - 0.5) * 0.7,
    ) * 0.5
    const preAdjustment = graded.map((channel) => channel * vignette)
    const contrastFactor = 1.4 / (1 - 0.99 * 0.4)

    expect(trace.luminance).toBeCloseTo(luminance, 14)
    expect(trace.desaturatedColor).toEqual(desaturated)
    expect(trace.gradedColor).toEqual(graded)
    expect(trace.vignette).toBeCloseTo(vignette, 14)
    expect(trace.preAdjustmentColor).toEqual(preAdjustment)
    expect(trace.output).toEqual(preAdjustment.map(
      (channel) => clamp01((channel + 0.2 - 0.5) * contrastFactor + 0.5),
    ))
  })

  it('keeps optional branches off at the strict 0.01 threshold', () => {
    const off = traceVhsAt(makeInput({ settings: optionalSettings() }), 3, 2)
    const threshold = traceVhsAt(makeInput({
      settings: optionalSettings({
        colorBleed: 0.01,
        distortion: 0.01,
        noise: 0.01,
        trackingError: 0.01,
        vhsScanlines: 0.01,
      }),
    }), 3, 2)

    expect(threshold).toEqual(off)
  })

  it('keeps color bleed a contextual no-op on horizontally constant color', () => {
    const rgb = horizontalBandsRgb(16, 8)
    const base = renderVhsReference(makeInput({
      height: 8,
      rgb,
      settings: optionalSettings(),
      width: 16,
    })).data
    const warped = renderVhsReference(makeInput({
      height: 8,
      rgb,
      settings: optionalSettings({ colorBleed: 1 }),
      time: 4.25,
      width: 16,
    })).data

    expect(warped).toEqual(base)
  })

  it('lets x-only warping affect a constant source through warped-UV vignette', () => {
    const rgb = solidRgb(16, 8, [100, 150, 200])
    const base = renderVhsReference(makeInput({
      height: 8,
      rgb,
      settings: optionalSettings(),
      width: 16,
    })).data
    const warped = renderVhsReference(makeInput({
      height: 8,
      rgb,
      settings: optionalSettings({ distortion: 1, trackingError: 1 }),
      time: 4.25,
      width: 16,
    })).data

    expect(warped).not.toEqual(base)
  })

  it('does not treat all-zero effects as passthrough and collapses contrast -100 to gray', () => {
    const input = makeInput({
      height: 5,
      settings: optionalSettings(),
      width: 6,
    })
    const output = renderVhsReference(input)
    expect(output).toMatchObject({ channels: 3, height: 5, width: 6 })
    expect(output.data).toHaveLength(90)
    expect(output.data).not.toEqual(input.rgb)

    const collapsed = renderVhsReference(makeInput({
      settings: optionalSettings({ contrast: -100 }),
    })).data
    expect([...collapsed].every((channel) => channel === 128)).toBe(true)
  })

  it('renders each pixel from the same trace oracle', () => {
    const input = makeInput({ height: 4, time: 1.25, width: 7 })
    const output = renderVhsReference(input)
    const trace = traceVhsAt(input, 5, 2)
    expect(pixelAt(output.data, 7, 5, 2)).toEqual(
      trace.output.map((channel) => Math.round(channel * 255)),
    )
  })

  it('rejects malformed inputs, invalid settings, and out-of-bounds traces', () => {
    expect(() => renderVhsReference({
      height: 1,
      rgb: new Uint8Array(2),
      settings: DEFAULT_VHS_SETTINGS,
      time: 0,
      width: 1,
    })).toThrow('width * height * 3')
    expect(() => render({ width: 0 })).toThrow('positive integers')
    expect(() => render({ time: Number.NaN })).toThrow('time must be finite')
    expect(() => render({ settings: { distortion: 1.05 } })).toThrow('between 0 and 1')
    expect(() => render({ settings: { noise: 0.03 } })).not.toThrow()
    expect(() => render({ settings: { colorBleed: Number.NaN } })).toThrow('finite')
    expect(() => render({ settings: { vhsScanlines: -0.05 } })).toThrow('between 0 and 1')
    expect(() => render({ settings: { trackingError: 0.51 } })).not.toThrow()
    expect(() => render({ settings: { brightness: 0.5 } })).toThrow('integer')
    expect(() => render({ settings: { contrast: 101 } })).toThrow('between -100 and 100')
    expect(() => traceVhsAt(makeInput(), -1, 0)).toThrow('in-bounds')
  })
})

function makeInput(options: {
  height?: number
  rgb?: Uint8Array | Uint8ClampedArray
  settings?: Partial<import('./vhs-core').VhsSettings>
  time?: number
  width?: number
} = {}) {
  const width = options.width ?? 8
  const height = options.height ?? 6
  return {
    height,
    rgb: options.rgb ?? gradientRgb(width, height),
    settings: { ...DEFAULT_VHS_SETTINGS, ...options.settings },
    time: options.time ?? 0,
    width,
  }
}

function optionalSettings(overrides: Partial<import('./vhs-core').VhsSettings> = {}) {
  return {
    colorBleed: 0,
    distortion: 0,
    noise: 0,
    trackingError: 0,
    vhsScanlines: 0,
    ...overrides,
  }
}

function render(options: Parameters<typeof makeInput>[0] = {}) {
  return renderVhsReference(makeInput(options))
}

function gradientRgb(width: number, height: number) {
  const data = new Uint8ClampedArray(width * height * 3)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 3
      data[offset] = (x * 29 + y * 7) % 256
      data[offset + 1] = (x * 11 + y * 31) % 256
      data[offset + 2] = (x * 43 + y * 17) % 256
    }
  }
  return data
}

function solidRgb(width: number, height: number, color: readonly [number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 3)
  for (let offset = 0; offset < data.length; offset += 3) data.set(color, offset)
  return data
}

function horizontalBandsRgb(width: number, height: number) {
  const data = new Uint8ClampedArray(width * height * 3)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      data.set([(y * 31) % 256, (y * 53) % 256, (y * 79) % 256], (y * width + x) * 3)
    }
  }
  return data
}

function pixelAt(data: Uint8ClampedArray, width: number, x: number, y: number) {
  const offset = (y * width + x) * 3
  return [...data.slice(offset, offset + 3)]
}

function fract(value: number) {
  return value - Math.floor(value)
}

function mix(from: number, to: number, amount: number) {
  return from * (1 - amount) + to * amount
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}
