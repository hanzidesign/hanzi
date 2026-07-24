import { describe, expect, it } from 'vitest'

import {
  createDefaultStudioEffectControls,
  getStudioEffectById,
  isStudioControlVisible,
} from './studio-effects'

describe('Studio Edge Detection schema', () => {
  it('publishes an independent renderer and exact group/control order', () => {
    const definition = getStudioEffectById('edge-detection')

    expect(definition.renderer).toBe('edge-detection')
    expect(definition.settingGroups.map((group) => group.title)).toEqual([
      'Edge Detection',
      'Adjustments',
      'Color',
    ])
    expect(definition.settingGroups.flatMap((group) => group.controls.map((control) => control.id))).toEqual([
      'algorithm',
      'threshold',
      'line-width',
      'invert',
      'brightness',
      'contrast',
      'color-mode',
      'edge-color',
      'background',
    ])
  })

  it('matches every option, default, range, step, and label', () => {
    const definition = getStudioEffectById('edge-detection')
    const controls = Object.fromEntries(
      definition.settingGroups.flatMap((group) => group.controls).map((control) => [control.id, control]),
    )

    expect(controls.algorithm).toMatchObject({
      kind: 'select',
      defaultValue: 'sobel',
      options: [
        { value: 'sobel', label: 'Sobel' },
        { value: 'prewitt', label: 'Prewitt' },
        { value: 'laplacian', label: 'Laplacian' },
      ],
    })
    expect(controls.threshold).toMatchObject({ defaultValue: 0.3, min: 0.1, max: 0.8, step: 0.05 })
    expect(controls['line-width']).toMatchObject({ defaultValue: 1, min: 0.5, max: 4, step: 0.5 })
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
    expect(controls['edge-color']).toMatchObject({
      kind: 'color',
      defaultValue: '#ffffff',
      visibleWhen: { controlId: 'color-mode', operator: 'equals', value: 'mono' },
    })
    expect(controls.background).toMatchObject({
      kind: 'color',
      defaultValue: '#000000',
      visibleWhen: { controlId: 'color-mode', operator: 'equals', value: 'mono' },
    })
    expect(createDefaultStudioEffectControls()['edge-detection']).toMatchObject({
      algorithm: 'sobel',
      threshold: 0.3,
      'line-width': 1,
      invert: false,
      brightness: 0,
      contrast: 0,
      'color-mode': 'mono',
      'edge-color': '#000000',
      background: '#ffffff',
    })
  })

  it('hides both color pickers in Original while preserving their stored values', () => {
    const definition = getStudioEffectById('edge-detection')
    const controls = definition.settingGroups.flatMap((group) => group.controls)
    const defaults = createDefaultStudioEffectControls()['edge-detection']
    const edgeColor = controls.find((control) => control.id === 'edge-color')!
    const background = controls.find((control) => control.id === 'background')!

    expect(isStudioControlVisible(edgeColor, defaults)).toBe(true)
    expect(isStudioControlVisible(background, defaults)).toBe(true)
    expect(isStudioControlVisible(edgeColor, { ...defaults, 'color-mode': 'original' })).toBe(false)
    expect(isStudioControlVisible(background, { ...defaults, 'color-mode': 'original' })).toBe(false)
  })
})
