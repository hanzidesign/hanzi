import { DataTexture, Vector2 } from 'three'
import { describe, expect, it } from 'vitest'

import { createDefaultGrainradEffectControls } from './grainrad-effects'
import {
  DITHERING_ALGORITHM_IDS,
  DITHERING_FRAGMENT_SHADER,
  applyDitheringUniforms,
  createDitheringShaderMaterial,
} from './dithering-material'

describe('Dithering shader material', () => {
  it('samples the selected Character texture on a source-pixel Bayer 8x8 grid', () => {
    const sourceTexture = new DataTexture()
    const material = createDitheringShaderMaterial({
      controls: {},
      sourceSize: new Vector2(1024, 768),
      sourceTexture,
    })

    expect(material.uniforms.u_sourceTexture.value).toBe(sourceTexture)
    expect(material.uniforms.u_sourceSize.value.toArray()).toEqual([1024, 768])
    expect(material.uniforms.u_algorithm.value).toBe(10)
    expect(material.uniforms.u_matrixSize.value).toBe(4)
    expect(DITHERING_FRAGMENT_SHADER).toContain('texture2D(u_sourceTexture')
    expect(DITHERING_FRAGMENT_SHADER).toContain('visualPixel')
    expect(DITHERING_FRAGMENT_SHADER).toContain('u_sourceSize')
    expect(DITHERING_FRAGMENT_SHADER).toContain('bayer8Threshold')
    expect(DITHERING_FRAGMENT_SHADER).toContain('/ 64.0')
  })

  it('uses the Dithering schema defaults for every visible setting', () => {
    const controls = createDefaultGrainradEffectControls().dithering
    const material = createDitheringShaderMaterial({
      controls,
      sourceTexture: new DataTexture(),
    })

    expect({
      algorithm: material.uniforms.u_algorithm.value,
      intensity: material.uniforms.u_intensity.value,
      levels: material.uniforms.u_levels.value,
      matrixSize: material.uniforms.u_matrixSize.value,
      lineWeight: material.uniforms.u_lineWeight.value,
      lineSpacing: material.uniforms.u_lineSpacing.value,
      layers: material.uniforms.u_layers.value,
      modulation: material.uniforms.u_modulationEnabled.value,
      modulationType: material.uniforms.u_modulationType.value,
      modulationFrequency: material.uniforms.u_modFrequency.value,
      modulationAmplitude: material.uniforms.u_modAmplitude.value,
      brightness: material.uniforms.u_brightness.value,
      contrast: material.uniforms.u_contrast.value,
      gamma: material.uniforms.u_gamma.value,
      sharpen: material.uniforms.u_sharpen.value,
      colorMode: material.uniforms.u_colorMode.value,
      palette: material.uniforms.u_paletteId.value,
      foreground: material.uniforms.u_foreground.value.getHexString(),
      background: material.uniforms.u_background.value.getHexString(),
      colorDepth: material.uniforms.u_colorDepth.value,
      chromatic: material.uniforms.u_chromaticEnabled.value,
      maxDisplace: material.uniforms.u_maxDisplace.value,
      channelAngles: material.uniforms.u_channelAngles.value.toArray(),
    }).toEqual({
      algorithm: 10,
      intensity: 1,
      levels: 2,
      matrixSize: 4,
      lineWeight: 0.5,
      lineSpacing: 10,
      layers: 2,
      modulation: 0,
      modulationType: 0,
      modulationFrequency: 5,
      modulationAmplitude: 0.1,
      brightness: 0,
      contrast: 0,
      gamma: 1,
      sharpen: 0,
      colorMode: 0,
      palette: 0,
      foreground: '000000',
      background: 'ffffff',
      colorDepth: 2,
      chromatic: 0,
      maxDisplace: 6,
      channelAngles: [23, 50, 80],
    })
  })

  it('updates effect-local algorithm and adjustment uniforms without an ASCII runtime', () => {
    const material = createDitheringShaderMaterial({
      controls: {},
      sourceTexture: new DataTexture(),
    })

    applyDitheringUniforms(material, {
      algorithm: 'sierra-lite',
      brightness: 24,
      contrast: -18,
      gamma: 1.35,
      intensity: 1.4,
      sharpen: 0.6,
    })

    expect(DITHERING_ALGORITHM_IDS).toEqual({
      'floyd-steinberg': 0,
      atkinson: 1,
      'jarvis-judice-ninke': 2,
      stucki: 3,
      burkes: 4,
      sierra: 5,
      'sierra-two-row': 6,
      'sierra-lite': 7,
      'bayer-2x2': 8,
      'bayer-4x4': 9,
      'bayer-8x8': 10,
      'bayer-16x16': 11,
      'clustered-dot': 14,
      'blue-noise': 17,
      'interleaved-gradient': 19,
      crosshatch: 20,
    })
    expect(material.uniforms.u_algorithm.value).toBe(7)
    expect(material.uniforms.u_intensity.value).toBe(1.4)
    expect(material.uniforms.u_brightness.value).toBe(24)
    expect(material.uniforms.u_contrast.value).toBe(-18)
    expect(material.uniforms.u_gamma.value).toBe(1.35)
    expect(material.uniforms.u_sharpen.value).toBe(0.6)
    expect(DITHERING_FRAGMENT_SHADER).toContain('applyDitheringAlgorithm')
    expect(DITHERING_FRAGMENT_SHADER).toContain('sampleSharpenedSource')
  })

  it('maps every Dithering color, modulation, crosshatch, and chromatic control', () => {
    const material = createDitheringShaderMaterial({
      controls: {},
      sourceTexture: new DataTexture(),
    })

    applyDitheringUniforms(material, {
      'background': '#102030',
      'blue-channel': 240,
      'chromatic-enabled': true,
      'color-depth': 12,
      'color-mode': 'palette',
      'custom-palette': '#112233, #abcdef, #fedcba',
      'foreground': '#fefefe',
      'green-channel': 120,
      'layers': 4,
      'levels': 9,
      'line-spacing': 18,
      'line-weight': 0.75,
      'max-displace': 14,
      'mod-amplitude': 2.5,
      'mod-frequency': 13,
      'mod-type': 'rgb-split',
      'modulation': true,
      'palette': 'custom',
      'red-channel': 15,
    })

    expect(material.uniforms.u_levels.value).toBe(9)
    expect(material.uniforms.u_lineWeight.value).toBe(0.75)
    expect(material.uniforms.u_lineSpacing.value).toBe(18)
    expect(material.uniforms.u_layers.value).toBe(4)
    expect(material.uniforms.u_modulationEnabled.value).toBe(1)
    expect(material.uniforms.u_modulationType.value).toBe(4)
    expect(material.uniforms.u_modFrequency.value).toBe(13)
    expect(material.uniforms.u_modAmplitude.value).toBe(2.5)
    expect(material.uniforms.u_colorMode.value).toBe(2)
    expect(material.uniforms.u_paletteId.value).toBe(11)
    expect(material.uniforms.u_paletteCount.value).toBe(3)
    expect(material.uniforms.u_foreground.value.getHexString()).toBe('fefefe')
    expect(material.uniforms.u_background.value.getHexString()).toBe('102030')
    expect(material.uniforms.u_colorDepth.value).toBe(12)
    expect(material.uniforms.u_chromaticEnabled.value).toBe(1)
    expect(material.uniforms.u_maxDisplace.value).toBe(14)
    expect(material.uniforms.u_channelAngles.value.toArray()).toEqual([15, 120, 240])
    expect(DITHERING_FRAGMENT_SHADER).toContain('applyColorMode')
    expect(DITHERING_FRAGMENT_SHADER).toContain('applyModulation')
    expect(DITHERING_FRAGMENT_SHADER).toContain('applyChromaticDisplacement')
    expect(DITHERING_FRAGMENT_SHADER).toContain('u_paletteColors')
  })

  it('maps shared Processing and Post-Processing controls into the Dithering pipeline', () => {
    const material = createDitheringShaderMaterial({
      controls: {},
      sourceTexture: new DataTexture(),
    })

    applyDitheringUniforms(material, {
      'processing-invert': true,
      'brightness-map': 1.4,
      'edge-enhance': 0.35,
      'blur': 3,
      'quantize-colors': 8,
      'shape-matching': 0.25,
      'bloom': true,
      'grain-intensity': 35,
      'grain-size': 2,
      'grain-speed': 50,
      'chromatic': true,
      'scanlines': true,
      'vignette': true,
      'crt-curve': true,
      'phosphor': true,
    })

    expect(material.uniforms.u_processingInvert.value).toBe(1)
    expect(material.uniforms.u_brightnessMap.value).toBe(1.4)
    expect(material.uniforms.u_edgeEnhance.value).toBe(0.35)
    expect(material.uniforms.u_blur.value).toBe(3)
    expect(material.uniforms.u_quantizeColors.value).toBe(8)
    expect(material.uniforms.u_shapeMatching.value).toBe(0.25)
    expect(material.uniforms.u_bloom.value).toBe(1)
    expect(material.uniforms.u_postChromatic.value).toBe(1)
    expect(material.uniforms.u_scanlines.value).toBe(1)
    expect(material.uniforms.u_vignette.value).toBe(1)
    expect(material.uniforms.u_crtCurve.value).toBe(1)
    expect(material.uniforms.u_phosphor.value).toBe(1)
    expect(DITHERING_FRAGMENT_SHADER).toContain('applySharedProcessing')
    expect(DITHERING_FRAGMENT_SHADER).toContain('applySharedPostProcessing')
  })
})
