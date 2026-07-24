import { describe, expect, it } from 'vitest'

import {
  createDefaultStudioEffectControls,
  getStudioEffectById,
  isStudioControlVisible,
} from './studio-effects'

describe('Studio Contour schema', () => {
  it('publishes the independent renderer and exact group/control order', () => {
    const definition = getStudioEffectById('contour')

    expect(definition.renderer).toBe('contour')
    expect(definition.settingGroups.map((group) => group.title)).toEqual([
      'Contour',
      'Adjustments',
      'Color',
    ])
    expect(definition.settingGroups.flatMap((group) => group.controls.map((control) => control.id))).toEqual([
      'fill-mode',
      'levels',
      'line-thickness',
      'invert',
      'brightness',
      'contrast',
      'color-mode',
      'line-color',
      'background',
    ])
  })

  it('matches every Contour option, default, range, and step', () => {
    const definition = getStudioEffectById('contour')
    const controls = Object.fromEntries(
      definition.settingGroups.flatMap((group) => group.controls).map((control) => [control.id, control]),
    )

    expect(controls['fill-mode']).toMatchObject({
      kind: 'select',
      defaultValue: 'filled',
      options: [
        { value: 'filled', label: 'Filled Bands' },
        { value: 'lines', label: 'Lines Only' },
      ],
    })
    expect(controls.levels).toMatchObject({ defaultValue: 8, min: 3, max: 20, step: 1 })
    expect(controls['line-thickness']).toMatchObject({ defaultValue: 1, min: 0.5, max: 3, step: 0.25 })
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
    expect(controls['line-color']).toMatchObject({ kind: 'color', label: 'Line Color', defaultValue: '#000000' })
    expect(controls.background).toMatchObject({ kind: 'color', label: 'Background', defaultValue: '#ffffff' })
  })

  it('shows Line Color and Background only in Mono/custom mode', () => {
    const definition = getStudioEffectById('contour')
    const controls = definition.settingGroups.flatMap((group) => group.controls)
    const defaults = createDefaultStudioEffectControls().contour
    const lineColor = controls.find((control) => control.id === 'line-color')!
    const background = controls.find((control) => control.id === 'background')!

    expect(isStudioControlVisible(lineColor, defaults)).toBe(true)
    expect(isStudioControlVisible(background, defaults)).toBe(true)
    expect(isStudioControlVisible(lineColor, { ...defaults, 'color-mode': 'original' })).toBe(false)
    expect(isStudioControlVisible(background, { ...defaults, 'color-mode': 'original' })).toBe(false)
  })

  it('does not expose ASCII or guessed geometry controls', () => {
    const definition = getStudioEffectById('contour')
    const controlIds = definition.settingGroups.flatMap((group) =>
      group.controls.map((control) => control.id),
    )

    expect(controlIds).not.toContain('source-mode')
    expect(controlIds).not.toContain('line-style')
    expect(controlIds).not.toContain('character-set')
    expect(controlIds).not.toContain('custom-chars')
    expect(controlIds).not.toContain('character-scale')
    expect(controlIds).not.toContain('character-spacing')
  })
})
