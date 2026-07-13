import { describe, expect, it } from 'vitest'

import {
  createDefaultGrainradEffectControls,
  getGrainradEffectById,
  isGrainradControlVisible,
} from './grainrad-effects'

describe('Grainrad Contour schema', () => {
  it('publishes the independent renderer and exact group/control order', () => {
    const definition = getGrainradEffectById('contour')

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
    const definition = getGrainradEffectById('contour')
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
      defaultValue: 'original',
      options: [
        { value: 'custom', label: 'Mono' },
        { value: 'original', label: 'Original' },
      ],
    })
    expect(controls['line-color']).toMatchObject({ kind: 'color', label: 'Line Color', defaultValue: '#000000' })
    expect(controls.background).toMatchObject({ kind: 'color', label: 'Background', defaultValue: '#ffffff' })
  })

  it('shows Line Color and Background only in Mono/custom mode', () => {
    const definition = getGrainradEffectById('contour')
    const controls = definition.settingGroups.flatMap((group) => group.controls)
    const defaults = createDefaultGrainradEffectControls().contour
    const lineColor = controls.find((control) => control.id === 'line-color')!
    const background = controls.find((control) => control.id === 'background')!

    expect(isGrainradControlVisible(lineColor, defaults)).toBe(false)
    expect(isGrainradControlVisible(background, defaults)).toBe(false)
    expect(isGrainradControlVisible(lineColor, { ...defaults, 'color-mode': 'custom' })).toBe(true)
    expect(isGrainradControlVisible(background, { ...defaults, 'color-mode': 'custom' })).toBe(true)
  })
})
