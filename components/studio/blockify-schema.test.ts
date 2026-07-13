import { describe, expect, it } from 'vitest'

import {
  createDefaultGrainradEffectControls,
  getGrainradEffectById,
  isGrainradControlVisible,
} from './grainrad-effects'

describe('Grainrad Blockify schema', () => {
  it('publishes an independent renderer and exact group/control order', () => {
    const definition = getGrainradEffectById('blockify')

    expect(definition.renderer).toBe('blockify')
    expect(definition.settingGroups.map((group) => group.title)).toEqual([
      'Blockify',
      'Adjustments',
      'Color',
    ])
    expect(definition.settingGroups.flatMap((group) => group.controls.map((control) => control.id))).toEqual([
      'style',
      'block-size',
      'border-width',
      'brightness',
      'contrast',
      'color-mode',
      'border-color',
    ])
  })

  it('matches every option, default, range, step, and label', () => {
    const definition = getGrainradEffectById('blockify')
    const controls = Object.fromEntries(
      definition.settingGroups.flatMap((group) => group.controls).map((control) => [control.id, control]),
    )

    expect(controls.style).toMatchObject({
      kind: 'select',
      defaultValue: 'full',
      options: [
        { value: 'full', label: 'Full Blocks' },
        { value: 'shaded', label: 'Shaded' },
        { value: 'outline', label: 'Outline' },
      ],
    })
    expect(controls['block-size']).toMatchObject({ defaultValue: 8, min: 4, max: 20, step: 1 })
    expect(controls['border-width']).toMatchObject({ defaultValue: 1, min: 0, max: 3, step: 0.5 })
    expect(controls.brightness).toMatchObject({ defaultValue: 0, min: -100, max: 100, step: 1 })
    expect(controls.contrast).toMatchObject({ defaultValue: 0, min: -100, max: 100, step: 1 })
    expect(controls['color-mode']).toMatchObject({
      kind: 'select',
      defaultValue: 'color',
      options: [
        { value: 'color', label: 'Preserve Colors' },
        { value: 'grayscale', label: 'Grayscale' },
      ],
    })
    expect(controls['border-color']).toMatchObject({
      kind: 'color',
      label: 'Border Color',
      defaultValue: '#000000',
      visibleWhen: { controlId: 'border-width', operator: 'greater-than', value: 0 },
    })
    expect(createDefaultGrainradEffectControls().blockify).toMatchObject({
      style: 'full',
      'block-size': 8,
      'border-width': 1,
      brightness: 0,
      contrast: 0,
      'color-mode': 'color',
      'border-color': '#000000',
    })
  })

  it('shows Border Color exactly when Border Width is positive, independent of style', () => {
    const definition = getGrainradEffectById('blockify')
    const borderColor = definition.settingGroups
      .flatMap((group) => group.controls)
      .find((control) => control.id === 'border-color')!
    const defaults = createDefaultGrainradEffectControls().blockify

    expect(isGrainradControlVisible(borderColor, defaults)).toBe(true)
    expect(isGrainradControlVisible(borderColor, { ...defaults, 'border-width': 0 })).toBe(false)
    expect(isGrainradControlVisible(borderColor, { ...defaults, style: 'full' })).toBe(true)
    expect(isGrainradControlVisible(borderColor, { ...defaults, style: 'shaded' })).toBe(true)
  })
})
