import { describe, expect, it } from 'vitest'

import {
  createDefaultStudioEffectControls,
  getStudioEffectById,
  isStudioControlVisible,
} from './studio-effects'

describe('Studio Dots schema', () => {
  it('publishes the independent renderer and exact group/control order', () => {
    const definition = getStudioEffectById('dots')

    expect(definition.renderer).toBe('dots')
    expect(definition.settingGroups.map((group) => group.title)).toEqual([
      'Dots',
      'Adjustments',
      'Color',
    ])
    expect(definition.settingGroups.flatMap((group) => group.controls.map((control) => control.id))).toEqual([
      'shape',
      'grid-type',
      'size',
      'spacing',
      'invert',
      'brightness',
      'contrast',
      'color-mode',
      'foreground',
      'background',
    ])
  })

  it('matches every Dots option, default, range, and step', () => {
    const definition = getStudioEffectById('dots')
    const controls = Object.fromEntries(
      definition.settingGroups.flatMap((group) => group.controls).map((control) => [control.id, control]),
    )

    expect(controls.shape).toMatchObject({
      kind: 'select',
      defaultValue: 'circle',
      options: [
        { value: 'circle', label: 'Circle' },
        { value: 'square', label: 'Square' },
        { value: 'diamond', label: 'Diamond' },
      ],
    })
    expect(controls['grid-type']).toMatchObject({
      kind: 'select',
      defaultValue: 'square',
      options: [
        { value: 'square', label: 'Square Grid' },
        { value: 'hex', label: 'Hexagonal Grid' },
      ],
    })
    expect(controls.size).toMatchObject({ defaultValue: 1, min: 0.5, max: 2, step: 0.1 })
    expect(controls.spacing).toMatchObject({ defaultValue: 1, min: 0.5, max: 2, step: 0.1 })
    expect(controls.invert).toMatchObject({ kind: 'toggle', defaultValue: false })
    expect(controls.brightness).toMatchObject({ defaultValue: 0, min: -100, max: 100, step: 1 })
    expect(controls.contrast).toMatchObject({ defaultValue: 0, min: -100, max: 100, step: 1 })
    expect(controls['color-mode']).toMatchObject({
      kind: 'select',
      defaultValue: 'mono',
      options: [
        { value: 'mono', label: 'Mono' },
        { value: 'original', label: 'Original' },
      ],
    })
    expect(controls.foreground).toMatchObject({ kind: 'color', label: 'Dot Color', defaultValue: '#ffffff' })
    expect(controls.background).toMatchObject({ kind: 'color', label: 'Background', defaultValue: '#000000' })
  })

  it('shows Dot Color and Background only in Mono mode', () => {
    const definition = getStudioEffectById('dots')
    const controls = definition.settingGroups.flatMap((group) => group.controls)
    const defaults = createDefaultStudioEffectControls().dots
    const foreground = controls.find((control) => control.id === 'foreground')!
    const background = controls.find((control) => control.id === 'background')!

    expect(isStudioControlVisible(foreground, defaults)).toBe(true)
    expect(isStudioControlVisible(background, defaults)).toBe(true)
    expect(isStudioControlVisible(foreground, { ...defaults, 'color-mode': 'original' })).toBe(false)
    expect(isStudioControlVisible(background, { ...defaults, 'color-mode': 'original' })).toBe(false)
  })
})
