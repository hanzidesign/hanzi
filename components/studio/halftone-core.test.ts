import { describe, expect, it } from 'vitest'

import {
  DEFAULT_HALFTONE_SETTINGS,
  renderHalftoneReference,
} from './halftone-core'

describe('Halftone CPU reference', () => {
  it('renders a circular halftone cell from source luminance', () => {
    const output = renderHalftoneReference({
      rgb: solidRgb(8, 8, [255, 255, 255]),
      width: 8,
      height: 8,
      settings: { ...DEFAULT_HALFTONE_SETTINGS, angle: 0, dotScale: 0.5, spacing: 8 },
    })

    expect(pixelAt(output.data, 8, 3, 3)).toEqual([255, 255, 255])
    expect(pixelAt(output.data, 8, 0, 0)).toEqual([0, 0, 0])
  })

  it('uses Studio circle, square, diamond, and line shape distances', () => {
    const render = (shape: 'circle' | 'square' | 'diamond' | 'line') => renderHalftoneReference({
      rgb: solidRgb(8, 8, [132, 132, 132]),
      width: 8,
      height: 8,
      settings: {
        ...DEFAULT_HALFTONE_SETTINGS,
        angle: 0,
        dotScale: 0.5,
        shape,
        spacing: 8,
      },
    }).data

    expect(pixelAt(render('circle'), 8, 1, 2)).toEqual([0, 0, 0])
    expect(pixelAt(render('circle'), 8, 2, 2)).toEqual([255, 255, 255])
    expect(pixelAt(render('square'), 8, 1, 1)).toEqual([255, 255, 255])
    expect(pixelAt(render('diamond'), 8, 2, 2)).toEqual([0, 0, 0])
    expect(pixelAt(render('line'), 8, 0, 3)).toEqual([255, 255, 255])
  })

  it('uses Rec. 601 luminance weights before calculating radius', () => {
    expect(renderPixel([255, 0, 0], 1, 3)).toEqual([0, 0, 0])
    expect(renderPixel([0, 255, 0], 1, 3)).toEqual([255, 255, 255])
    expect(renderPixel([0, 0, 255], 1, 3)).toEqual([0, 0, 0])
  })

  it('normalizes Brightness by 100 before the midpoint contrast transform', () => {
    expect(renderPixel([64, 64, 64], 1, 3, { brightness: 25 })).toEqual([255, 255, 255])
  })

  it('uses Studio contrast factor (1 + c) / (1 - 0.99c)', () => {
    expect(renderPixel([160, 160, 160], 0, 3, { contrast: -100 })).toEqual([0, 0, 0])
    expect(renderPixel([160, 160, 160], 0, 3, { contrast: 100 })).toEqual([255, 255, 255])
  })

  it('flips adjusted luminance before calculating radius when inverted', () => {
    expect(renderPixel([0, 0, 0], 1, 3)).toEqual([0, 0, 0])
    expect(renderPixel([0, 0, 0], 1, 3, { invert: true })).toEqual([255, 255, 255])
  })

  it('uses Spacing as the rotated grid period in pixels', () => {
    expect(renderPixel([255, 255, 255], 0, 0, { spacing: 8 })).toEqual([0, 0, 0])
    expect(renderPixel([255, 255, 255], 0, 0, { spacing: 2 })).toEqual([255, 255, 255])
  })

  it('rotates the grid by Angle degrees', () => {
    expect(renderPixel([132, 132, 132], 0, 3, { angle: 0, shape: 'line' })).toEqual([255, 255, 255])
    expect(renderPixel([132, 132, 132], 0, 3, { angle: 90, shape: 'line' })).toEqual([0, 0, 0])
  })

  it('uses Dot Scale only for deterministic paper-noise luminance perturbation', () => {
    expect(renderPixel([138, 138, 138], 2, 6, { dotScale: 0.5 })).toEqual([255, 255, 255])
    expect(renderPixel([138, 138, 138], 2, 6, { dotScale: 2 })).toEqual([0, 0, 0])

    expect(renderPixel([255, 255, 255], 0, 0, { dotScale: 2 })).toEqual([0, 0, 0])
  })

  it('writes configured ink and paper colors in Mono mode', () => {
    const settings = {
      background: [7, 8, 9] as const,
      foreground: [201, 202, 203] as const,
    }

    expect(renderPixel([255, 255, 255], 3, 3, settings)).toEqual([201, 202, 203])
    expect(renderPixel([255, 255, 255], 0, 0, settings)).toEqual([7, 8, 9])
  })

  it('writes adjusted source ink over paper in Original mode', () => {
    const settings = {
      background: [5, 6, 7] as const,
      brightness: 10,
      colorMode: 'original' as const,
    }

    expect(renderPixel([128, 64, 0], 2, 3, settings)).toEqual([154, 90, 25])
    expect(renderPixel([128, 64, 0], 0, 0, settings)).toEqual([5, 6, 7])
  })

  it('rejects invalid RGB input dimensions', () => {
    expect(() => renderHalftoneReference({
      rgb: new Uint8ClampedArray(2),
      width: 1,
      height: 1,
      settings: DEFAULT_HALFTONE_SETTINGS,
    })).toThrow('width * height * 3')
  })
})

function renderPixel(
  color: readonly [number, number, number],
  x: number,
  y: number,
  settings: Partial<typeof DEFAULT_HALFTONE_SETTINGS> = {},
) {
  const output = renderHalftoneReference({
    rgb: solidRgb(8, 8, color),
    width: 8,
    height: 8,
    settings: {
      ...DEFAULT_HALFTONE_SETTINGS,
      angle: 0,
      dotScale: 0.5,
      spacing: 8,
      ...settings,
    },
  })
  return pixelAt(output.data, 8, x, y)
}

function solidRgb(
  width: number,
  height: number,
  color: readonly [number, number, number],
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 3)
  for (let index = 0; index < width * height; index += 1) {
    data.set(color, index * 3)
  }
  return data
}

function pixelAt(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
): [number, number, number] {
  const offset = (y * width + x) * 3
  return [data[offset], data[offset + 1], data[offset + 2]]
}
