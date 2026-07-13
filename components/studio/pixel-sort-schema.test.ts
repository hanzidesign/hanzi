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
      defaultValue: 'brightness',
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
    expect(createDefaultGrainradEffectControls()['pixel-sort']).toMatchObject({
      direction: 'horizontal',
      'sort-mode': 'brightness',
      threshold: 0.25,
      'streak-length': 100,
      intensity: 0.8,
      randomness: 0.3,
      reverse: false,
      brightness: 0,
      contrast: 0,
    })
  })
})
