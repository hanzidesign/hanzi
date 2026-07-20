import { describe, expect, it } from 'vitest'
import {
  GRAINRAD_COMMON_POST_PROCESSING_GROUPS,
  createDefaultGrainradEffectControls,
  isGrainradControlVisible,
  type GrainradEffectControl,
} from './grainrad-effects'

const controls = GRAINRAD_COMMON_POST_PROCESSING_GROUPS.flatMap((group) => group.controls)

function control(id: string): GrainradEffectControl {
  const result = controls.find((entry) => entry.id === id)
  if (!result) {
    throw new Error(`Missing Post-Processing control: ${id}`)
  }

  return result
}

describe('Grainrad Post-Processing schema', () => {
  it('keeps the Grainrad effect and parameter order', () => {
    expect(GRAINRAD_COMMON_POST_PROCESSING_GROUPS).toHaveLength(7)
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
    expect(control('grain-intensity')).toMatchObject({ defaultValue: 5, min: 0, max: 200, step: 1 })
    expect(control('grain-mode')).toMatchObject({
      kind: 'select',
      label: 'Mode',
      defaultValue: 'noise',
      options: [{ value: 'noise', label: 'Noise' }, { value: 'pixel', label: 'Pixel' }],
    })
    expect(control('grain-size')).toMatchObject({ defaultValue: 2, min: 1, max: 10, step: 1 })
    expect(control('grain-speed')).toMatchObject({ defaultValue: 50, min: 1, max: 200, step: 1 })
    expect(control('chromatic-offset')).toMatchObject({ defaultValue: 5, min: 0, max: 50, step: 1 })
    expect(control('chromatic-offset')).toHaveProperty('unit', undefined)
    expect(control('scanline-opacity')).toMatchObject({ defaultValue: 0.5, min: 0, max: 1, step: 0.05 })
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
    expect(control('crt-amount')).toMatchObject({ defaultValue: 0.1, min: 0, max: 0.5, step: 0.01 })
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
    const defaults = createDefaultGrainradEffectControls().ascii

    for (const entry of controls.filter((candidate) => candidate.id !== 'bloom' && candidate.id !== 'grain'
      && candidate.id !== 'chromatic' && candidate.id !== 'scanlines'
      && candidate.id !== 'vignette' && candidate.id !== 'crt-curve' && candidate.id !== 'phosphor')) {
      expect(isGrainradControlVisible(entry, defaults), entry.id).toBe(false)
    }

    expect(isGrainradControlVisible(control('bloom-threshold'), { ...defaults, bloom: true })).toBe(true)
    expect(isGrainradControlVisible(control('grain-intensity'), { ...defaults, grain: true })).toBe(true)
    expect(isGrainradControlVisible(control('grain-mode'), { ...defaults, grain: true })).toBe(true)
    expect(isGrainradControlVisible(control('phosphor-color'), { ...defaults, phosphor: true })).toBe(true)
    expect(isGrainradControlVisible(control('phosphor-custom-color'), {
      ...defaults,
      phosphor: true,
      'phosphor-color': 'custom',
    })).toBe(true)
  })
})
