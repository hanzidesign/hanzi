import { describe, expect, it } from 'vitest'
import { Texture } from 'three'

import {
  DEFAULT_VIEW_STATE,
  createInitialStudioStoreState,
  createStudioStore,
} from '@/app/studio/studio-store'
import {
  STUDIO_EFFECTS,
  getStudioControlDefaultValue,
  isStudioThemeColorControl,
} from './studio-effects'
import {
  DOTS_FRAGMENT_SHADER,
  createDotsShaderMaterial,
  disposeDotsShaderMaterial,
} from './dots-material'
import { BLOCKIFY_FRAGMENT_SHADER } from './blockify-material'

describe('Studio color behavior', () => {
  it('initializes and resets every color against the active theme', () => {
    const initial = createInitialStudioStoreState()
    const store = createStudioStore(createMemoryStorage())

    expect(initial.view.theme).toBe(DEFAULT_VIEW_STATE.theme)
    expect(initial.ascii.foregroundColor).toBe(initial.studioEffect.controls.ascii.foreground)
    expect(initial.ascii.backgroundColor).toBe(initial.studioEffect.controls.ascii.background)

    for (const effect of STUDIO_EFFECTS) {
      const colorControls = effect.settingGroups
        .flatMap((group) => group.controls)
        .filter(isStudioThemeColorControl)

      for (const control of colorControls) {
        const expected = getStudioControlDefaultValue(control, DEFAULT_VIEW_STATE.theme)

        expect(initial.studioEffect.controls[effect.id][control.id]).toBe(expected)
        store.getState().setSelectedEffect(effect.id)
        store.getState().setStudioEffectControl(effect.id, control.id, '#123456')
        store.getState().resetSelectedEffectControls()
        expect(store.getState().studioEffect.controls[effect.id][control.id]).toBe(expected)
      }
    }
  })

  it('uses mono as the default for every remaining Color Mode control', () => {
    const colorModeControls = STUDIO_EFFECTS.flatMap((effect) =>
      effect.settingGroups
        .flatMap((group) => group.controls)
        .filter((control) => control.kind === 'select' && control.id === 'color-mode')
        .map((control) => ({ effectId: effect.id, control })),
    )

    expect(colorModeControls.length).toBeGreaterThan(0)
    for (const { effectId, control } of colorModeControls) {
      if (control.kind !== 'select') {
        throw new TypeError(`${effectId}.color-mode must be a select control`)
      }
      expect(control.defaultValue, effectId).toBe('mono')
      expect(control.options.some((option) => option.value === 'mono'), effectId).toBe(true)
    }
  })

  it('keeps Matrix Rain foreground, rain, and background colors as separate controls', () => {
    const matrixRain = STUDIO_EFFECTS.find((effect) => effect.id === 'matrix-rain')!
    const colorIds = matrixRain.settingGroups
      .flatMap((group) => group.controls)
      .filter(isStudioThemeColorControl)
      .map((control) => control.id)

    expect(colorIds).toEqual(['foreground', 'rain-color', 'background'])
  })

  it('routes Dots mono color into the dot foreground', () => {
    const material = createDotsShaderMaterial({
      controls: {
        'color-mode': 'mono',
        foreground: '#123456',
        background: '#abcdef',
      },
      sourceTexture: new Texture(),
    })

    expect(material.uniforms.u_colorMode.value).toBe(1)
    expect(material.uniforms.u_foreground.value.getHexString()).toBe('123456')
    expect(DOTS_FRAGMENT_SHADER).toContain(
      'u_colorMode > 0.5 ? u_foreground * cellLuminance : modeColor',
    )

    disposeDotsShaderMaterial(material)
  })

  it('keeps Blockify Foreground and Background independent', () => {
    expect(BLOCKIFY_FRAGMENT_SHADER).toContain('mix(u_background, u_foreground, gray)')
    expect(BLOCKIFY_FRAGMENT_SHADER).not.toContain('u_borderColor')
  })

  it('defaults Pixel Sort mode to Depth', () => {
    const pixelSort = STUDIO_EFFECTS.find((effect) => effect.id === 'pixel-sort')!
    const sortMode = pixelSort.settingGroups
      .flatMap((group) => group.controls)
      .find((control) => control.id === 'sort-mode')

    expect(sortMode?.defaultValue).toBe('depth')
  })
})

function createMemoryStorage() {
  const values = new Map<string, string>()

  return {
    getItem: (name: string) => values.get(name) ?? null,
    setItem: (name: string, value: string) => {
      values.set(name, value)
    },
    removeItem: (name: string) => {
      values.delete(name)
    },
  }
}
