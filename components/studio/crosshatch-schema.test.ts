import { describe, expect, it } from 'vitest'

import { createDefaultGrainradEffectControls, getGrainradEffectById } from './grainrad-effects'

describe('Grainrad Crosshatch schema', () => {
  it('publishes an independent renderer and exact group/control order', () => {
    const definition = getGrainradEffectById('crosshatch')
    expect(definition.renderer).toBe('crosshatch')
    expect(definition.settingGroups.map((group) => group.title)).toEqual([
      'Crosshatch', 'Adjustments', 'Color',
    ])
    expect(definition.settingGroups.flatMap((group) => group.controls.map((control) => control.id))).toEqual([
      'density', 'layers', 'angle', 'line-width', 'randomness', 'invert',
      'brightness', 'contrast', 'line-color', 'background',
    ])
  })

  it('matches every production default, range, step, label, and always-visible row', () => {
    const definition = getGrainradEffectById('crosshatch')
    const controls = Object.fromEntries(
      definition.settingGroups.flatMap((group) => group.controls).map((control) => [control.id, control]),
    )
    expect(controls.density).toMatchObject({ defaultValue: 6, min: 2, max: 12, step: 1 })
    expect(controls.layers).toMatchObject({ defaultValue: 3, min: 1, max: 4, step: 1 })
    expect(controls.angle).toMatchObject({ defaultValue: 45, min: 0, max: 90, step: 5, unit: '°' })
    expect(controls['line-width']).toMatchObject({ defaultValue: 0.15, min: 0.5, max: 3, step: 0.25 })
    expect(controls.randomness).toMatchObject({ defaultValue: 0, min: 0, max: 1, step: 0.05 })
    expect(controls.invert).toMatchObject({ kind: 'toggle', defaultValue: false })
    expect(controls.brightness).toMatchObject({ defaultValue: 0, min: -100, max: 100, step: 1 })
    expect(controls.contrast).toMatchObject({ defaultValue: 0, min: -100, max: 100, step: 1 })
    expect(controls['line-color']).toMatchObject({ kind: 'color', defaultValue: '#000000' })
    expect(controls.background).toMatchObject({ kind: 'color', defaultValue: '#ffffff' })
    expect(Object.values(controls).every((control) => control.visibleWhen === undefined)).toBe(true)
    expect(createDefaultGrainradEffectControls().crosshatch).toMatchObject({
      density: 6, layers: 3, angle: 45, 'line-width': 0.15, randomness: 0,
      invert: false, brightness: 0, contrast: 0, 'line-color': '#000000', background: '#ffffff',
    })
  })
})
