import { describe, expect, it } from 'vitest'
import {
  STUDIO_COMMON_POST_PROCESSING_GROUPS,
  createDefaultStudioEffectControls,
  isStudioControlVisible,
  type StudioEffectControl,
} from './studio-effects'

const controls = STUDIO_COMMON_POST_PROCESSING_GROUPS.flatMap((group) => group.controls)

function control(id: string): StudioEffectControl {
  const result = controls.find((entry) => entry.id === id)
  if (!result) {
    throw new Error(`Missing Post-Processing control: ${id}`)
  }

  return result
}

describe('Studio Post-Processing schema', () => {
  it('keeps the Studio effect and parameter order', () => {
    expect(STUDIO_COMMON_POST_PROCESSING_GROUPS).toHaveLength(7)
    expect(controls.map((entry) => entry.id)).toEqual([
      'bloom', 'bloom-threshold', 'bloom-soft-threshold', 'bloom-intensity', 'bloom-radius',
      'grain', 'grain-mode', 'grain-intensity', 'grain-size', 'grain-speed',
      'chromatic', 'chromatic-offset',
      'scanlines', 'scanline-opacity', 'scanline-spacing', 'scanline-offset',
      'scanline-speed', 'scanline-direction',
      'vignette', 'vignette-intensity', 'vignette-radius',
      'crt-curve', 'crt-amount',
      'phosphor', 'phosphor-color', 'phosphor-custom-color',
    ])
  })

  it('publishes exact ranges, defaults, and Phosphor options', () => {
    expect(control('bloom-threshold')).toMatchObject({ defaultValue: 0.5, min: 0, max: 1, step: 0.05 })
    expect(control('bloom-soft-threshold')).toMatchObject({ defaultValue: 0.2, min: 0, max: 1, step: 0.05 })
    expect(control('bloom-intensity')).toMatchObject({ defaultValue: 1.5, min: 0, max: 2, step: 0.1 })
    expect(control('bloom-radius')).toMatchObject({ defaultValue: 12, min: 1, max: 20, step: 1 })
    expect(control('grain-intensity')).toMatchObject({ defaultValue: 1, min: 0, max: 200, step: 1 })
    expect(control('grain-mode')).toMatchObject({
      kind: 'select',
      label: 'Mode',
      defaultValue: 'noise',
      options: [{ value: 'noise', label: 'Noise' }, { value: 'pixel', label: 'Pixel' }],
    })
    expect(control('grain-size')).toMatchObject({ defaultValue: 2, min: 1, max: 10, step: 1 })
    expect(control('grain-speed')).toMatchObject({ defaultValue: 50, min: 1, max: 200, step: 1 })
    expect(control('chromatic-offset')).toMatchObject({ defaultValue: 5, min: 0, max: 100, step: 1 })
    expect(control('chromatic-offset')).toHaveProperty('unit', undefined)
    expect(control('scanline-opacity')).toMatchObject({ defaultValue: 0.2, min: 0, max: 1, step: 0.05 })
    expect(control('scanline-spacing')).toMatchObject({
      label: 'Line', defaultValue: 80, min: 1, max: 1000, step: 1, unit: undefined,
    })
    expect(control('scanline-offset')).toMatchObject({
      kind: 'range', label: 'Offset', defaultValue: 0, min: 0, max: 20, step: 1, unit: undefined,
    })
    expect(control('scanline-direction')).toMatchObject({
      kind: 'select', label: 'Direction', defaultValue: 'down',
      options: [{ value: 'up', label: 'Up' }, { value: 'down', label: 'Down' }],
    })
    expect(control('scanline-speed')).toMatchObject({
      kind: 'range', label: 'Speed', defaultValue: 1, min: 1, max: 10, step: 0.1,
    })
    expect(control('vignette-intensity')).toMatchObject({ defaultValue: 0.5, min: 0, max: 1, step: 0.05 })
    expect(control('vignette-radius')).toMatchObject({ defaultValue: 0.5, min: 0, max: 1, step: 0.05 })
    const crtAmount = control('crt-amount')
    expect(crtAmount).toMatchObject({
      kind: 'range',
      defaultValue: 0.1,
      min: 0,
      max: 0.5,
      step: 0.01,
      displayScale: 100,
    })
    if (crtAmount.kind !== 'range') {
      throw new Error('CRT Amount must be a range control')
    }
    expect({
      defaultValue: crtAmount.defaultValue * (crtAmount.displayScale ?? 1),
      min: crtAmount.min * (crtAmount.displayScale ?? 1),
      max: crtAmount.max * (crtAmount.displayScale ?? 1),
      step: crtAmount.step * (crtAmount.displayScale ?? 1),
    }).toEqual({ defaultValue: 10, min: 0, max: 50, step: 1 })
    expect(control('phosphor-color')).toMatchObject({
      kind: 'select',
      defaultValue: 'green',
      options: [
        { value: 'green', label: 'Green' },
        { value: 'amber', label: 'Amber' },
        { value: 'white', label: 'White' },
        { value: 'custom', label: 'Custom' },
      ],
    })
    expect(control('phosphor-custom-color')).toMatchObject({
      kind: 'color',
      label: 'Custom',
      defaultValue: '#00ff00',
      defaultValueByTheme: { light: '#00ff00', dark: '#00ff00' },
    })
  })

  it('hides parameters until their parent effect is enabled', () => {
    const defaults = createDefaultStudioEffectControls().ascii

    for (const entry of controls.filter((candidate) => candidate.id !== 'bloom' && candidate.id !== 'grain'
      && candidate.id !== 'chromatic' && candidate.id !== 'scanlines'
      && candidate.id !== 'vignette' && candidate.id !== 'crt-curve' && candidate.id !== 'phosphor')) {
      expect(isStudioControlVisible(entry, defaults), entry.id).toBe(false)
    }

    expect(isStudioControlVisible(control('bloom-threshold'), { ...defaults, bloom: true })).toBe(true)
    expect(isStudioControlVisible(control('grain-intensity'), { ...defaults, grain: true })).toBe(true)
    expect(isStudioControlVisible(control('grain-mode'), { ...defaults, grain: true })).toBe(true)
    expect(isStudioControlVisible(control('crt-amount'), { ...defaults, 'crt-curve': true })).toBe(true)
    expect(isStudioControlVisible(control('phosphor-color'), { ...defaults, phosphor: true })).toBe(true)
    expect(isStudioControlVisible(control('phosphor-custom-color'), {
      ...defaults,
      phosphor: true,
      'phosphor-color': 'custom',
    })).toBe(true)
  })
})
