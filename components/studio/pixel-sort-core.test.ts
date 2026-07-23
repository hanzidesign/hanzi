import { describe, expect, it } from 'vitest'

import {
  DEFAULT_PIXEL_SORT_SETTINGS,
  getPixelSortLineFactor,
  getPixelSortModeMetric,
  getPixelSortDepthReach,
  hashPixelSort11,
  mapPixelSortGradient,
  renderPixelSortFrame,
  type PixelSortDirection,
  type PixelSortSettings,
} from './pixel-sort-core'

const SETTINGS: PixelSortSettings = {
  ...DEFAULT_PIXEL_SORT_SETTINGS,
  background: '#000000',
  brightness: 0,
  contrast: 0,
  endColor: '#0000ff',
  intensity: 1,
  middleColor: '#00ff00',
  mix: 1,
  mode: 'depth',
  randomness: 0,
  startColor: '#ff0000',
  streakLength: 2,
  threshold: 0,
}

function frame(
  pixels: ReadonlyArray<readonly [number, number, number, number]>,
  width: number,
  settings: Partial<PixelSortSettings> = {},
) {
  return renderPixelSortFrame({
    height: pixels.length / width,
    rgba: Uint8ClampedArray.from(pixels.flat()),
    settings: { ...SETTINGS, ...settings },
    width,
  }).data
}

function texels(data: Uint8ClampedArray) {
  return Array.from({ length: data.length / 4 }, (_, index) => (
    Array.from(data.slice(index * 4, index * 4 + 4))
  ))
}

