import { describe, expect, it } from 'vitest'

import { createDefaultGrainradEffectControls, getGrainradEffectById } from './grainrad-effects'

describe('Grainrad VHS schema', () => {
  it('publishes an independent renderer and exact group/control order', () => {
    const definition = getGrainradEffectById('vhs')

    expect(definition.renderer).toBe('vhs')
    expect(definition.settingGroups.map((group) => group.title)).toEqual(['VHS', 'Adjustments'])
    expect(definition.settingGroups.flatMap((group) => group.controls.map((control) => control.id))).toEqual([
      'distortion', 'noise', 'color-bleed', 'vhs-scanlines', 'tracking-error', 'brightness', 'contrast',
    ])
  })

  it('matches every production default/range and keeps effect Scanlines distinct from Post Scanlines', () => {
    const definition = getGrainradEffectById('vhs')
    const controls = Object.fromEntries(
      definition.settingGroups.flatMap((group) => group.controls).map((control) => [control.id, control]),
    )

    expect(controls.distortion).toMatchObject({ defaultValue: 0.5, min: 0, max: 1, step: 0.05 })
    expect(controls.noise).toMatchObject({ defaultValue: 0.3, min: 0, max: 1, step: 0.05 })
    expect(controls['color-bleed']).toMatchObject({ defaultValue: 0.5, min: 0, max: 1, step: 0.05 })
    expect(controls['vhs-scanlines']).toMatchObject({
      label: 'Scanlines', defaultValue: 0.3, min: 0, max: 1, step: 0.05,
    })
    expect(controls['tracking-error']).toMatchObject({ defaultValue: 0.2, min: 0, max: 1, step: 0.05 })
    expect(controls.brightness).toMatchObject({ defaultValue: 0, min: -100, max: 100, step: 1 })
    expect(controls.contrast).toMatchObject({ defaultValue: 0, min: -100, max: 100, step: 1 })
    expect(Object.values(controls).every((control) => control.visibleWhen === undefined)).toBe(true)
    expect(createDefaultGrainradEffectControls().vhs).toMatchObject({
      distortion: 0.5,
      noise: 0.3,
      'color-bleed': 0.5,
      'vhs-scanlines': 0.3,
      'tracking-error': 0.2,
      brightness: 0,
      contrast: 0,
      scanlines: false,
    })
  })
})
