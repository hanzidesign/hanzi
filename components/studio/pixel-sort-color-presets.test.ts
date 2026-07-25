import { describe, expect, it } from 'vitest'

import {
  applyPixelSortColorPreset,
  PIXEL_SORT_COLOR_CONTROL_IDS,
  PIXEL_SORT_COLOR_PRESET_OPTIONS,
  resolvePixelSortColorPreset,
} from './pixel-sort-color-presets'

describe('Pixel Sort color presets', () => {
  it('resolves theme-aware Default palettes', () => {
    expect(resolvePixelSortColorPreset('default', 'light')).toEqual({
      'start-color': '#35115c',
      'middle-color': '#c93472',
      'end-color': '#e6a928',
      background: '#ffffff',
    })
    expect(resolvePixelSortColorPreset('default', 'dark')).toEqual({
      'start-color': '#1b0836',
      'middle-color': '#ff5a9d',
      'end-color': '#ffe08a',
      background: '#000000',
    })
  })

  it.each([
    ['vaporwave', '#2d00f7', '#f20089', '#00f5d4', '#0b0014'],
    ['ocean', '#03045e', '#00b4d8', '#caf0f8', '#001219'],
    ['ember', '#3d0c02', '#ff5400', '#ffbd00', '#120400'],
    ['mono', '#101010', '#808080', '#f5f5f5', '#000000'],
    ['aurora', '#240046', '#7b2cbf', '#80ffdb', '#03001c'],
    ['candy', '#ff4d6d', '#ff85a1', '#ffd6e0', '#240014'],
    ['forest', '#132a13', '#4f772d', '#ecf39e', '#081c15'],
    ['glacier', '#023e8a', '#48cae4', '#ffffff', '#001219'],
    ['matrix', '#003b00', '#00a000', '#b6ff00', '#001100'],
  ] as const)('resolves the %s palette across themes', (
    presetId,
    startColor,
    middleColor,
    endColor,
    background,
  ) => {
    const expected = { 'start-color': startColor, 'middle-color': middleColor, 'end-color': endColor, background }
    expect(resolvePixelSortColorPreset(presetId, 'light')).toEqual(expected)
    expect(resolvePixelSortColorPreset(presetId, 'dark')).toEqual(expected)
  })

  it('exposes ten action options and applies exactly the four active-theme color controls', () => {
    expect(PIXEL_SORT_COLOR_PRESET_OPTIONS.map((option) => option.value)).toEqual([
      'default',
      'vaporwave',
      'ocean',
      'ember',
      'mono',
      'aurora',
      'candy',
      'forest',
      'glacier',
      'matrix',
    ])
    const updates: Array<[string, string]> = []
    applyPixelSortColorPreset('default', 'dark', (controlId, value) => {
      updates.push([controlId, value])
    })

    expect(updates).toEqual(PIXEL_SORT_COLOR_CONTROL_IDS.map((controlId) => [
      controlId,
      resolvePixelSortColorPreset('default', 'dark')[controlId],
    ]))
  })
})