describe('Pixel Sort boundary-led CPU renderer', () => {
  it('uses the production defaults and exact line-level randomness contract', () => {
    expect(DEFAULT_PIXEL_SORT_SETTINGS.streakLength).toBe(500)
    expect(DEFAULT_PIXEL_SORT_SETTINGS.intensity).toBe(1)
    expect(DEFAULT_PIXEL_SORT_SETTINGS.randomness).toBe(0.5)
    expect(hashPixelSort11(0)).toBe(0)
    expect(getPixelSortLineFactor(7, 0)).toBe(1)
    expect(getPixelSortLineFactor(7, 5)).toBeCloseTo(getPixelSortLineFactor(7, 1) ** 5)
  })

  it('implements thresholded local reach for every sort mode', () => {
    const medium = [0.2, 0.5, 0.8] as const
    const luminance = 0.2 * 0.299 + 0.5 * 0.587 + 0.8 * 0.114
    expect(getPixelSortModeMetric(medium, 'brightness', 1, 0.25)).toBeCloseTo(luminance)
    expect(getPixelSortModeMetric(medium, 'hue', 1, 0.25)).toBeCloseTo(1 - luminance)
    expect(getPixelSortModeMetric(medium, 'saturation', 1, 0.25)).toBe(0.8)
    expect(getPixelSortModeMetric(medium, 'dark', 1, 0.25)).toBe(0)
    expect(getPixelSortModeMetric([0.1, 0.1, 0.1], 'dark', 1, 0.25)).toBeCloseTo(0.9)
    expect(getPixelSortModeMetric([0, 0, 0], 'depth', 1, 0)).toBe(0)
    expect(getPixelSortDepthReach(0.25, 0.25)).toBe(0)
    expect(getPixelSortDepthReach(0.625, 0.25)).toBeCloseTo(0.5)
    expect(getPixelSortDepthReach(1, 1)).toBe(1)
  })

  it('keeps non-black depth reach positive below threshold while preserving stronger depth reach', () => {
    const source = [0.2, 0.4, 0.6] as const
    expect(getPixelSortModeMetric([0, 0, 0], 'depth', 1, 0.25)).toBe(0)
    expect(getPixelSortModeMetric(source, 'depth', 0, 0.25)).toBe(0.6)
    expect(getPixelSortModeMetric(source, 'depth', 0.2, 0.25)).toBe(0.6)
    expect(getPixelSortModeMetric(source, 'depth', 0.8, 0.25)).toBeCloseTo(0.7333333)
  })

  it('emits an exterior pixel for a low-depth colored source', () => {
    const baseline = texels(frame([
      [128, 128, 128, 0], [0, 0, 0, 0],
    ], 2, { intensity: 0, streakLength: 3, threshold: 0.25 }))
    const output = texels(frame([
      [128, 128, 128, 0], [0, 0, 0, 0],
    ], 2, { streakLength: 3, threshold: 0.25 }))

    expect(output[1]).not.toEqual(baseline[1])
  })

  it('starts exterior distance at each trailing model edge in both directions', () => {
    const pixels = [
      [0, 0, 0, 0], [80, 80, 80, 255], [0, 0, 0, 0],
      [120, 120, 120, 255], [0, 0, 0, 0],
    ] as const
    const baseline = texels(frame(pixels, 5, { intensity: 0 }))
    const forward = texels(frame(pixels, 5))
    expect(forward[0]).toEqual(baseline[0])
    expect(forward.slice(1).every((pixel, index) => pixel.join() !== baseline[index + 1]!.join())).toBe(true)

    const reverseBaseline = texels(frame(pixels, 5, { intensity: 0, reverse: true }))
    const reverse = texels(frame(pixels, 5, { reverse: true }))
    expect(reverse[4]).toEqual(reverseBaseline[4])
    expect(reverse.slice(0, 4).every((pixel, index) => pixel.join() !== reverseBaseline[index]!.join())).toBe(true)
  })

  it('overlays one connected trail across both model and exterior pixels', () => {
    const output = texels(frame([
      [0, 0, 0, 0], [80, 80, 80, 255], [120, 120, 120, 255],
      [0, 0, 0, 0], [0, 0, 0, 0],
    ], 5, { streakLength: 3 }))
    expect(output[1]).not.toEqual([80, 80, 80, 255])
    expect(output[2]).not.toEqual([120, 120, 120, 255])
    expect(output[3]).not.toEqual([0, 0, 0, 255])
    expect(output[4]).not.toEqual([0, 0, 0, 255])
  })

  it('covers a wide model component and measures exterior overflow from its trailing edge', () => {
    const pixels = [
      [80, 80, 80, 255], [90, 90, 90, 255], [100, 100, 100, 255],
      [110, 110, 110, 255], [120, 120, 120, 255],
      [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0],
    ] as const
    const baseline = texels(frame(pixels, 8, { intensity: 0, streakLength: 2 }))
    const output = texels(frame(pixels, 8, { streakLength: 2 }))

    expect(output.slice(0, 5).every((pixel, index) => pixel.join() !== baseline[index]!.join())).toBe(true)
    expect(output.slice(5, 7).every((pixel, index) => pixel.join() !== baseline[index + 5]!.join())).toBe(true)
    expect(output[7]).toEqual(baseline[7])
    const reversed = texels(frame([...pixels].reverse(), 8, { reverse: true, streakLength: 2 }))
    const reversedBaseline = texels(frame([...pixels].reverse(), 8, { intensity: 0, reverse: true, streakLength: 2 }))
    expect(reversed.slice(3).every((pixel, index) => pixel.join() !== reversedBaseline[index + 3]!.join())).toBe(true)
    expect(reversed.slice(1, 3).every((pixel, index) => pixel.join() !== reversedBaseline[index + 1]!.join())).toBe(true)
    expect(reversed[0]).toEqual(reversedBaseline[0])
  })

  it('retains the depth-colored base at zero intensity and treats RGB occupancy independently of alpha', () => {
    const output = texels(frame([
      [100, 100, 100, 0], [100, 100, 100, 128], [0, 0, 0, 255],
    ], 3, { intensity: 0 }))
    expect(output[0]).toEqual([255, 0, 0, 255])
    expect(output[1]).not.toEqual([100, 100, 100, 255])
    expect(output[2]).toEqual([0, 0, 0, 255])
  })

  it('never exceeds the hard streak maximum', () => {
    const output = texels(frame([
      [0, 0, 0, 0], [80, 80, 80, 255], [0, 0, 0, 0],
      [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0],
    ], 6, { streakLength: 2 }))
    expect(output[3]).toEqual([0, 0, 255, 255])
    expect(output[4]).toEqual([0, 0, 0, 255])
    expect(output[5]).toEqual([0, 0, 0, 255])
  })

  it('is deterministic and higher randomness does not increase trail coverage', () => {
    const pixels = Array.from({ length: 4 }, () => (
      [[100, 100, 100, 255], ...Array.from({ length: 7 }, () => [0, 0, 0, 0])]
    )).flat() as Array<[number, number, number, number]>
    const base = frame(pixels, 8, { intensity: 0, streakLength: 7 })
    const countChanged = (randomness: number) => {
      const output = frame(pixels, 8, { randomness, streakLength: 7 })
      return texels(output).filter((pixel, index) => (
        pixel.some((channel, channelIndex) => channel !== base[index * 4 + channelIndex])
      )).length
    }
    expect(frame(pixels, 8, { randomness: 5 })).toEqual(frame(pixels, 8, { randomness: 5 }))
    expect(countChanged(0)).toBeGreaterThanOrEqual(countChanged(1))
    expect(countChanged(1)).toBeGreaterThanOrEqual(countChanged(5))
  })

  it.each([
    'horizontal', 'vertical', 'diagonal', 'anti-diagonal', 'radial',
  ] as const)('emits opaque connected output for %s in both traversal directions', (direction) => {
    const pixels = Array.from({ length: 25 }, (_, index) => (
      index === 6 || index === 12 || index === 18
        ? [120, 120, 120, 255] as const
        : [0, 0, 0, 0] as const
    ))
    for (const reverse of [false, true]) {
      const output = frame(pixels, 5, { direction, reverse })
      expect(texels(output).every((pixel) => pixel[3] === 255)).toBe(true)
    }
  })

  it('validates the expanded randomness range and all public dimensions', () => {
    expect(() => frame([[1, 1, 1, 255]], 1, { streakLength: 2000 })).not.toThrow()
    expect(() => frame([[1, 1, 1, 255]], 1, { streakLength: 2001 })).toThrow('between 1 and 2000')
    expect(() => frame([[1, 1, 1, 255]], 1, { intensity: 2 })).not.toThrow()
    expect(() => frame([[1, 1, 1, 255]], 1, { intensity: 2.1 })).toThrow('between 0 and 2')
    expect(() => frame([[1, 1, 1, 255]], 1, { randomness: 5 })).not.toThrow()
    expect(() => frame([[1, 1, 1, 255]], 1, { randomness: 5.1 })).toThrow('between 0 and 5')
    expect(() => renderPixelSortFrame({
      height: 1,
      rgba: new Uint8Array(3),
      settings: SETTINGS,
      width: 1,
    })).toThrow('width * height * 4')
    expect(() => frame([[1, 1, 1, 255]], 1, {
      direction: 'unknown' as PixelSortDirection,
    })).toThrow('horizontal, vertical, diagonal, anti-diagonal, or radial')
  })

  it('keeps the three-stop gradient endpoints exact', () => {
    for (const [position, expected] of [
      [0, [1, 0, 0]],
      [0.5, [0, 1, 0]],
      [1, [0, 0, 1]],
    ] as const) {
      mapPixelSortGradient([0, 0, 0], position, SETTINGS).forEach((channel, index) => {
        expect(channel).toBeCloseTo(expected[index], 5)
      })
    }
  })
})
