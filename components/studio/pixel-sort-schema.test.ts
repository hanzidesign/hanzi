import { describe, expect, it } from 'vitest'

import {
  createDefaultGrainradEffectControls,
  getGrainradEffectById,
} from './grainrad-effects'

describe('Grainrad Pixel Sort schema', () => {
  it('publishes the independent renderer and exact group/control order', () => {
    const definition = getGrainradEffectById('pixel-sort')

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
      'highlight',
      'midtone',
      'shadow',
      'background',
      'mix',
    ])
  })

  it('matches every Pixel Sort option, default, range, and step', () => {
    const definition = getGrainradEffectById('pixel-sort')
    const controls = Object.fromEntries(
      definition.settingGroups.flatMap((group) => group.controls).map((control) => [control.id, control]),
    )

    expect(controls.direction).toMatchObject({
      kind: 'select',
      defaultValue: 'horizontal',
      options: [
        { value: 'horizontal', label: 'Horizontal' },
        { value: 'vertical', label: 'Vertical' },
        { value: 'diagonal', label: 'Diagonal' },
      ],
    })
    expect(controls['sort-mode']).toMatchObject({
      kind: 'select',
      defaultValue: 'hue',
      options: [
        { value: 'brightness', label: 'Brightness' },
        { value: 'hue', label: 'Hue' },
        { value: 'saturation', label: 'Saturation' },
      ],
    })
    expect(controls.threshold).toMatchObject({ defaultValue: 0.25, min: 0, max: 0.5, step: 0.05 })
    expect(controls['streak-length']).toMatchObject({ defaultValue: 100, min: 10, max: 300, step: 10 })
    expect(controls.intensity).toMatchObject({ defaultValue: 0.8, min: 0, max: 1, step: 0.05 })
    expect(controls.randomness).toMatchObject({ defaultValue: 0.3, min: 0, max: 1, step: 0.05 })
    expect(controls.reverse).toMatchObject({ kind: 'toggle', defaultValue: false })
    expect(controls.brightness).toMatchObject({ defaultValue: 0, min: -100, max: 100, step: 1 })
    expect(controls.contrast).toMatchObject({ defaultValue: 0, min: -100, max: 100, step: 1 })
    expect(controls.mix).toMatchObject({ defaultValue: 1, min: 0, max: 2, step: 0.05 })
    expect(controls.shadow).toMatchObject({
      kind: 'color',
      defaultValueByTheme: { light: '#35115c', dark: '#1b0836' },
    })
    expect(controls.midtone).toMatchObject({
      kind: 'color', defaultValueByTheme: { light: '#c93472', dark: '#ff5a9d' },
    })
    expect(controls.highlight).toMatchObject({
      kind: 'color', defaultValueByTheme: { light: '#e6a928', dark: '#ffe08a' },
    })
    expect(controls.background).toMatchObject({
      kind: 'color',
      defaultValueByTheme: { light: '#ffffff', dark: '#000000' },
    })
    expect(createDefaultGrainradEffectControls()['pixel-sort']).toMatchObject({
      direction: 'horizontal',
      'sort-mode': 'hue',
      threshold: 0.25,
      'streak-length': 100,
      intensity: 0.8,
      randomness: 0.3,
      reverse: false,
      brightness: 0,
      contrast: 0,
      highlight: '#e6a928',
      midtone: '#c93472',
      shadow: '#35115c',
      background: '#ffffff',
      mix: 1,
    })
  })
})
