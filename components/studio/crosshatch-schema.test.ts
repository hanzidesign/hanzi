import { describe, expect, it } from 'vitest'

import { createDefaultGrainradEffectControls, getGrainradEffectById } from './grainrad-effects'

describe('Grainrad Crosshatch schema', () => {
  it('publishes an independent renderer and exact group/control order', () => {
    const definition = getGrainradEffectById('crosshatch')
    expect(definition.renderer).toBe('crosshatch')
    expect(definition.settingGroups.map((group) => group.title)).toEqual([
      'Crosshatch', 'Background Lines', 'Adjustments', 'Color',
    ])
    expect(definition.settingGroups.flatMap((group) => group.controls.map((control) => control.id))).toEqual([
      'density', 'layers', 'angle', 'line-width', 'randomness', 'invert',
      'background-density', 'background-layers', 'background-angle',
      'background-line-width', 'background-randomness', 'background-speed',
      'brightness', 'contrast', 'line-color', 'background',
    ])
  })

  it('matches every production default, range, step, label, and always-visible row', () => {
    const definition = getGrainradEffectById('crosshatch')
    const controls = Object.fromEntries(
      definition.settingGroups.flatMap((group) => group.controls).map((control) => [control.id, control]),
    )
    expect(controls.density).toMatchObject({ defaultValue: 6, min: 1, max: 50, step: 1 })
    expect(controls.layers).toMatchObject({ defaultValue: 3, min: 1, max: 4, step: 1 })
    expect(controls.angle).toMatchObject({ defaultValue: 45, min: 0, max: 90, step: 5, unit: '°' })
    expect(controls['line-width']).toMatchObject({
      defaultValue: 0.08,
      min: 0.01,
      max: 0.5,
      step: 0.01,
      displayScale: 100,
    })
    expect(controls.randomness).toMatchObject({ defaultValue: 0, min: 0, max: 1, step: 0.05 })
    expect(controls['background-density']).toMatchObject({ defaultValue: 12, min: 1, max: 50, step: 1 })
    expect(controls['background-layers']).toMatchObject({ defaultValue: 1, min: 1, max: 4, step: 1 })
    expect(controls['background-angle']).toMatchObject({ defaultValue: 45, min: 0, max: 90, step: 5, unit: '°' })
    expect(controls['background-line-width']).toMatchObject({
      defaultValue: 0.08,
      min: 0.01,
      max: 0.5,
      step: 0.01,
      displayScale: 100,
    })
    expect(controls['background-randomness']).toMatchObject({ defaultValue: 0, min: 0, max: 1, step: 0.05 })
    expect(controls['background-speed']).toMatchObject({ defaultValue: 0.1, min: 0, max: 10, step: 0.1 })
    expect(controls.invert).toMatchObject({ kind: 'toggle', defaultValue: false })
    expect(controls.brightness).toMatchObject({
      defaultValue: -4,
      defaultValueByTheme: { light: -15, dark: -4 },
      displayScaleByTheme: { light: 1, dark: -1 },
      min: -100,
      max: 100,
      step: 1,
    })
    expect(controls.contrast).toMatchObject({ defaultValue: 0, min: -100, max: 100, step: 1 })
    expect(controls['line-color']).toMatchObject({ kind: 'color', defaultValue: '#000000' })
    expect(controls.background).toMatchObject({ kind: 'color', defaultValue: '#ffffff' })
    expect(Object.values(controls).every((control) => control.visibleWhen === undefined)).toBe(true)
    expect(createDefaultGrainradEffectControls('light').crosshatch).toMatchObject({
      density: 6, layers: 3, angle: 45, 'line-width': 0.08, randomness: 0,
      'background-density': 12, 'background-layers': 1, 'background-angle': 45,
      'background-line-width': 0.08, 'background-randomness': 0, 'background-speed': 0.1,
      invert: false, brightness: -15, contrast: 0, 'line-color': '#000000', background: '#ffffff',
    })
    expect(createDefaultGrainradEffectControls('dark').crosshatch).toMatchObject({
      'background-density': 12,
      'background-layers': 1,
      'background-angle': 45,
      'background-line-width': 0.08,
      'background-randomness': 0,
      'background-speed': 0.1,
      'line-width': 0.08,
      brightness: -4,
      'line-color': '#ffffff',
      background: '#000000',
    })
  })
})
