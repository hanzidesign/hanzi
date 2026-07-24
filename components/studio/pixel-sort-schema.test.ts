import { describe, expect, it } from 'vitest'

import {
  createDefaultStudioEffectControls,
  getStudioEffectById,
} from './studio-effects'

describe('Studio Pixel Sort schema', () => {
  it('publishes the independent renderer and exact group/control order', () => {
    const definition = getStudioEffectById('pixel-sort')

    expect(definition.renderer).toBe('pixel-sort')
    expect(definition.settingGroups.map((group) => group.title)).toEqual([
      'Pixel Sort',
      'Adjustments',
      'Color',
    ])
    expect(definition.settingGroups.flatMap((group) => group.controls.map((control) => control.id))).toEqual([
      'direction',
      'sort-mode',
      'threshold',
      'streak-length',
      'intensity',
      'randomness',
      'reverse',
      'brightness',
      'contrast',
      'start-color',
      'middle-color',
      'end-color',
      'background',
      'mix',
    ])
  })

  it('matches every Pixel Sort option, default, range, and step', () => {
    const definition = getStudioEffectById('pixel-sort')
    const controls = Object.fromEntries(
      definition.settingGroups.flatMap((group) => group.controls).map((control) => [control.id, control]),
    )

    expect(controls.direction).toMatchObject({
      kind: 'select',
      defaultValue: 'horizontal',
      options: [
        { value: 'horizontal', label: 'Horizontal' },
        { value: 'vertical', label: 'Vertical' },
        { value: 'diagonal', label: '45°' },
        { value: 'anti-diagonal', label: '-45°' },
        { value: 'radial', label: 'Radial' },
      ],
    })
    expect(controls['sort-mode']).toMatchObject({
      kind: 'select',
      defaultValue: 'depth',
      options: [
        { value: 'brightness', label: 'Brightness' },
        { value: 'hue', label: 'Hue' },
        { value: 'saturation', label: 'Saturation' },
        { value: 'depth', label: 'Depth' },
      ],
    })
    expect(controls.threshold).toMatchObject({ defaultValue: 0.25, min: 0, max: 0.5, step: 0.05 })
    expect(controls['streak-length']).toMatchObject({ defaultValue: 500, min: 1, max: 2000, step: 1 })
    expect(controls.intensity).toMatchObject({ defaultValue: 1, min: 0, max: 2, step: 0.05 })
    expect(controls.randomness).toMatchObject({ defaultValue: 0.5, min: 0, max: 5, step: 0.1 })
    expect(controls.reverse).toMatchObject({ kind: 'toggle', defaultValue: false })
    expect(controls.brightness).toMatchObject({ defaultValue: 0, min: -100, max: 100, step: 1 })
    expect(controls.contrast).toMatchObject({ defaultValue: 0, min: -100, max: 100, step: 1 })
    expect(controls.mix).toMatchObject({ defaultValue: 1, min: 0, max: 2, step: 0.05 })
    expect(controls['start-color']).toMatchObject({
      kind: 'color',
      label: 'Start Color',
      defaultValueByTheme: { light: '#35115c', dark: '#1b0836' },
    })
    expect(controls['middle-color']).toMatchObject({
      kind: 'color', label: 'Middle Color', defaultValueByTheme: { light: '#c93472', dark: '#ff5a9d' },
    })
    expect(controls['end-color']).toMatchObject({
      kind: 'color', label: 'End Color', defaultValueByTheme: { light: '#e6a928', dark: '#ffe08a' },
    })
    expect(controls.background).toMatchObject({
      kind: 'color',
      defaultValueByTheme: { light: '#ffffff', dark: '#000000' },
    })
    expect(createDefaultStudioEffectControls()['pixel-sort']).toMatchObject({
      direction: 'horizontal',
      'sort-mode': 'depth',
      threshold: 0.25,
      'streak-length': 500,
      intensity: 1,
      randomness: 0.5,
      reverse: false,
      brightness: 0,
      contrast: 0,
      'start-color': '#35115c',
      'middle-color': '#c93472',
      'end-color': '#e6a928',
      background: '#ffffff',
      mix: 1,
    })
    expect(controls).not.toHaveProperty('shadow')
    expect(controls).not.toHaveProperty('midtone')
    expect(controls).not.toHaveProperty('highlight')
  })
})
