import { describe, expect, it } from 'vitest'

import {
  createDefaultStudioEffectControls,
  getStudioEffectById,
  isStudioControlVisible,
} from './studio-effects'

describe('Studio Blockify schema', () => {
  it('publishes an independent renderer and exact group/control order', () => {
    const definition = getStudioEffectById('blockify')

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
      'foreground',
      'background',
    ])
  })

  it('matches every option, default, range, step, and label', () => {
    const definition = getStudioEffectById('blockify')
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
      defaultValue: 'mono',
      options: [
        { value: 'mono', label: 'Mono' },
        { value: 'color', label: 'Preserve Colors' },
      ],
    })
    expect(controls.foreground).toMatchObject({
      kind: 'color',
      label: 'Foreground',
      defaultValue: '#ffffff',
      visibleWhen: { controlId: 'color-mode', operator: 'equals', value: 'mono' },
    })
    expect(controls.background).toMatchObject({
      kind: 'color',
      label: 'Background',
      defaultValue: '#000000',
      visibleWhen: { controlId: 'color-mode', operator: 'equals', value: 'mono' },
    })
    expect(createDefaultStudioEffectControls().blockify).toMatchObject({
      style: 'full',
      'block-size': 8,
      'border-width': 1,
      brightness: 0,
      contrast: 0,
      'color-mode': 'mono',
      foreground: '#101010',
      background: '#f4f1e8',
    })
  })

  it('shows Foreground and Background exactly in Mono mode', () => {
    const definition = getStudioEffectById('blockify')
    const foreground = definition.settingGroups
      .flatMap((group) => group.controls)
      .find((control) => control.id === 'foreground')!
    const background = definition.settingGroups
      .flatMap((group) => group.controls)
      .find((control) => control.id === 'background')!
    const defaults = createDefaultStudioEffectControls().blockify

    expect(isStudioControlVisible(foreground, defaults)).toBe(true)
    expect(isStudioControlVisible(background, defaults)).toBe(true)
    expect(isStudioControlVisible(foreground, { ...defaults, 'color-mode': 'color' })).toBe(false)
    expect(isStudioControlVisible(background, { ...defaults, 'color-mode': 'color' })).toBe(false)
  })
})
