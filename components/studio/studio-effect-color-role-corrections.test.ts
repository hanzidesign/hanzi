import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { DataTexture } from 'three'
import { describe, expect, it } from 'vitest'

import { createStudioStore } from '@/app/studio/studio-store'
import { createBlockifyShaderMaterial } from './blockify-material'
import { CONTOUR_FRAGMENT_SHADER } from './contour-material'
import { CROSSHATCH_FRAGMENT_SHADER } from './crosshatch-material'
import {
  createDefaultGrainradEffectControls,
  getGrainradEffectById,
} from './grainrad-effects'
import { WAVE_LINES_FRAGMENT_SHADER } from './wave-lines-material'
import {
  MATRIX_RAIN_FRAGMENT_SHADER,
  createMatrixRainShaderMaterial,
} from './matrix-rain-material'
import { createMatrixRainGlyphAtlas } from './matrix-rain-charset'

describe('corrected Studio Effect color roles', () => {
  it('keeps Contour Line Color on contour pixels and Background on the field', () => {
    expect(CONTOUR_FRAGMENT_SHADER).toContain('if (isContour)')
    expect(CONTOUR_FRAGMENT_SHADER).toContain('effectColor = u_lineColor;')
    expect(CONTOUR_FRAGMENT_SHADER).toContain('else if (u_fillMode > 0.5)')
    expect(CONTOUR_FRAGMENT_SHADER).toContain('effectColor = u_background;')
    expect(CONTOUR_FRAGMENT_SHADER).toContain('u_background')
    expect(CONTOUR_FRAGMENT_SHADER).toContain(
      'mix(u_background, u_lineColor, quantizedBrightness)',
    )
  })

  it('uses Foreground for model ASCII glyphs and keeps Rain Color independent', async () => {
    const definition = getGrainradEffectById('matrix-rain')
    const colors = definition.settingGroups
      .find((group) => group.title === 'Color')!
      .controls

    expect(colors.map((control) => [control.id, control.label])).toEqual([
      ['foreground', 'Foreground'],
      ['rain-color', 'Rain Color'],
      ['background', 'Background'],
    ])

    const canvas = await readFile(join(process.cwd(), 'components/studio/CharacterMatrixRainCanvas.tsx'), 'utf8')
    expect(canvas).not.toContain("controls['model-color']")

    const material = createMatrixRainShaderMaterial({
      controls: { foreground: '#123456', 'rain-color': '#abcdef', background: '#fedcba' },
      glyphAtlas: createMatrixRainGlyphAtlas('binary'),
      sourceTexture: new DataTexture(),
    })
    expect(material.uniforms.u_foreground.value.getHexString()).toBe('123456')
    expect(material.uniforms.u_rainColor.value.getHexString()).toBe('abcdef')
    expect(material.uniforms.u_background.value.getHexString()).toBe('fedcba')
    expect(MATRIX_RAIN_FRAGMENT_SHADER).toContain(
      'float modelGlyphMask = characterPattern * modelThresholdMask;',
    )
    expect(MATRIX_RAIN_FRAGMENT_SHADER).toContain(
      'vec3 modelCharacters = modelCharacterColor * modelOpacity;',
    )
    expect(MATRIX_RAIN_FRAGMENT_SHADER).toContain(
      'float effectiveRain = rainIntensity * rainThresholdMask;',
    )
    expect(MATRIX_RAIN_FRAGMENT_SHADER).not.toContain('staticCharacters')
    expect(MATRIX_RAIN_FRAGMENT_SHADER).not.toContain(
      'u_foreground * matrixRainLuminance(adjustedSourceColor)',
    )
  })

  it('uses independent Blockify Foreground and Background controls', () => {
    const definition = getGrainradEffectById('blockify')
    const colors = definition.settingGroups
      .find((group) => group.title === 'Color')!
      .controls

    expect(colors.map((control) => [control.id, control.label])).toEqual([
      ['color-mode', 'Mode'],
      ['foreground', 'Foreground'],
      ['background', 'Background'],
    ])

    const material = createBlockifyShaderMaterial({
      controls: { foreground: '#123456', background: '#abcdef' },
      sourceTexture: new DataTexture(),
    })
    expect(material.uniforms.u_foreground.value.getHexString()).toBe('123456')
    expect(material.uniforms.u_background.value.getHexString()).toBe('abcdef')
  })

  it('maps Crosshatch source foreground to line color instead of swapping the theme pair', async () => {
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain(
      'vec3 effectColor = mix(u_background, u_lineColor, hatchValue);',
    )
    const canvas = await readFile(join(process.cwd(), 'components/studio/CharacterCrosshatchCanvas.tsx'), 'utf8')
    expect(canvas).toContain("color: new Color('#000000')")
    expect(canvas).toContain("scene.background = new Color('#ffffff')")
  })

  it('keeps Crosshatch state unchanged when another Effect is edited and reset', () => {
    const store = createStudioStore()
    const beforeControls = structuredClone(store.getState().grainradEffect.controls.crosshatch)
    const beforeThemeColors = {
      light: structuredClone(store.getState().grainradEffect.controlsByTheme.light.crosshatch),
      dark: structuredClone(store.getState().grainradEffect.controlsByTheme.dark.crosshatch),
    }

    store.getState().setSelectedEffect('vhs')
    store.getState().setGrainradEffectControl('vhs', 'distortion', 0.9)
    store.getState().resetSelectedEffectControls()

    expect(store.getState().grainradEffect.controls.crosshatch).toEqual(beforeControls)
    expect(store.getState().grainradEffect.controlsByTheme.light.crosshatch)
      .toEqual(beforeThemeColors.light)
    expect(store.getState().grainradEffect.controlsByTheme.dark.crosshatch)
      .toEqual(beforeThemeColors.dark)
  })

  it('uses Line Color for Wave Lines mono output', () => {
    expect(WAVE_LINES_FRAGMENT_SHADER).toContain(
      'u_colorMode > 0.5 ? u_lineColor : adjustedColor',
    )
    expect(WAVE_LINES_FRAGMENT_SHADER).not.toContain(
      'u_colorMode < 1.5 ? vec3(luminanceValue) : u_lineColor',
    )
  })

  it('defaults and resets Noise Field Distort Only to enabled', () => {
    const defaults = createDefaultGrainradEffectControls()['noise-field']
    const store = createStudioStore()

    expect(defaults['distort-only']).toBe(true)
    store.getState().setSelectedEffect('noise-field')
    store.getState().setGrainradEffectControl('noise-field', 'distort-only', false)
    store.getState().resetSelectedEffectControls()
    expect(store.getState().grainradEffect.controls['noise-field']['distort-only']).toBe(true)
  })
})
