import { describe, expect, it } from 'vitest'

import {
  DEFAULT_WAVE_LINES_SETTINGS,
  renderWaveLinesReference,
  sampleWaveLinesSourceLinear,
  traceWaveLinesAt,
} from './wave-lines-core'

describe('Wave Lines CPU reference', () => {
  it('keeps the exact production defaults, including below-slider-minimum thickness', () => {
    expect(DEFAULT_WAVE_LINES_SETTINGS).toEqual({
      amplitude: 20,
      animate: true,
      background: [0, 0, 0],
      brightness: 0,
      colorMode: 'mono',
      contrast: 0,
      direction: 'horizontal',
      frequency: 1,
      lineColor: [255, 255, 255],
      lineCount: 50,
      lineThickness: 0.4,
    })
  })

  it('uses pixel centers, base-cell ownership, direct-radian time, and luminance geometry', () => {
    const trace = traceWaveLinesAt({
      height: 20,
      rgb: solidRgb(40, 20, [128, 128, 128]),
      settings: {
        ...DEFAULT_WAVE_LINES_SETTINGS,
        amplitude: 5,
        frequency: 2,
        lineCount: 10,
        lineThickness: 0.5,
      },
      time: 0.75,
      width: 40,
    }, 7, 11)
    const luminance = 128 / 255
    const phase = (7.5 / 40) * Math.PI * 2 * 2
    const offset = Math.sin(phase + 0.75) * 5 * luminance

    expect(trace.adjustedSource).toEqual([luminance, luminance, luminance])
    expect(trace.luminance).toBeCloseTo(luminance, 14)
    expect(trace.animTime).toBe(0.75)
    expect(trace.spacing).toBe(2)
    expect(trace.index).toBe(5)
    expect(trace.phase).toBeCloseTo(phase, 14)
    expect(trace.offset).toBeCloseTo(offset, 14)
    expect(trace.center).toBeCloseTo(11 + offset, 14)
    expect(trace.distance).toBeCloseTo(Math.abs(11.5 - 11 - offset), 14)
    expect(trace.halfWidth).toBeCloseTo(2 * 0.5 * luminance, 14)
    expect(trace.isLine).toBe(trace.distance < trace.halfWidth)
  })

  it('transposes horizontal geometry exactly and freezes phase time when Animate is false', () => {
    const horizontal = trace({
      height: 30,
      settings: { animate: false, direction: 'horizontal' },
      width: 20,
      x: 6,
      y: 13,
    })
    const vertical = trace({
      height: 20,
      settings: { animate: false, direction: 'vertical' },
      width: 30,
      x: 13,
      y: 6,
    })

    expect(vertical).toEqual(horizontal)
    expect(vertical.animTime).toBe(0)
    expect(vertical).toEqual(trace({
      height: 20,
      settings: { animate: false, direction: 'vertical' },
      time: 999,
      width: 30,
      x: 13,
      y: 6,
    }))
  })

  it('returns adjusted Original or Line Color in Mono, with raw Background outside', () => {
    const settings = {
      amplitude: 5,
      animate: true,
      background: [7, 17, 27] as const,
      lineCount: 10,
      lineThickness: 3,
    }
    const original = renderPixel([255, 0, 0], { ...settings, colorMode: 'original' }, -Math.PI)
    const mono = renderPixel([255, 0, 0], {
      ...settings,
      colorMode: 'custom',
      lineColor: [1, 2, 3],
    }, -Math.PI)
    const changedLineColor = renderPixel([255, 0, 0], {
      ...settings,
      colorMode: 'custom',
      lineColor: [240, 230, 220],
    }, -Math.PI)
    const outside = renderPixel([0, 0, 0], {
      ...settings,
      colorMode: 'custom',
    }, -Math.PI)

    expect(original).toEqual([255, 0, 0])
    expect(mono).toEqual([1, 2, 3])
    expect(changedLineColor).toEqual([240, 230, 220])
    expect(outside).toEqual(settings.background)
  })

  it('uses strict distance comparison, so exact-boundary and zero-luminance pixels are not lines', () => {
    const settings = {
      amplitude: 5,
      background: [9, 19, 29] as const,
      lineCount: 10,
      lineThickness: 0.5,
    }

    expect(renderPixel([255, 255, 255], settings, -Math.PI)).toEqual(settings.background)
    expect(renderPixel([0, 0, 0], { ...settings, lineThickness: 3 }, -Math.PI))
      .toEqual(settings.background)
  })

  it('rejects malformed input and settings while allowing only the 0.4 thickness exception', () => {
    expect(() => renderWaveLinesReference({
      height: 1,
      rgb: new Uint8Array(2),
      settings: DEFAULT_WAVE_LINES_SETTINGS,
      time: 0,
      width: 1,
    })).toThrow('width * height * 3')
    expect(() => render({ width: 0 })).toThrow('positive integers')
    expect(() => render({ time: Number.NaN })).toThrow('time must be finite')
    expect(() => render({ settings: { lineCount: 11 } })).toThrow('increments of 5')
    expect(() => render({ settings: { amplitude: 4 } })).toThrow('between 5 and 50')
    expect(() => render({ settings: { amplitude: 5.5 } })).toThrow('integer')
    expect(() => render({ settings: { frequency: 0.55 } })).toThrow('increments of 0.1')
    expect(() => render({ settings: { lineThickness: 0.4 } })).not.toThrow()
    expect(() => render({ settings: { lineThickness: 0.3 } })).toThrow('between 0.5 and 3')
    expect(() => render({ settings: { lineThickness: 0.55 } })).toThrow('increments of 0.1')
    expect(() => render({ settings: { brightness: 0.5 } })).toThrow('integer')
    expect(() => render({ settings: { contrast: 101 } })).toThrow('between -100 and 100')
    expect(() => render({ settings: { direction: 'diagonal' as 'horizontal' } })).toThrow('direction')
    expect(() => render({ settings: { animate: 1 as unknown as boolean } })).toThrow('boolean')
    expect(() => render({ settings: { colorMode: 'grayscale' as 'custom' } })).toThrow('colorMode')
    expect(() => render({ settings: { lineColor: [0, 0, 256] } })).toThrow('color channel')
    expect(() => traceWaveLinesAt(makeInput(), -1, 0)).toThrow('in-bounds')
  })

  it('uses clamp-to-edge linear source sampling', () => {
    const rgb = new Uint8ClampedArray([
      0, 10, 20,
      100, 110, 120,
      200, 210, 220,
      240, 250, 255,
    ])
    const center = sampleWaveLinesSourceLinear(rgb, 4, 1, 0.5, 0.5)
    expect(center[0]).toBeCloseTo(150 / 255, 14)
    expect(center[1]).toBeCloseTo(160 / 255, 14)
    expect(center[2]).toBeCloseTo(170 / 255, 14)
    expect(sampleWaveLinesSourceLinear(rgb, 4, 1, -1, 2)).toEqual([0, 10 / 255, 20 / 255])
  })

  it('applies Brightness before production Contrast and uses luminance in both output and geometry', () => {
    const baseInput = {
      height: 20,
      rgb: solidRgb(40, 20, [64, 64, 64]),
      time: 0.4,
      width: 40,
    }
    const base = traceWaveLinesAt({
      ...baseInput,
      settings: { ...DEFAULT_WAVE_LINES_SETTINGS, lineCount: 10 },
    }, 7, 11)
    const adjusted = traceWaveLinesAt({
      ...baseInput,
      settings: {
        ...DEFAULT_WAVE_LINES_SETTINGS,
        brightness: 25,
        contrast: 50,
        lineCount: 10,
      },
    }, 7, 11)
    const expected = ((64 / 255 + 0.25) - 0.5) * (1.5 / 0.505) + 0.5

    expect(adjusted.adjustedSource[0]).toBeCloseTo(expected, 14)
    expect(adjusted.luminance).toBeCloseTo(expected, 14)
    expect(adjusted.offset).not.toBeCloseTo(base.offset, 12)
    expect(adjusted.halfWidth).not.toBeCloseTo(base.halfWidth, 12)

    const contrastFloor = traceWaveLinesAt({
      ...baseInput,
      settings: {
        ...DEFAULT_WAVE_LINES_SETTINGS,
        brightness: 100,
        contrast: -100,
        lineCount: 10,
      },
    }, 7, 11)
    expect(contrastFloor.adjustedSource).toEqual([0.5, 0.5, 0.5])
  })

  it('locks contextual no-ops and unwarped cell gaps', () => {
    const common = {
      amplitude: 50,
      background: [12, 34, 56] as const,
      lineCount: 10,
      lineThickness: 3,
    }
    const phaseNodeSmall = renderPixel([180, 180, 180], { ...common, amplitude: 5 }, -Math.PI)
    const phaseNodeLarge = renderPixel([180, 180, 180], common, -Math.PI)
    expect(phaseNodeLarge).toEqual(phaseNodeSmall)

    const grayMono = renderPixel([180, 180, 180], { ...common, colorMode: 'custom' }, -Math.PI)
    expect(grayMono).toEqual(DEFAULT_WAVE_LINES_SETTINGS.lineColor)

    const square = solidRgb(20, 20, [180, 180, 180])
    expect(render({ height: 20, rgb: square, settings: { ...common, direction: 'horizontal' }, width: 20 }).data)
      .toEqual(render({ height: 20, rgb: square, settings: { ...common, direction: 'vertical' }, width: 20 }).data)

    const largeOffset = renderPixel([255, 255, 255], common, Math.PI / 2)
    expect(largeOffset).toEqual(common.background)
    expect(renderPixel([0, 0, 0], { ...common, brightness: 100 }, Math.PI / 2))
      .toEqual(common.background)
  })
})

