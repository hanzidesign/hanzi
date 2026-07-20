import { describe, expect, it } from 'vitest'

import { DEFAULT_PIXEL_SORT_SETTINGS } from './pixel-sort-core'
import { readPixelSortSettings } from './pixel-sort-settings'

describe('Pixel Sort independent renderer settings adapter', () => {
  it('resolves the fixed palette defaults per active theme', () => {
    expect(readPixelSortSettings({}, 'light')).toMatchObject({
      highlight: '#e6a928', midtone: '#c93472', shadow: '#35115c', background: '#ffffff',
    })
    expect(readPixelSortSettings({}, 'dark')).toMatchObject({
      highlight: '#ffe08a', midtone: '#ff5a9d', shadow: '#1b0836', background: '#000000',
    })
  })
  it('maps every visible Pixel Sort controller without generic runtime packing', () => {
    expect(readPixelSortSettings({
      direction: 'diagonal',
      'sort-mode': 'saturation',
      threshold: 0.45,
      'streak-length': 270,
      intensity: 0.65,
      randomness: 0.75,
      reverse: true,
      brightness: 40,
      contrast: -25,
      mix: 1,
      shadow: '#102030',
      midtone: '#405060',
      highlight: '#708090',
      background: '#ffffff',
    })).toMatchObject({
      direction: 'diagonal',
      mode: 'saturation',
      threshold: 0.45,
      streakLength: 270,
      intensity: 0.65,
      randomness: 0.75,
      reverse: true,
      brightness: 40,
      contrast: -25,
      mix: 1,
      shadow: '#102030',
      midtone: '#405060',
      highlight: '#708090',
      background: '#ffffff',
    })
  })

  it('uses the renderer defaults for missing or invalid controller values', () => {
    expect(readPixelSortSettings({
      direction: 'radial',
      'sort-mode': 'color',
      threshold: Number.NaN,
    })).toMatchObject({ ...DEFAULT_PIXEL_SORT_SETTINGS, background: '#ffffff' })
  })
})
