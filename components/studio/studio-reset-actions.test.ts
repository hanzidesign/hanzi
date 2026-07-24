import { describe, expect, it } from 'vitest'
import type { StateStorage } from 'zustand/middleware'
import {
  createStudioStore,
  DEFAULT_ASCII_STATE,
} from '@/app/studio/studio-store'
import {
  STUDIO_COMMON_POST_PROCESSING_GROUPS,
  STUDIO_EFFECTS,
  getStudioControlDefaultValue,
  getStudioProcessingGroups,
  isStudioControlVisible,
  type StudioEffectControl,
} from '@/components/studio/studio-effects'
import {
  resetAsciiColorGroup,
  resetAsciiPrimaryGroup,
  resetStudioControlGroups,
} from '@/components/studio/StudioRightPanel'

describe('Studio section Reset actions', () => {
  it('resets Processing defaults for every effect without changing effect-local Settings', () => {
    for (const effect of STUDIO_EFFECTS) {
      const store = createStudioStore(createMemoryStorage())
      const processingGroups = getStudioProcessingGroups(effect.id)
      const processingControls = processingGroups.flatMap((group) => group.controls)
      const settingsControl = effect.settingGroups
        .flatMap((group) => group.controls)
        .find((control) => !processingControls.some((candidate) => candidate.id === control.id))

      expect(settingsControl).toBeDefined()

      const settingsValue = nonDefaultValue(settingsControl!)
      store.getState().setStudioEffectControl(effect.id, settingsControl!.id, settingsValue)
      processingControls.forEach((control) => {
        store.getState().setStudioEffectControl(effect.id, control.id, nonDefaultValue(control))
      })

      resetStudioControlGroups(
        effect.id,
        processingGroups,
        store.getState().view.theme,
        store.getState().setStudioEffectControl,
      )

      expect(store.getState().studioEffect.controls[effect.id][settingsControl!.id]).toBe(
        settingsValue,
      )
      processingControls.forEach((control) => {
        expect(store.getState().studioEffect.controls[effect.id][control.id]).toBe(
          getStudioControlDefaultValue(control, store.getState().view.theme),
        )
      })
    }
  })

  it('keeps Adjustments and Color resets group-local and preserves the inactive theme', () => {
    const store = createStudioStore(createMemoryStorage())
    const effect = STUDIO_EFFECTS.find((candidate) => candidate.id === 'crosshatch')!
    const adjustments = effect.settingGroups.find((group) => group.title === 'Adjustments')!
    const color = effect.settingGroups.find((group) => group.title === 'Color')!

    store.getState().setStudioEffectControl(effect.id, 'density', 10)
    store.getState().setStudioEffectControl(effect.id, 'brightness', 30)
    store.getState().setStudioEffectControl(effect.id, 'line-color', '#111111')
    store.getState().toggleStudioTheme()
    store.getState().setStudioEffectControl(effect.id, 'line-color', '#222222')
    store.getState().toggleStudioTheme()

    resetStudioControlGroups(
      effect.id,
      [adjustments],
      store.getState().view.theme,
      store.getState().setStudioEffectControl,
    )

    expect(store.getState().studioEffect.controls[effect.id].density).toBe(10)
    expect(store.getState().studioEffect.controls[effect.id].brightness).toBe(
      getStudioControlDefaultValue(
        adjustments.controls.find((control) => control.id === 'brightness')!,
        store.getState().view.theme,
      ),
    )
    expect(store.getState().studioEffect.controls[effect.id]['line-color']).toBe('#111111')

    resetStudioControlGroups(
      effect.id,
      [color],
      store.getState().view.theme,
      store.getState().setStudioEffectControl,
    )

    expect(store.getState().studioEffect.controls[effect.id].density).toBe(10)
    expect(store.getState().studioEffect.controls[effect.id]['line-color']).toBe(
      getStudioControlDefaultValue(
        color.controls.find((control) => control.id === 'line-color')!,
        store.getState().view.theme,
      ),
    )

    store.getState().toggleStudioTheme()
    expect(store.getState().studioEffect.controls[effect.id]['line-color']).toBe('#222222')
  })

  it('provides a group-local Reset for every effect setting group', () => {
    for (const effect of STUDIO_EFFECTS) {
      const store = createStudioStore(createMemoryStorage())
      const groups = effect.settingGroups

      groups.forEach((group, groupIndex) => {
        const outsideControl = groups
          .flatMap((candidate, candidateIndex) => candidateIndex === groupIndex ? [] : candidate.controls)
          .find((control) => control.id !== group.controls[0]?.id)

        group.controls.forEach((control) => {
          store.getState().setStudioEffectControl(effect.id, control.id, nonDefaultValue(control))
        })
        if (outsideControl) {
          store.getState().setStudioEffectControl(
            effect.id,
            outsideControl.id,
            nonDefaultValue(outsideControl),
          )
        }

        resetStudioControlGroups(
          effect.id,
          [group],
          store.getState().view.theme,
          store.getState().setStudioEffectControl,
        )

        group.controls.forEach((control) => {
          expect(
            store.getState().studioEffect.controls[effect.id][control.id],
            `${effect.id}.${group.title}.${control.id}`,
          ).toBe(getStudioControlDefaultValue(control, store.getState().view.theme))
        })
        if (outsideControl) {
          expect(store.getState().studioEffect.controls[effect.id][outsideControl.id]).toBe(
            nonDefaultValue(outsideControl),
          )
        }
      })
    }
  })

  it('resets ASCII primary controls and the dual ASCII store values only', () => {
    const store = createStudioStore(createMemoryStorage())
    const setAsciiControl = store.getState().setAsciiControl
    const setStudioEffectControl = store.getState().setStudioEffectControl
    const asciiPrimary = STUDIO_EFFECTS.find((effect) => effect.id === 'ascii')!.settingGroups[0]

    store.getState().setAsciiControl({
      cellSize: 30,
      charsetStyle: 'custom',
      brightness: 0.4,
    })
    store.getState().setStudioEffectControl('ascii', 'scale', 12)
    store.getState().setStudioEffectControl('ascii', 'size', 1.7)
    store.getState().setStudioEffectControl('ascii', 'character-set', 'custom')
    store.getState().setStudioEffectControl('ascii', 'custom-chars', 'changed')
    store.getState().setStudioEffectControl('ascii', 'contrast', 1.5)
    store.getState().setStudioEffectControl('ascii', 'foreground', '#123456')
    store.getState().setStudioEffectControl('ascii', 'processing-invert', true)
    store.getState().setStudioEffectControl('ascii', 'bloom', true)
    store.getState().setStudioEffectControl('dithering', 'intensity', 0.25)
    store.getState().setMeshControl({ scale: 2 })

    resetAsciiPrimaryGroup(store.getState().view.theme, setAsciiControl, setStudioEffectControl)

    expect(store.getState().ascii).toMatchObject({
      cellSize: 12,
      charsetStyle: 'standard',
      brightness: 0.4,
    })
    asciiPrimary.controls.forEach((control) => {
      expect(store.getState().studioEffect.controls.ascii[control.id]).toBe(
        getStudioControlDefaultValue(control, store.getState().view.theme),
      )
    })
    expect(store.getState().studioEffect.controls.ascii.contrast).toBe(1.5)
    expect(store.getState().studioEffect.controls.ascii.foreground).toBe('#123456')
    expect(store.getState().studioEffect.controls.ascii['processing-invert']).toBe(true)
    expect(store.getState().studioEffect.controls.ascii.bloom).toBe(true)
    expect(store.getState().studioEffect.controls.dithering.intensity).toBe(0.25)
    expect(store.getState().mesh.scale).toBe(2)
  })

  it('resets Dithering Chromatic Effects and hides its child controllers only', () => {
    const store = createStudioStore(createMemoryStorage())
    const effect = STUDIO_EFFECTS.find((candidate) => candidate.id === 'dithering')!
    const chromatic = effect.settingGroups.find((group) => group.title === 'Chromatic Effects')!
    const processingControlIds = new Set(
      getStudioProcessingGroups(effect.id)
        .concat(STUDIO_COMMON_POST_PROCESSING_GROUPS)
        .flatMap((group) => group.controls.map((control) => control.id)),
    )

    store.getState().setStudioEffectControl(effect.id, 'intensity', 0.25)
    chromatic.controls.forEach((control) => {
      store.getState().setStudioEffectControl(effect.id, control.id, nonDefaultValue(control))
    })

    resetStudioControlGroups(
      effect.id,
      [chromatic],
      store.getState().view.theme,
      store.getState().setStudioEffectControl,
    )

    const controls = store.getState().studioEffect.controls[effect.id]
    expect(controls.intensity).toBe(0.25)
    expect(controls['chromatic-enabled']).toBe(false)
    chromatic.controls.slice(1).forEach((control) => {
      expect(controls[control.id]).toBe(
        getStudioControlDefaultValue(control, store.getState().view.theme),
      )
      expect(isStudioControlVisible(control, controls)).toBe(false)
      expect(processingControlIds.has(control.id)).toBe(false)
    })
  })

  it('resets ASCII Color across Studio and ASCII state without changing the inactive theme', () => {
    const store = createStudioStore(createMemoryStorage())

    store.getState().toggleStudioTheme()
    store.getState().setAsciiControl({ foregroundColor: '#112233' })
    store.getState().toggleStudioTheme()
    store.getState().setStudioEffectControl('ascii', 'color-mode', 'original')
    store.getState().setAsciiControl({
      foregroundColor: '#445566',
      backgroundColor: '#778899',
      colorIntensity: 0.25,
      palette: 'amber',
    })

    resetAsciiColorGroup(
      store.getState().view.theme,
      store.getState().setAsciiControl,
      store.getState().setStudioEffectControl,
    )

    expect(store.getState().studioEffect.controls.ascii['color-mode']).toBe('mono')
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

function nonDefaultValue(control: StudioEffectControl) {
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
