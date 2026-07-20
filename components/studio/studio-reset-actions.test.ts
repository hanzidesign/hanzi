import { describe, expect, it } from 'vitest'
import type { StateStorage } from 'zustand/middleware'
import {
  createStudioStore,
  DEFAULT_ASCII_STATE,
} from '@/app/studio/studio-store'
import {
  GRAINRAD_COMMON_POST_PROCESSING_GROUPS,
  GRAINRAD_EFFECTS,
  getGrainradControlDefaultValue,
  getGrainradProcessingGroups,
  isGrainradControlVisible,
  type GrainradEffectControl,
} from '@/components/studio/grainrad-effects'
import {
  resetAsciiColorGroup,
  resetAsciiPrimaryGroup,
  resetGrainradControlGroups,
} from '@/components/studio/StudioRightPanel'

describe('Studio section Reset actions', () => {
  it('resets Processing defaults for every effect without changing effect-local Settings', () => {
    for (const effect of GRAINRAD_EFFECTS) {
      const store = createStudioStore(createMemoryStorage())
      const processingGroups = getGrainradProcessingGroups(effect.id)
      const processingControls = processingGroups.flatMap((group) => group.controls)
      const settingsControl = effect.settingGroups
        .flatMap((group) => group.controls)
        .find((control) => !processingControls.some((candidate) => candidate.id === control.id))

      expect(settingsControl).toBeDefined()

      const settingsValue = nonDefaultValue(settingsControl!)
      store.getState().setGrainradEffectControl(effect.id, settingsControl!.id, settingsValue)
      processingControls.forEach((control) => {
        store.getState().setGrainradEffectControl(effect.id, control.id, nonDefaultValue(control))
      })

      resetGrainradControlGroups(
        effect.id,
        processingGroups,
        store.getState().view.theme,
        store.getState().setGrainradEffectControl,
      )

      expect(store.getState().grainradEffect.controls[effect.id][settingsControl!.id]).toBe(
        settingsValue,
      )
      processingControls.forEach((control) => {
        expect(store.getState().grainradEffect.controls[effect.id][control.id]).toBe(
          getGrainradControlDefaultValue(control, store.getState().view.theme),
        )
      })
    }
  })

  it('keeps Adjustments and Color resets group-local and preserves the inactive theme', () => {
    const store = createStudioStore(createMemoryStorage())
    const effect = GRAINRAD_EFFECTS.find((candidate) => candidate.id === 'crosshatch')!
    const adjustments = effect.settingGroups.find((group) => group.title === 'Adjustments')!
    const color = effect.settingGroups.find((group) => group.title === 'Color')!

    store.getState().setGrainradEffectControl(effect.id, 'density', 10)
    store.getState().setGrainradEffectControl(effect.id, 'brightness', 30)
    store.getState().setGrainradEffectControl(effect.id, 'line-color', '#111111')
    store.getState().toggleStudioTheme()
    store.getState().setGrainradEffectControl(effect.id, 'line-color', '#222222')
    store.getState().toggleStudioTheme()

    resetGrainradControlGroups(
      effect.id,
      [adjustments],
      store.getState().view.theme,
      store.getState().setGrainradEffectControl,
    )

    expect(store.getState().grainradEffect.controls[effect.id].density).toBe(10)
    expect(store.getState().grainradEffect.controls[effect.id].brightness).toBe(
      getGrainradControlDefaultValue(
        adjustments.controls.find((control) => control.id === 'brightness')!,
        store.getState().view.theme,
      ),
    )
    expect(store.getState().grainradEffect.controls[effect.id]['line-color']).toBe('#111111')

    resetGrainradControlGroups(
      effect.id,
      [color],
      store.getState().view.theme,
      store.getState().setGrainradEffectControl,
    )

    expect(store.getState().grainradEffect.controls[effect.id].density).toBe(10)
    expect(store.getState().grainradEffect.controls[effect.id]['line-color']).toBe(
      getGrainradControlDefaultValue(
        color.controls.find((control) => control.id === 'line-color')!,
        store.getState().view.theme,
      ),
    )

    store.getState().toggleStudioTheme()
    expect(store.getState().grainradEffect.controls[effect.id]['line-color']).toBe('#222222')
  })

  it('provides a group-local Reset for every effect setting group', () => {
    for (const effect of GRAINRAD_EFFECTS) {
      const store = createStudioStore(createMemoryStorage())
      const groups = effect.settingGroups

      groups.forEach((group, groupIndex) => {
        const outsideControl = groups
          .flatMap((candidate, candidateIndex) => candidateIndex === groupIndex ? [] : candidate.controls)
          .find((control) => control.id !== group.controls[0]?.id)

        group.controls.forEach((control) => {
          store.getState().setGrainradEffectControl(effect.id, control.id, nonDefaultValue(control))
        })
        if (outsideControl) {
          store.getState().setGrainradEffectControl(
            effect.id,
            outsideControl.id,
            nonDefaultValue(outsideControl),
          )
        }

        resetGrainradControlGroups(
          effect.id,
          [group],
          store.getState().view.theme,
          store.getState().setGrainradEffectControl,
        )

        group.controls.forEach((control) => {
          expect(
            store.getState().grainradEffect.controls[effect.id][control.id],
            `${effect.id}.${group.title}.${control.id}`,
          ).toBe(getGrainradControlDefaultValue(control, store.getState().view.theme))
        })
        if (outsideControl) {
          expect(store.getState().grainradEffect.controls[effect.id][outsideControl.id]).toBe(
            nonDefaultValue(outsideControl),
          )
        }
      })
    }
  })

  it('resets ASCII primary controls and the dual ASCII store values only', () => {
    const store = createStudioStore(createMemoryStorage())
    const setAsciiControl = store.getState().setAsciiControl
    const setGrainradEffectControl = store.getState().setGrainradEffectControl
    const asciiPrimary = GRAINRAD_EFFECTS.find((effect) => effect.id === 'ascii')!.settingGroups[0]

    store.getState().setAsciiControl({
      cellSize: 30,
      charsetStyle: 'custom',
      brightness: 0.4,
    })
    store.getState().setGrainradEffectControl('ascii', 'scale', 12)
    store.getState().setGrainradEffectControl('ascii', 'spacing', 0.75)
    store.getState().setGrainradEffectControl('ascii', 'output-width', 300)
    store.getState().setGrainradEffectControl('ascii', 'character-set', 'custom')
    store.getState().setGrainradEffectControl('ascii', 'custom-chars', 'changed')
    store.getState().setGrainradEffectControl('ascii', 'contrast', 1.5)
    store.getState().setGrainradEffectControl('ascii', 'foreground', '#123456')
    store.getState().setGrainradEffectControl('ascii', 'processing-invert', true)
    store.getState().setGrainradEffectControl('ascii', 'bloom', true)
    store.getState().setGrainradEffectControl('dithering', 'intensity', 0.25)
    store.getState().setMeshControl({ scale: 2 })

    resetAsciiPrimaryGroup(store.getState().view.theme, setAsciiControl, setGrainradEffectControl)

    expect(store.getState().ascii).toMatchObject({
      cellSize: 12,
      charsetStyle: 'standard',
      brightness: 0.4,
    })
    asciiPrimary.controls.forEach((control) => {
      expect(store.getState().grainradEffect.controls.ascii[control.id]).toBe(
        getGrainradControlDefaultValue(control, store.getState().view.theme),
      )
    })
    expect(store.getState().grainradEffect.controls.ascii.contrast).toBe(1.5)
    expect(store.getState().grainradEffect.controls.ascii.foreground).toBe('#123456')
    expect(store.getState().grainradEffect.controls.ascii['processing-invert']).toBe(true)
    expect(store.getState().grainradEffect.controls.ascii.bloom).toBe(true)
    expect(store.getState().grainradEffect.controls.dithering.intensity).toBe(0.25)
    expect(store.getState().mesh.scale).toBe(2)
  })

  it('resets Dithering Chromatic Effects and hides its child controllers only', () => {
    const store = createStudioStore(createMemoryStorage())
    const effect = GRAINRAD_EFFECTS.find((candidate) => candidate.id === 'dithering')!
    const chromatic = effect.settingGroups.find((group) => group.title === 'Chromatic Effects')!
    const processingControlIds = new Set(
      getGrainradProcessingGroups(effect.id)
        .concat(GRAINRAD_COMMON_POST_PROCESSING_GROUPS)
        .flatMap((group) => group.controls.map((control) => control.id)),
    )

    store.getState().setGrainradEffectControl(effect.id, 'intensity', 0.25)
    chromatic.controls.forEach((control) => {
      store.getState().setGrainradEffectControl(effect.id, control.id, nonDefaultValue(control))
    })

    resetGrainradControlGroups(
      effect.id,
      [chromatic],
      store.getState().view.theme,
      store.getState().setGrainradEffectControl,
    )

    const controls = store.getState().grainradEffect.controls[effect.id]
    expect(controls.intensity).toBe(0.25)
    expect(controls['chromatic-enabled']).toBe(false)
    chromatic.controls.slice(1).forEach((control) => {
      expect(controls[control.id]).toBe(
        getGrainradControlDefaultValue(control, store.getState().view.theme),
      )
      expect(isGrainradControlVisible(control, controls)).toBe(false)
      expect(processingControlIds.has(control.id)).toBe(false)
    })
  })

  it('resets ASCII Color across Grainrad and ASCII state without changing the inactive theme', () => {
    const store = createStudioStore(createMemoryStorage())

    store.getState().toggleStudioTheme()
    store.getState().setAsciiControl({ foregroundColor: '#112233' })
    store.getState().toggleStudioTheme()
    store.getState().setGrainradEffectControl('ascii', 'color-mode', 'original')
    store.getState().setAsciiControl({
      foregroundColor: '#445566',
      backgroundColor: '#778899',
      colorIntensity: 0.25,
      palette: 'amber',
    })

    resetAsciiColorGroup(
      store.getState().view.theme,
      store.getState().setAsciiControl,
      store.getState().setGrainradEffectControl,
    )

    expect(store.getState().grainradEffect.controls.ascii['color-mode']).toBe('mono')
    expect(store.getState().ascii).toMatchObject({
      foregroundColor: '#f4f1e8',
      backgroundColor: '#101010',
      colorIntensity: DEFAULT_ASCII_STATE.colorIntensity,
      palette: DEFAULT_ASCII_STATE.palette,
    })

    store.getState().toggleStudioTheme()
    expect(store.getState().ascii.foregroundColor).toBe('#112233')
  })
})

function nonDefaultValue(control: GrainradEffectControl) {
  if (control.kind === 'toggle') {
    return !control.defaultValue
  }

  if (control.kind === 'range') {
    return control.defaultValue === control.max ? control.min : control.max
  }

  if (control.kind === 'select') {
    return control.options.find((option) => option.value !== control.defaultValue)?.value
      ?? control.defaultValue
  }

  if (control.kind === 'text') {
    return `${control.defaultValue}-changed`
  }

  return control.defaultValue === '#123456' ? '#654321' : '#123456'
}

function createMemoryStorage(): StateStorage {
  const values = new Map<string, string>()

  return {
    getItem: (name) => values.get(name) ?? null,
    setItem: (name, value) => {
      values.set(name, value)
    },
    removeItem: (name) => {
      values.delete(name)
    },
  }
}
