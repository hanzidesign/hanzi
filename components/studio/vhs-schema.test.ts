import { describe, expect, it } from 'vitest'

import { createDefaultStudioEffectControls, getStudioEffectById } from './studio-effects'

describe('Studio VHS schema', () => {
  it('publishes an independent renderer and exact group/control order', () => {
    const definition = getStudioEffectById('vhs')

    expect(definition.renderer).toBe('vhs')
    expect(definition.settingGroups.map((group) => group.title)).toEqual(['VHS', 'Adjustments', 'Color'])
    expect(definition.settingGroups.flatMap((group) => group.controls.map((control) => control.id))).toEqual([
      'distortion', 'noise', 'vhs-scanlines', 'tracking-error', 'brightness', 'contrast', 'color-bleed',
      'chroma-blur', 'saturation', 'red-gain', 'green-gain', 'blue-gain',
      'background',
    ])
  })

  it('matches every production default/range and keeps effect Scanlines distinct from Post Scanlines', () => {
    const definition = getStudioEffectById('vhs')
    const controls = Object.fromEntries(
      definition.settingGroups.flatMap((group) => group.controls).map((control) => [control.id, control]),
    )

    expect(controls.distortion).toMatchObject({ defaultValue: 0.5, min: 0, max: 1, step: 0.05 })
    expect(controls.noise).toMatchObject({ defaultValue: 0.3, min: 0, max: 1, step: 0.05 })
    expect(controls['color-bleed']).toMatchObject({ defaultValue: 0.5, min: 0, max: 1, step: 0.05 })
    expect(controls['chroma-blur']).toMatchObject({ defaultValue: 0.3, min: 0, max: 1, step: 0.05 })
    expect(controls.saturation).toMatchObject({ defaultValue: 0.9, min: 0, max: 2, step: 0.05 })
    expect(controls['red-gain']).toMatchObject({ defaultValue: 1.1, min: 0, max: 2, step: 0.05 })
    expect(controls['green-gain']).toMatchObject({ defaultValue: 1, min: 0, max: 2, step: 0.05 })
    expect(controls['blue-gain']).toMatchObject({ defaultValue: 0.9, min: 0, max: 2, step: 0.05 })
    expect(controls.background).toMatchObject({
      kind: 'color',
      defaultValueByTheme: { light: '#f4f1e8', dark: '#101010' },
    })
    expect(controls['vhs-scanlines']).toMatchObject({
      label: 'Scanlines', defaultValue: 0.3, min: 0, max: 1, step: 0.05,
    })
    expect(controls['tracking-error']).toMatchObject({ defaultValue: 0.2, min: 0, max: 1, step: 0.05 })
    expect(controls.brightness).toMatchObject({ defaultValue: 0, min: -100, max: 100, step: 1 })
    expect(controls.contrast).toMatchObject({ defaultValue: 0, min: -100, max: 100, step: 1 })
    expect(controls['chroma-blur'].visibleWhen).toEqual({ controlId: 'color-bleed', operator: 'greater-than', value: 0 })
    expect(createDefaultStudioEffectControls().vhs).toMatchObject({
      distortion: 0.5,
      noise: 0.3,
      'color-bleed': 0.5,
      'chroma-blur': 0.3,
      saturation: 0.9,
      'red-gain': 1.1,
      'green-gain': 1,
      'blue-gain': 0.9,
      background: '#f4f1e8',
      'vhs-scanlines': 0.3,
      'tracking-error': 0.2,
      brightness: 0,
      contrast: 0,
      scanlines: false,
    })
  })
})
