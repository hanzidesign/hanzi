import { describe, expect, it } from 'vitest'

import { createDefaultGrainradEffectControls, getGrainradEffectById } from './grainrad-effects'

describe('Grainrad Voronoi schema', () => {
  it('publishes an independent renderer and exact group/control order', () => {
    const definition = getGrainradEffectById('voronoi')

    expect(definition.renderer).toBe('voronoi')
    expect(definition.settingGroups.map((group) => group.title)).toEqual(['Voronoi', 'Adjustments', 'Color'])
    expect(definition.settingGroups.flatMap((group) => group.controls.map((control) => control.id))).toEqual([
      'cell-size', 'edge-width', 'randomize', 'brightness', 'contrast',
      'cell-shadow', 'cell-midtone', 'cell-highlight', 'background', 'edge-color', 'fill-canvas',
    ])
  })

  it('matches every production default, range, enum option, and always-visible row', () => {
    const definition = getGrainradEffectById('voronoi')
    const controls = Object.fromEntries(
      definition.settingGroups.flatMap((group) => group.controls).map((control) => [control.id, control]),
    )

    expect(controls['cell-size']).toMatchObject({ defaultValue: 30, min: 10, max: 100, step: 5 })
    expect(controls['edge-width']).toMatchObject({ defaultValue: 0.3, min: 0, max: 1, step: 0.05 })
    expect(controls['cell-shadow']).toMatchObject({
      kind: 'color', defaultValueByTheme: { light: '#2b2d42', dark: '#101828' },
    })
    expect(controls['cell-midtone']).toMatchObject({
      kind: 'color', defaultValueByTheme: { light: '#6d597a', dark: '#00b4d8' },
    })
    expect(controls['cell-highlight']).toMatchObject({
      kind: 'color', defaultValueByTheme: { light: '#e9c46a', dark: '#ff4d8d' },
    })
    expect(controls.randomize).toMatchObject({ defaultValue: 0.8, min: 0, max: 1, step: 0.05 })
    expect(controls.brightness).toMatchObject({ defaultValue: 0, min: -100, max: 100, step: 1 })
    expect(controls.contrast).toMatchObject({ defaultValue: 0, min: -100, max: 100, step: 1 })
    expect(controls.background).toMatchObject({ kind: 'color', defaultValueByTheme: { light: '#ffffff', dark: '#000000' } })
    expect(controls['edge-color']).toMatchObject({
      kind: 'color', defaultValueByTheme: { light: '#101010', dark: '#f4f1e8' },
    })
    expect(controls['fill-canvas']).toMatchObject({ kind: 'toggle', defaultValue: false })
    expect(createDefaultGrainradEffectControls().voronoi).toMatchObject({
      'cell-size': 30, 'edge-width': 0.3, 'edge-color': '#101010',
      randomize: 0.8, brightness: 0, contrast: 0,
      'cell-shadow': '#2b2d42', 'cell-midtone': '#6d597a', 'cell-highlight': '#e9c46a',
      background: '#ffffff', 'fill-canvas': false,
    })
  })
})
