import { describe, expect, it } from 'vitest'

import {
  createDefaultGrainradEffectControls,
  getGrainradEffectById,
  isGrainradControlVisible,
} from './grainrad-effects'

describe('Grainrad Threshold schema', () => {
  it('publishes an independent renderer and exact group/control order', () => {
    const definition = getGrainradEffectById('threshold')

    expect(definition.renderer).toBe('threshold')
    expect(definition.settingGroups.map((group) => group.title)).toEqual([
      'Threshold',
      'Adjustments',
      'Color',
    ])
    expect(definition.settingGroups.flatMap((group) => group.controls.map((control) => control.id))).toEqual([
      'levels',
      'threshold-point',
      'dither',
      'invert',
      'brightness',
      'contrast',
      'color-mode',
      'foreground',
      'background',
    ])
  })

  it('matches every option, default, range, step, and label', () => {
    const definition = getGrainradEffectById('threshold')
    const controls = Object.fromEntries(
      definition.settingGroups.flatMap((group) => group.controls).map((control) => [control.id, control]),
    )

    expect(controls.levels).toMatchObject({ defaultValue: 2, min: 2, max: 8, step: 1 })
    expect(controls['threshold-point']).toMatchObject({ defaultValue: 0.5, min: 0.1, max: 0.9, step: 0.05 })
    expect(controls.dither).toMatchObject({ kind: 'toggle', defaultValue: false })
    expect(controls.invert).toMatchObject({ kind: 'toggle', defaultValue: false })
    expect(controls.brightness).toMatchObject({ defaultValue: 0, min: -100, max: 100, step: 1 })
    expect(controls.contrast).toMatchObject({ defaultValue: 0, min: -100, max: 100, step: 1 })
    expect(controls['color-mode']).toMatchObject({
      kind: 'select',
      defaultValue: 'custom',
      options: [
        { value: 'custom', label: 'Mono' },
        { value: 'color', label: 'Original' },
      ],
    })
    expect(controls.foreground).toMatchObject({
      kind: 'color',
      defaultValue: '#ffffff',
      visibleWhen: { controlId: 'color-mode', operator: 'equals', value: 'custom' },
    })
    expect(controls.background).toMatchObject({
      kind: 'color',
      defaultValue: '#000000',
      visibleWhen: { controlId: 'color-mode', operator: 'equals', value: 'custom' },
    })
    expect(createDefaultGrainradEffectControls().threshold).toMatchObject({
      levels: 2,
      'threshold-point': 0.5,
      dither: false,
      invert: false,
      brightness: 0,
      contrast: 0,
      'color-mode': 'custom',
      foreground: '#000000',
      background: '#ffffff',
    })
  })

  it('shows Foreground and Background only in Mono/custom mode', () => {
    const definition = getGrainradEffectById('threshold')
    const controls = definition.settingGroups.flatMap((group) => group.controls)
    const defaults = createDefaultGrainradEffectControls().threshold
    const foreground = controls.find((control) => control.id === 'foreground')!
    const background = controls.find((control) => control.id === 'background')!

    expect(isGrainradControlVisible(foreground, defaults)).toBe(true)
    expect(isGrainradControlVisible(background, defaults)).toBe(true)
    expect(isGrainradControlVisible(foreground, { ...defaults, 'color-mode': 'color' })).toBe(false)
    expect(isGrainradControlVisible(background, { ...defaults, 'color-mode': 'color' })).toBe(false)
  })
})