function renderPixel(
  rgb: readonly [number, number, number],
  settings: Partial<import('./wave-lines-core').WaveLinesSettings> = {},
  time = 0,
) {
  return Array.from(renderWaveLinesReference({
    height: 1,
    rgb: new Uint8ClampedArray(rgb),
    settings: { ...DEFAULT_WAVE_LINES_SETTINGS, ...settings },
    time,
    width: 1,
  }).data)
}

function render(options: {
  height?: number
  rgb?: Uint8Array | Uint8ClampedArray
  settings?: Partial<import('./wave-lines-core').WaveLinesSettings>
  time?: number
  width?: number
} = {}) {
  return renderWaveLinesReference(makeInput(options))
}

function makeInput(options: {
  height?: number
  rgb?: Uint8Array | Uint8ClampedArray
  settings?: Partial<import('./wave-lines-core').WaveLinesSettings>
  time?: number
  width?: number
} = {}) {
  const height = options.height ?? 12
  const width = options.width ?? 16
  return {
    height,
    rgb: options.rgb ?? solidRgb(width, height, [128, 128, 128]),
    settings: { ...DEFAULT_WAVE_LINES_SETTINGS, ...options.settings },
    time: options.time ?? 0,
    width,
  }
}

function trace(options: {
  height: number
  settings?: Partial<import('./wave-lines-core').WaveLinesSettings>
  time?: number
  width: number
  x: number
  y: number
}) {
  return traceWaveLinesAt({
    height: options.height,
    rgb: solidRgb(options.width, options.height, [128, 128, 128]),
    settings: { ...DEFAULT_WAVE_LINES_SETTINGS, ...options.settings },
    time: options.time ?? 2.25,
    width: options.width,
  }, options.x, options.y)
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
