import { describe, expect, it } from 'vitest'

import { DEFAULT_PIXEL_SORT_SETTINGS } from './pixel-sort-core'
import { readPixelSortSettings } from './pixel-sort-settings'

describe('Pixel Sort independent renderer settings adapter', () => {
  it('resolves the fixed gradient defaults per active theme', () => {
    expect(readPixelSortSettings({}, 'light')).toMatchObject({
      startColor: '#35115c', middleColor: '#c93472', endColor: '#e6a928', background: '#ffffff',
    })
    expect(readPixelSortSettings({}, 'dark')).toMatchObject({
      startColor: '#1b0836', middleColor: '#ff5a9d', endColor: '#ffe08a', background: '#000000',
    })
    expect(readPixelSortSettings({}, 'light').randomness).toBe(0.5)
  })
  it('maps every visible Pixel Sort controller without generic runtime packing', () => {
    expect(readPixelSortSettings({
      direction: 'radial',
      'sort-mode': 'saturation',
      threshold: 0.45,
      'streak-length': 270,
      intensity: 0.65,
      randomness: 0.75,
      reverse: true,
      brightness: 40,
      contrast: -25,
      mix: 1,
      'start-color': '#102030',
      'middle-color': '#405060',
      'end-color': '#708090',
      background: '#ffffff',
    })).toMatchObject({
      direction: 'radial',
      mode: 'saturation',
      threshold: 0.45,
      streakLength: 270,
      intensity: 0.65,
      randomness: 0.75,
      reverse: true,
      brightness: 40,
      contrast: -25,
      mix: 1,
      startColor: '#102030',
      middleColor: '#405060',
      endColor: '#708090',
      background: '#ffffff',
    })
  })

  it('uses the renderer defaults for missing or invalid controller values', () => {
    expect(readPixelSortSettings({
      direction: 'unknown',
      'sort-mode': 'color',
      threshold: Number.NaN,
    })).toMatchObject({ ...DEFAULT_PIXEL_SORT_SETTINGS, mode: 'depth', background: '#ffffff' })
  })

  it.each(['#123456', '#ABCDEF'])('accepts six-digit color values (%s)', (value) => {
    expect(readPixelSortSettings({
      'start-color': value,
      'middle-color': value,
      'end-color': value,
      background: value,
    })).toMatchObject({
      startColor: value,
      middleColor: value,
      endColor: value,
      background: value,
    })
  })

  it.each(['#12345', '#1234567', '#12345678', '123456', '#12345g', 123456, true])(
    'uses defaults for invalid color values (%s)',
    (value) => {
      expect(readPixelSortSettings({ 'start-color': value })).toMatchObject({
        startColor: '#35115c',
      })
    },
  )

  it.each(['horizontal', 'vertical', 'diagonal', 'anti-diagonal', 'radial'] as const)(
    'accepts the %s direction value',
    (direction) => {
      expect(readPixelSortSettings({ direction }).direction).toBe(direction)
    },
  )
})
