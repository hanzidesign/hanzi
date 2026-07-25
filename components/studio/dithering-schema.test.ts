import { describe, expect, it } from 'vitest'

import {
  createDefaultStudioEffectControls,
  getStudioEffectById,
  isStudioControlVisible,
} from './studio-effects'

describe('Studio Dithering schema', () => {
  it('publishes the Dithering renderer and Studio core control contract', () => {
    const definition = getStudioEffectById('dithering')
    const controls = Object.fromEntries(
      definition.settingGroups.flatMap((group) => group.controls).map((control) => [control.id, control]),
    )

    expect(definition.renderer).toBe('dithering')
    expect(controls.intensity).toMatchObject({
      kind: 'range',
      defaultValue: 1,
      min: 0.1,
      max: 2,
      step: 0.05,
    })
    const algorithm = controls.algorithm
    expect(algorithm).toMatchObject({
      kind: 'select',
      defaultValue: 'bayer-8x8',
      options: [
        { value: 'floyd-steinberg', label: 'Diffusion' },
        { value: 'bayer-2x2', label: 'Bayer 2x2' },
        { value: 'bayer-4x4', label: 'Bayer 4x4' },
        { value: 'bayer-8x8', label: 'Bayer 8x8' },
        { value: 'bayer-16x16', label: 'Bayer 16x16' },
        { value: 'clustered-dot', label: 'Clustered Dot' },
        { value: 'interleaved-gradient', label: 'Interleaved Gradient' },
      ],
    })
    if (algorithm.kind !== 'select') throw new Error('Dithering Algorithm must be a select control')
    const algorithmOptions = algorithm.options
    expect(algorithmOptions).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ value: 'atkinson' }),
      expect.objectContaining({ value: 'jarvis-judice-ninke' }),
      expect.objectContaining({ value: 'stucki' }),
      expect.objectContaining({ value: 'burkes' }),
      expect.objectContaining({ value: 'sierra' }),
      expect.objectContaining({ value: 'sierra-two-row' }),
      expect.objectContaining({ value: 'sierra-lite' }),
    ]))
    expect(controls['matrix-size']).toMatchObject({
      kind: 'select',
      defaultValue: '4',
      options: [
        { value: '2', label: '2x2 (Coarse)' },
        { value: '4', label: '4x4 (Medium)' },
        { value: '8', label: '8x8 (Fine)' },
        { value: '16', label: '16x16 (Very Fine)' },
      ],
      visibleWhen: {
        controlId: 'algorithm',
        operator: 'in',
        values: ['bayer-2x2', 'bayer-4x4', 'bayer-8x8', 'bayer-16x16', 'clustered-dot'],
      },
    })
    expect(controls['max-displace']).toMatchObject({
      min: 0, max: 50, step: 1,
      visibleWhen: { controlId: 'chromatic-enabled', operator: 'equals', value: true },
    })
    expect(controls['red-channel']).toMatchObject({
      min: 0, max: 360, step: 1,
      visibleWhen: { controlId: 'chromatic-enabled', operator: 'equals', value: true },
    })
    expect(controls['green-channel']).toMatchObject({
      min: 0, max: 360, step: 1,
      visibleWhen: { controlId: 'chromatic-enabled', operator: 'equals', value: true },
    })
    expect(controls['blue-channel']).toMatchObject({
      min: 0, max: 360, step: 1,
      visibleWhen: { controlId: 'chromatic-enabled', operator: 'equals', value: true },
    })
  })

  it('publishes every dynamic Dithering control with its effect-local visibility rule', () => {
    const definition = getStudioEffectById('dithering')
    const controls = Object.fromEntries(
      definition.settingGroups.flatMap((group) => group.controls).map((control) => [control.id, control]),
    )

    expect(controls.levels).toMatchObject({
      kind: 'range', defaultValue: 2, min: 2, max: 32, step: 1,
      visibleWhen: { controlId: 'color-mode', operator: 'in', values: ['tonal', 'rgb'] },
    })
    expect(controls['mod-type']).toMatchObject({
      kind: 'select', defaultValue: 'wave',
      options: [
        { value: 'wave', label: 'Wave' },
        { value: 'grid', label: 'Grid' },
        { value: 'radial', label: 'Radial' },
        { value: 'horizontal', label: 'Horizontal' },
        { value: 'rgb-split', label: 'RGB Split' },
      ],
      visibleWhen: { controlId: 'modulation', operator: 'equals', value: true },
    })
    expect(controls['mod-frequency']).toMatchObject({
      defaultValue: 10, min: 0, max: 100, step: 1,
      visibleWhen: { controlId: 'modulation', operator: 'equals', value: true },
    })
    expect(controls['mod-amplitude']).toMatchObject({
      defaultValue: 3, min: 0, max: 10, step: 0.1,
      visibleWhen: { controlId: 'modulation', operator: 'equals', value: true },
    })
    expect(controls['mod-speed']).toMatchObject({
      defaultValue: 1, min: 0, max: 50, step: 0.1,
      visibleWhen: { controlId: 'modulation', operator: 'equals', value: true },
    })

    const directionContracts = {
      'mod-wave-direction': { type: 'wave', defaultValue: 'left', options: [
        { value: 'left', label: 'Left' }, { value: 'right', label: 'Right' },
      ] },
      'mod-grid-direction': { type: 'grid', defaultValue: 'down-left', options: [
        { value: 'down-left', label: 'Down Left' }, { value: 'up-right', label: 'Up Right' },
      ] },
      'mod-radial-direction': { type: 'radial', defaultValue: 'outward', options: [
        { value: 'outward', label: 'Outward' }, { value: 'inward', label: 'Inward' },
      ] },
      'mod-horizontal-direction': { type: 'horizontal', defaultValue: 'down', options: [
        { value: 'down', label: 'Down' }, { value: 'up', label: 'Up' },
      ] },
      'mod-rgb-split-direction': { type: 'rgb-split', defaultValue: 'up-left', options: [
        { value: 'up-left', label: 'Up Left' }, { value: 'down-right', label: 'Down Right' },
      ] },
    }

    for (const [id, contract] of Object.entries(directionContracts)) {
      expect(controls[id]).toMatchObject({
        kind: 'select',
        label: 'Direction',
        defaultValue: contract.defaultValue,
        options: contract.options,
        visibleWhen: { all: [
          { controlId: 'modulation', operator: 'equals', value: true },
          { controlId: 'mod-type', operator: 'equals', value: contract.type },
        ] },
      })
    }

    expect(controls.palette).toMatchObject({
      kind: 'select', defaultValue: 'gameboy-4',
      visibleWhen: { controlId: 'color-mode', operator: 'equals', value: 'palette' },
    })
    expect(controls.palette).toHaveProperty('options', [
      { value: 'gameboy-4', label: 'GameBoy 4', meta: 'Retro Gaming' },
      { value: 'cga-16', label: 'CGA 16', meta: 'Retro Gaming' },
      { value: 'nes-54', label: 'NES 54', meta: 'Retro Gaming' },
      { value: 'pico-8-16', label: 'PICO-8 16', meta: 'Retro Gaming' },
      { value: 'c64-16', label: 'C64 16', meta: 'Retro Gaming' },
      { value: 'apple-ii-16', label: 'Apple II 16', meta: 'Retro Gaming' },
      { value: 'macintosh-16', label: 'Macintosh 16', meta: 'Retro Gaming' },
      { value: 'sepia-5', label: 'Sepia 5', meta: 'Artistic' },
      { value: 'cyberpunk-6', label: 'Cyberpunk 6', meta: 'Artistic' },
      { value: 'newspaper-2', label: 'Newspaper 2', meta: 'Print' },
      { value: 'risograph-5', label: 'Risograph 5', meta: 'Print' },
      { value: 'custom', label: 'Custom', meta: 'Custom' },
    ])
    expect(controls.foreground).toMatchObject({
      defaultValue: '#ffffff',
      visibleWhen: { controlId: 'color-mode', operator: 'in', values: ['mono', 'tonal'] },
    })
    expect(controls.background).toMatchObject({
      defaultValue: '#000000',
      visibleWhen: { controlId: 'color-mode', operator: 'in', values: ['mono', 'tonal', 'original'] },
    })
    expect(controls['color-depth']).toMatchObject({
      defaultValue: 2, min: 2, max: 64, step: 1,
      visibleWhen: { controlId: 'color-mode', operator: 'equals', value: 'rgb' },
    })

    expect(controls.brightness).toMatchObject({ defaultValue: 0, min: -100, max: 100, step: 1 })
    expect(controls.contrast).toMatchObject({ defaultValue: 0, min: -100, max: 100, step: 1 })
    expect(controls.gamma).toMatchObject({ defaultValue: 1, min: 0.5, max: 2, step: 0.05 })
    expect(controls.sharpen).toMatchObject({ defaultValue: 0, min: -1, max: 1, step: 0.1 })
  })

  it('shows only the Settings that apply to the active Dithering modes', () => {
    const definition = getStudioEffectById('dithering')
    const controls = definition.settingGroups.flatMap((group) => group.controls)
    const defaults = createDefaultStudioEffectControls().dithering
    const visibleDefaults = controls
      .filter((control) => isStudioControlVisible(control, defaults))
      .map((control) => control.id)

    expect(visibleDefaults).toContain('matrix-size')
    expect(visibleDefaults).toContain('foreground')
    expect(visibleDefaults).not.toContain('levels')
    expect(visibleDefaults).not.toContain('line-weight')
    expect(visibleDefaults).not.toContain('line-spacing')
    expect(visibleDefaults).not.toContain('layers')
    expect(visibleDefaults).not.toContain('mod-type')
    expect(visibleDefaults).not.toContain('mod-speed')
    expect(visibleDefaults).not.toContain('palette')
    expect(visibleDefaults).not.toContain('color-depth')
    expect(visibleDefaults).not.toContain('max-displace')
    expect(visibleDefaults).not.toContain('red-channel')
    expect(visibleDefaults).not.toContain('green-channel')
    expect(visibleDefaults).not.toContain('blue-channel')

    const rgbInterleavedGradient = {
      ...defaults,
      algorithm: 'interleaved-gradient',
      modulation: true,
      'color-mode': 'rgb',
      'chromatic-enabled': true,
    }
    const visibleRgbInterleavedGradient = controls
      .filter((control) => isStudioControlVisible(control, rgbInterleavedGradient))
      .map((control) => control.id)

    expect(visibleRgbInterleavedGradient).toEqual(expect.arrayContaining([
      'levels',
      'mod-type',
      'mod-wave-direction',
      'mod-frequency',
      'mod-amplitude',
      'mod-speed',
      'color-depth',
    ]))
    expect(visibleRgbInterleavedGradient).not.toContain('matrix-size')
    expect(visibleRgbInterleavedGradient).not.toContain('foreground')
    expect(visibleRgbInterleavedGradient).not.toContain('background')

    const directionIds = [
      'mod-wave-direction',
      'mod-grid-direction',
      'mod-radial-direction',
      'mod-horizontal-direction',
      'mod-rgb-split-direction',
    ]
    const directionIdByType = {
      wave: 'mod-wave-direction',
      grid: 'mod-grid-direction',
      radial: 'mod-radial-direction',
      horizontal: 'mod-horizontal-direction',
      'rgb-split': 'mod-rgb-split-direction',
    }

    for (const [modType, expectedDirectionId] of Object.entries(directionIdByType)) {
      const visibleDirections = controls
        .filter((control) => isStudioControlVisible(control, {
          ...defaults,
          modulation: true,
          'mod-type': modType,
        }))
        .map((control) => control.id)
        .filter((id) => directionIds.includes(id))

      expect(visibleDirections).toEqual([expectedDirectionId])
    }
  })

  it('shows an editable custom palette only for Palette + Custom', () => {
    const definition = getStudioEffectById('dithering')
    const customPalette = definition.settingGroups
      .flatMap((group) => group.controls)
      .find((control) => control.id === 'custom-palette')

    expect(customPalette).toMatchObject({
      kind: 'text',
      defaultValue: '#9bbc0f,#8bac0f,#306230,#0f380f',
    })
    expect(isStudioControlVisible(customPalette!, {
      'color-mode': 'palette',
      palette: 'custom',
    })).toBe(true)
    expect(isStudioControlVisible(customPalette!, {
      'color-mode': 'palette',
      palette: 'gameboy-4',
    })).toBe(false)
  })
})
