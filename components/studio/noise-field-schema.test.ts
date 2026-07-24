import { describe, expect, it } from 'vitest'

import { createDefaultStudioEffectControls, getStudioEffectById } from './studio-effects'

describe('Studio Noise Field schema', () => {
  it('publishes an independent renderer and exact group/control order', () => {
    const definition = getStudioEffectById('noise-field')

    expect(definition.renderer).toBe('noise-field')
    expect(definition.settingGroups.map((group) => group.title)).toEqual(['Noise Field', 'Adjustments', 'Color'])
    expect(definition.settingGroups.flatMap((group) => group.controls.map((control) => control.id))).toEqual([
      'noise-type', 'scale', 'intensity', 'octaves', 'speed', 'animate', 'distort-only',
      'brightness', 'contrast', 'foreground', 'background',
    ])
  })

  it('matches every production default, range, option, and always-visible row', () => {
    const definition = getStudioEffectById('noise-field')
    const controls = Object.fromEntries(
      definition.settingGroups.flatMap((group) => group.controls).map((control) => [control.id, control]),
    )

    expect(controls['noise-type']).toMatchObject({
      defaultValue: 'perlin',
      options: [
        { value: 'perlin', label: 'Perlin' },
        { value: 'simplex', label: 'Simplex' },
        { value: 'worley', label: 'Worley' },
      ],
    })
    expect(controls.scale).toMatchObject({ defaultValue: 50, min: 10, max: 100, step: 5 })
    expect(controls.intensity).toMatchObject({ defaultValue: 1, min: 0.5, max: 3, step: 0.1 })
    expect(controls.octaves).toMatchObject({ defaultValue: 4, min: 1, max: 8, step: 1 })
    expect(controls.speed).toMatchObject({ defaultValue: 1, min: 0.1, max: 3, step: 0.1 })
    expect(controls.animate).toMatchObject({ kind: 'toggle', defaultValue: true })
    expect(controls['distort-only']).toMatchObject({ kind: 'toggle', defaultValue: true })
    expect(controls.brightness).toMatchObject({ defaultValue: 0, min: -100, max: 100, step: 1 })
    expect(controls.contrast).toMatchObject({ defaultValue: 0, min: -100, max: 100, step: 1 })
    expect(controls.foreground).toMatchObject({
      kind: 'color', defaultValue: '#ffffff',
      defaultValueByTheme: { light: '#ffffff', dark: '#ffffff' },
    })
    expect(controls.background).toMatchObject({
      kind: 'color', defaultValue: '#000000',
      defaultValueByTheme: { light: '#000000', dark: '#000000' },
    })
    expect(Object.values(controls).every((control) => control.visibleWhen === undefined)).toBe(true)
    expect(createDefaultStudioEffectControls()['noise-field']).toMatchObject({
      'noise-type': 'perlin', scale: 50, intensity: 1, octaves: 4, speed: 1,
      animate: true, 'distort-only': true, brightness: 0, contrast: 0,
      foreground: '#ffffff', background: '#000000',
    })
  })
})
