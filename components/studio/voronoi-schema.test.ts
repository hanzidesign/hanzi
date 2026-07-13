import { describe, expect, it } from 'vitest'

import { createDefaultGrainradEffectControls, getGrainradEffectById } from './grainrad-effects'

describe('Grainrad Voronoi schema', () => {
  it('publishes an independent renderer and exact group/control order', () => {
    const definition = getGrainradEffectById('voronoi')

    expect(definition.renderer).toBe('voronoi')
    expect(definition.settingGroups.map((group) => group.title)).toEqual(['Voronoi', 'Adjustments'])
    expect(definition.settingGroups.flatMap((group) => group.controls.map((control) => control.id))).toEqual([
      'cell-size', 'edge-width', 'edge-color', 'color-mode', 'randomize', 'brightness', 'contrast',
    ])
  })

  it('matches every production default, range, enum option, and always-visible row', () => {
    const definition = getGrainradEffectById('voronoi')
    const controls = Object.fromEntries(
      definition.settingGroups.flatMap((group) => group.controls).map((control) => [control.id, control]),
    )

    expect(controls['cell-size']).toMatchObject({ defaultValue: 30, min: 10, max: 100, step: 5 })
    expect(controls['edge-width']).toMatchObject({ defaultValue: 0.3, min: 0, max: 1, step: 0.05 })
    expect(controls['edge-color']).toMatchObject({
      defaultValue: '0',
      options: [
        { value: '0', label: 'Black' },
        { value: '1', label: 'White' },
        { value: '2', label: 'Darkened' },
      ],
    })
    expect(controls['color-mode']).toMatchObject({
      defaultValue: '0',
      options: [
        { value: '0', label: 'Cell Average' },
        { value: '1', label: 'Center Sample' },
        { value: '2', label: 'Gradient' },
      ],
    })
    expect(controls.randomize).toMatchObject({ defaultValue: 0.8, min: 0, max: 1, step: 0.05 })
    expect(controls.brightness).toMatchObject({ defaultValue: 0, min: -100, max: 100, step: 1 })
    expect(controls.contrast).toMatchObject({ defaultValue: 0, min: -100, max: 100, step: 1 })
    expect(Object.values(controls).every((control) => control.visibleWhen === undefined)).toBe(true)
    expect(createDefaultGrainradEffectControls().voronoi).toMatchObject({
      'cell-size': 30, 'edge-width': 0.3, 'edge-color': '0', 'color-mode': '0',
      randomize: 0.8, brightness: 0, contrast: 0,
    })
  })
})
