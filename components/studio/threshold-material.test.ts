import { DataTexture, Vector2 } from 'three'
import { describe, expect, it, vi } from 'vitest'

import {
  THRESHOLD_COLOR_MODE_IDS,
  THRESHOLD_FRAGMENT_SHADER,
  applyThresholdUniforms,
  createThresholdShaderMaterial,
  disposeThresholdShaderMaterial,
} from './threshold-material'

function createFixture() {
  const sourceTexture = new DataTexture()
  const material = createThresholdShaderMaterial({
    controls: {},
    resolution: new Vector2(1280, 720),
    sourceSize: new Vector2(1024, 768),
    sourceTexture,
  })
  return { material, sourceTexture }
}

describe('Threshold shader material', () => {
  it('owns an independent shader with exact Grainrad defaults', () => {
    const { material, sourceTexture } = createFixture()

    expect(material.uniforms.u_sourceTexture.value).toBe(sourceTexture)
    expect(material.uniforms.u_sourceSize.value.toArray()).toEqual([1024, 768])
    expect(material.uniforms.u_resolution.value.toArray()).toEqual([1280, 720])
    expect(material.uniforms.u_levels.value).toBe(2)
    expect(material.uniforms.u_thresholdPoint.value).toBe(0.5)
    expect(material.uniforms.u_dither.value).toBe(0)
    expect(material.uniforms.u_invert.value).toBe(0)
    expect(material.uniforms.u_brightness.value).toBe(0)
    expect(material.uniforms.u_contrast.value).toBe(0)
    expect(material.uniforms.u_colorMode.value).toBe(0)
    expect(material.uniforms.u_foreground.value.getHexString()).toBe('ffffff')
    expect(material.uniforms.u_background.value.getHexString()).toBe('000000')
    expect(material.uniforms.u_time.value).toBe(0)
  })

  it('maps every Threshold-local control in exact production units and ids', () => {
    const { material } = createFixture()

    applyThresholdUniforms(material, {
      levels: 7,
      'threshold-point': 0.65,
      dither: true,
      invert: true,
      brightness: 40,
      contrast: -25,
      'color-mode': 'color',
      foreground: '#123456',
      background: '#abcdef',
    })

    expect(THRESHOLD_COLOR_MODE_IDS).toEqual({ custom: 0, color: 1 })
    expect(material.uniforms.u_levels.value).toBe(7)
    expect(material.uniforms.u_thresholdPoint.value).toBe(0.65)
    expect(material.uniforms.u_dither.value).toBe(1)
    expect(material.uniforms.u_invert.value).toBe(1)
    expect(material.uniforms.u_brightness.value).toBe(0.4)
    expect(material.uniforms.u_contrast.value).toBe(-0.25)
    expect(material.uniforms.u_colorMode.value).toBe(1)
    expect(material.uniforms.u_foreground.value.getHexString()).toBe('123456')
    expect(material.uniforms.u_background.value.getHexString()).toBe('abcdef')
  })

  it('clamps the runtime level count to the production minimum', () => {
    const { material } = createFixture()

    applyThresholdUniforms(material, { levels: 1 })

    expect(material.uniforms.u_levels.value).toBe(2)
    expect(THRESHOLD_FRAGMENT_SHADER).toContain('float levels = max(u_levels, 2.0);')
  })

  it('samples with clamp addressing and applies brightness then contrast before dither', () => {
    expect(THRESHOLD_FRAGMENT_SHADER).toContain(
      'texture2D(u_sourceTexture, clamp(v_uv, vec2(0.0), vec2(1.0))).rgb',
    )
    expect(THRESHOLD_FRAGMENT_SHADER).toContain('vec3 adjustedColor = sourceColor + u_brightness;')
    expect(THRESHOLD_FRAGMENT_SHADER).toContain(
      '(1.0 + u_contrast) / (1.0 - 0.99 * u_contrast)',
    )
    expect(THRESHOLD_FRAGMENT_SHADER).toContain(
      'adjustedColor = clamp((adjustedColor - 0.5) * contrastFactor + 0.5, 0.0, 1.0);',
    )
    expect(THRESHOLD_FRAGMENT_SHADER.indexOf('sourceColor + u_brightness')).toBeLessThan(
      THRESHOLD_FRAGMENT_SHADER.indexOf('thresholdBayer4x4(gl_FragCoord.xy)'),
    )
  })

  it('ports the exact 4 by 4 Bayer matrix and equal-channel 0.1 perturbation', () => {
    for (const row of [
      '0.0, 8.0, 2.0, 10.0',
      '12.0, 4.0, 14.0, 6.0',
      '3.0, 11.0, 1.0, 9.0',
      '15.0, 7.0, 13.0, 5.0',
    ]) {
      expect(THRESHOLD_FRAGMENT_SHADER).toContain(row)
    }
    expect(THRESHOLD_FRAGMENT_SHADER).toContain('return matrixValue / 16.0;')
    expect(THRESHOLD_FRAGMENT_SHADER).toContain(
      'ditheredColor += vec3((bayerValue - 0.5) * 0.1);',
    )
  })

  it('keeps strict binary threshold semantics and the undithered Original light branch', () => {
    expect(THRESHOLD_FRAGMENT_SHADER).toContain(
      'bool isLight = thresholdLuminance(ditheredColor) > u_thresholdPoint;',
    )
    expect(THRESHOLD_FRAGMENT_SHADER).toContain('isLight = !isLight;')
    expect(THRESHOLD_FRAGMENT_SHADER).toContain(
      'effectColor = isLight ? adjustedColor : vec3(0.0);',
    )
    expect(THRESHOLD_FRAGMENT_SHADER).toContain(
      'effectColor = isLight ? u_foreground : u_background;',
    )
  })

  it('ignores Threshold Point above two levels and ports rounding, invert, and both color branches', () => {
    expect(THRESHOLD_FRAGMENT_SHADER).toContain('if (levels <= 2.0)')
    expect(THRESHOLD_FRAGMENT_SHADER).toContain(
      'vec3 posterized = floor(ditheredColor * levelScale + 0.5) / levelScale;',
    )
    expect(THRESHOLD_FRAGMENT_SHADER).toContain('posterized = 1.0 - posterized;')
    expect(THRESHOLD_FRAGMENT_SHADER).toContain('effectColor = clamp(posterized, 0.0, 1.0);')
    expect(THRESHOLD_FRAGMENT_SHADER).toContain(
      'effectColor = mix(u_background, u_foreground, thresholdLuminance(posterized));',
    )

    const multiLevelBranch = THRESHOLD_FRAGMENT_SHADER.slice(
      THRESHOLD_FRAGMENT_SHADER.indexOf('} else {', THRESHOLD_FRAGMENT_SHADER.indexOf('if (levels <= 2.0)')),
      THRESHOLD_FRAGMENT_SHADER.indexOf('effectColor = applyThresholdPostProcessing'),
    )
    expect(multiLevelBranch).not.toContain('u_thresholdPoint')
  })

  it('keeps Processing absent and maps shared Post after the complete Threshold branch', () => {
    for (const processingUniform of [
      'u_processingInvert',
      'u_brightnessMap',
      'u_edgeEnhance',
      'u_blur',
      'u_quantizeColors',
      'u_shapeMatching',
    ]) {
      expect(THRESHOLD_FRAGMENT_SHADER).not.toContain(processingUniform)
    }
    expect(THRESHOLD_FRAGMENT_SHADER).toContain('vec3 applyThresholdPostProcessing')
    expect(THRESHOLD_FRAGMENT_SHADER.indexOf('if (levels <= 2.0)')).toBeLessThan(
      THRESHOLD_FRAGMENT_SHADER.indexOf('effectColor = applyThresholdPostProcessing'),
    )

    const { material } = createFixture()
    applyThresholdUniforms(material, {
      bloom: true,
      'grain-intensity': 61,
      'grain-size': 4,
      'grain-speed': 72,
      chromatic: true,
      scanlines: true,
      vignette: true,
      'crt-curve': true,
      phosphor: true,
    })

    expect(material.uniforms.u_bloom.value).toBe(1)
    expect(material.uniforms.u_grainIntensity.value).toBe(61)
    expect(material.uniforms.u_grainSize.value).toBe(4)
    expect(material.uniforms.u_grainSpeed.value).toBe(72)
    expect(material.uniforms.u_postChromatic.value).toBe(1)
    expect(material.uniforms.u_scanlines.value).toBe(1)
    expect(material.uniforms.u_vignette.value).toBe(1)
    expect(material.uniforms.u_crtCurve.value).toBe(1)
    expect(material.uniforms.u_phosphor.value).toBe(1)
  })

  it('uses source dimensions as output resolution when none is supplied', () => {
    const material = createThresholdShaderMaterial({
      controls: {},
      sourceSize: new Vector2(640, 360),
      sourceTexture: new DataTexture(),
    })

    expect(material.uniforms.u_resolution.value.toArray()).toEqual([640, 360])
  })

  it('disposes only its own material', () => {
    const { material, sourceTexture } = createFixture()
    const materialDispose = vi.spyOn(material, 'dispose')
    const sourceDispose = vi.spyOn(sourceTexture, 'dispose')

    disposeThresholdShaderMaterial(material)

    expect(materialDispose).toHaveBeenCalledOnce()
    expect(sourceDispose).not.toHaveBeenCalled()
  })
})
