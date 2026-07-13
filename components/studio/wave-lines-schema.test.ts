import { describe, expect, it } from 'vitest'

import { createDefaultGrainradEffectControls, getGrainradEffectById } from './grainrad-effects'

describe('Grainrad Wave Lines schema', () => {
  it('publishes an independent renderer and exact group/control order', () => {
    const definition = getGrainradEffectById('wave-lines')

    expect(definition.renderer).toBe('wave-lines')
    expect(definition.settingGroups.map((group) => group.title)).toEqual([
      'Wave Lines', 'Adjustments', 'Color',
    ])
    expect(definition.settingGroups.flatMap((group) => group.controls.map((control) => control.id))).toEqual([
      'line-count', 'amplitude', 'frequency', 'line-thickness', 'direction', 'animate',
      'brightness', 'contrast', 'color-mode', 'line-color', 'background',
    ])
  })

  it('matches every production default, range, option, and conditional color row', () => {
    const definition = getGrainradEffectById('wave-lines')
    const controls = Object.fromEntries(
      definition.settingGroups.flatMap((group) => group.controls).map((control) => [control.id, control]),
    )

    expect(controls['line-count']).toMatchObject({ defaultValue: 50, min: 10, max: 150, step: 5 })
    expect(controls.amplitude).toMatchObject({ defaultValue: 20, min: 5, max: 50, step: 1 })
    expect(controls.frequency).toMatchObject({ defaultValue: 1, min: 0.5, max: 3, step: 0.1 })
    expect(controls['line-thickness']).toMatchObject({ defaultValue: 0.4, min: 0.5, max: 3, step: 0.1 })
    expect(controls.direction).toMatchObject({
      defaultValue: 'horizontal',
      options: [
        { value: 'horizontal', label: 'Horizontal' },
        { value: 'vertical', label: 'Vertical' },
      ],
    })
    expect(controls.animate).toMatchObject({ kind: 'toggle', defaultValue: true })
    expect(controls.brightness).toMatchObject({ defaultValue: 0, min: -100, max: 100, step: 1 })
    expect(controls.contrast).toMatchObject({ defaultValue: 0, min: -100, max: 100, step: 1 })
    expect(controls['color-mode']).toMatchObject({
      defaultValue: 'original',
      options: [
        { value: 'custom', label: 'Mono' },
        { value: 'original', label: 'Original' },
      ],
    })
    for (const id of ['line-color', 'background']) {
      expect(controls[id]).toMatchObject({
        kind: 'color',
        visibleWhen: { controlId: 'color-mode', operator: 'equals', value: 'custom' },
      })
    }
    expect(controls['line-color']).toMatchObject({ defaultValue: '#ffffff' })
    expect(controls.background).toMatchObject({ defaultValue: '#000000' })
    expect(createDefaultGrainradEffectControls()['wave-lines']).toMatchObject({
      'line-count': 50,
      amplitude: 20,
      frequency: 1,
      'line-thickness': 0.4,
      direction: 'horizontal',
      animate: true,
      brightness: 0,
      contrast: 0,
      'color-mode': 'original',
      'line-color': '#000000',
      background: '#ffffff',
    })
  })
})
