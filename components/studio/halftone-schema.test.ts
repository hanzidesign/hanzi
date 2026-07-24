import { describe, expect, it } from 'vitest'

import {
  createDefaultStudioEffectControls,
  getStudioEffectById,
  isStudioControlVisible,
} from './studio-effects'

describe('Studio Halftone schema', () => {
  it('publishes the independent Halftone renderer and current Studio controls', () => {
    const definition = getStudioEffectById('halftone')
    const controls = Object.fromEntries(
      definition.settingGroups.flatMap((group) => group.controls).map((control) => [control.id, control]),
    )

    expect(definition.renderer).toBe('halftone')
    expect(controls.shape).toMatchObject({
      kind: 'select',
      defaultValue: 'circle',
      options: [
        { value: 'circle', label: 'Circle' },
        { value: 'square', label: 'Square' },
        { value: 'diamond', label: 'Diamond' },
        { value: 'line', label: 'Line' },
      ],
    })
    expect(controls['dot-scale']).toMatchObject({ defaultValue: 1, min: 0.5, max: 2, step: 0.1 })
    expect(controls.spacing).toMatchObject({ defaultValue: 8, min: 1, max: 20, step: 1 })
    expect(controls.angle).toMatchObject({ defaultValue: 45, min: 0, max: 90, step: 5, unit: '°' })
    expect(controls.invert).toMatchObject({ kind: 'toggle', defaultValue: false })
    expect(controls.brightness).toMatchObject({ defaultValue: 0, min: -100, max: 100, step: 1 })
    expect(controls.contrast).toMatchObject({ defaultValue: 0, min: -100, max: 100, step: 1 })
    expect(controls['color-mode']).toMatchObject({
      defaultValue: 'mono',
      options: [
        { value: 'mono', label: 'Mono' },
        { value: 'color', label: 'Original' },
      ],
    })
  })

  it('shows Mono colors only in mono mode', () => {
    const definition = getStudioEffectById('halftone')
    const controls = definition.settingGroups.flatMap((group) => group.controls)
    const defaults = createDefaultStudioEffectControls().halftone
    const foreground = controls.find((control) => control.id === 'foreground')!
    const background = controls.find((control) => control.id === 'background')!

    expect(isStudioControlVisible(foreground, defaults)).toBe(true)
    expect(isStudioControlVisible(background, defaults)).toBe(true)
    expect(isStudioControlVisible(foreground, { ...defaults, 'color-mode': 'color' })).toBe(false)
    expect(isStudioControlVisible(background, { ...defaults, 'color-mode': 'color' })).toBe(false)
  })
})
