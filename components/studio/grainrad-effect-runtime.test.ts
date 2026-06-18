import { describe, expect, it } from 'vitest'

import {
  GRAINRAD_COMMON_POST_PROCESSING_GROUPS,
  GRAINRAD_COMMON_PROCESSING_GROUPS,
  GRAINRAD_EFFECTS,
  createDefaultGrainradEffectControls,
  type GrainradControlValue,
  type GrainradEffectControl,
  type GrainradEffectId,
} from './grainrad-effects'
import {
  GRAINRAD_EFFECT_SHADER_IDS,
  compileGrainradEffectRuntime,
  getUnmappedGrainradControls,
} from './grainrad-effect-runtime'

describe('Phase 5F Grainrad runtime effect compiler', () => {
  it('assigns each Grainrad effect a unique shader id', () => {
    const ids = GRAINRAD_EFFECTS.map((effect) => GRAINRAD_EFFECT_SHADER_IDS[effect.id])

    expect(ids).toHaveLength(GRAINRAD_EFFECTS.length)
    expect(new Set(ids).size).toBe(GRAINRAD_EFFECTS.length)
    expect(ids.every((id) => Number.isInteger(id) && id >= 0)).toBe(true)
  })

  it('maps every visible Settings, Processing, and Post-Processing control into runtime output', () => {
    expect(getUnmappedGrainradControls()).toEqual([])
  })

  it('changes runtime signature when any selected-effect control changes', () => {
    const defaults = createDefaultGrainradEffectControls()

    for (const effect of GRAINRAD_EFFECTS) {
      const baseControls = defaults[effect.id]
      const baseSignature = signatureFor(effect.id, baseControls)

      for (const control of effect.settingGroups.flatMap((group) => group.controls)) {
        const nextControls = {
          ...baseControls,
          [control.id]: changedValueFor(control),
        }

        expect(signatureFor(effect.id, nextControls), `${effect.id}.${control.id}`).not.toEqual(baseSignature)
      }
    }
  })

  it('changes runtime signature when any shared Processing or Post-Processing control changes', () => {
    const defaults = createDefaultGrainradEffectControls()
    const sharedControls = [
      ...GRAINRAD_COMMON_PROCESSING_GROUPS,
      ...GRAINRAD_COMMON_POST_PROCESSING_GROUPS,
    ].flatMap((group) => group.controls)

    for (const effect of GRAINRAD_EFFECTS) {
      const baseControls = defaults[effect.id]
      const baseSignature = signatureFor(effect.id, baseControls)

      for (const control of sharedControls) {
        const nextControls = {
          ...baseControls,
          [control.id]: changedValueFor(control),
        }

        expect(signatureFor(effect.id, nextControls), `${effect.id}.${control.id}`).not.toEqual(baseSignature)
      }
    }
  })

  it('changes runtime signature for every select option', () => {
    const defaults = createDefaultGrainradEffectControls()

    for (const effect of GRAINRAD_EFFECTS) {
      const selectControls = effect.settingGroups
        .flatMap((group) => group.controls)
        .filter((control) => control.kind === 'select')

      for (const control of selectControls) {
        const signatures = control.options.map((option) => signatureFor(effect.id, {
          ...defaults[effect.id],
          [control.id]: option.value,
        }))

        expect(new Set(signatures).size, `${effect.id}.${control.id}`).toBe(control.options.length)
      }
    }
  })

  it('clamps ASCII Output Width to the visible column-count range', () => {
    const oversizedRuntime = compileGrainradEffectRuntime({
      selectedEffectId: 'ascii',
      controls: {
        ...createDefaultGrainradEffectControls().ascii,
        'output-width': 1024,
      },
    })
    const undersizedRuntime = compileGrainradEffectRuntime({
      selectedEffectId: 'ascii',
      controls: {
        ...createDefaultGrainradEffectControls().ascii,
        'output-width': -1,
      },
    })

    expect(oversizedRuntime.effectValues[2]).toBe(600)
    expect(undersizedRuntime.effectValues[2]).toBe(0)
  })

  it('defines ASCII Scale, Spacing, and Output Width with corrected control semantics', () => {
    const ascii = GRAINRAD_EFFECTS.find((effect) => effect.id === 'ascii')
    const controls = Object.fromEntries(
      ascii?.settingGroups.flatMap((group) => group.controls).map((control) => [control.id, control]) ?? []
    )

    expect(controls.scale).toMatchObject({
      kind: 'range',
      min: 1,
      max: 20,
      step: 0.1,
    })
    expect(controls.spacing).toMatchObject({
      kind: 'range',
      min: 0,
      max: 1,
      step: 0.01,
    })
    expect(controls['output-width']).toMatchObject({
      kind: 'range',
      min: 0,
      max: 600,
      step: 1,
    })
  })

  it('defaults ASCII Color Mode to mono for initial state and resets', () => {
    const defaultControls = createDefaultGrainradEffectControls().ascii
    const runtime = compileGrainradEffectRuntime({
      selectedEffectId: 'ascii',
      controls: defaultControls,
    })

    expect(defaultControls['color-mode']).toBe('mono')
    expect(runtime.effectValues[11]).toBe(0)
  })

  it('maps ASCII Foreground and Background color controls into runtime colors', () => {
    const ascii = GRAINRAD_EFFECTS.find((effect) => effect.id === 'ascii')
    const controls = Object.fromEntries(
      ascii?.settingGroups.flatMap((group) => group.controls).map((control) => [control.id, control]) ?? []
    )
    const runtime = compileGrainradEffectRuntime({
      selectedEffectId: 'ascii',
      controls: {
        ...createDefaultGrainradEffectControls().ascii,
        foreground: '#123456',
        background: '#abcdef',
      },
    })

    expect(controls.foreground).toMatchObject({
      kind: 'color',
      label: 'Foreground',
    })
    expect(runtime.effectColorA).toEqual([
      0x12 / 255,
      0x34 / 255,
      0x56 / 255,
    ])
    expect(runtime.effectColorB).toEqual([
      0xab / 255,
      0xcd / 255,
      0xef / 255,
    ])
  })
})

function signatureFor(
  selectedEffectId: GrainradEffectId,
  controls: Record<string, GrainradControlValue>,
) {
  return JSON.stringify(compileGrainradEffectRuntime({
    selectedEffectId,
    controls,
  }))
}

function changedValueFor(control: GrainradEffectControl): GrainradControlValue {
  if (control.kind === 'range') {
    return control.defaultValue === control.max ? control.min : control.max
  }

  if (control.kind === 'toggle') {
    return !control.defaultValue
  }

  if (control.kind === 'select') {
    return control.options.find((option) => option.value !== control.defaultValue)?.value ?? control.defaultValue
  }

  if (control.kind === 'text') {
    return `${control.defaultValue}X`
  }

  return control.defaultValue.toLowerCase() === '#123456' ? '#654321' : '#123456'
}
