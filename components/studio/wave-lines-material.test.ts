import { DataTexture, Vector2 } from 'three'
import { describe, expect, it, vi } from 'vitest'

import {
  WAVE_LINES_COLOR_MODE_IDS,
  WAVE_LINES_DIRECTION_IDS,
  WAVE_LINES_FRAGMENT_SHADER,
  applyWaveLinesUniforms,
  createWaveLinesShaderMaterial,
  disposeWaveLinesShaderMaterial,
} from './wave-lines-material'

function createFixture() {
  const sourceTexture = new DataTexture()
  const material = createWaveLinesShaderMaterial({
    controls: {},
    resolution: new Vector2(1280, 720),
    sourceSize: new Vector2(1024, 768),
    sourceTexture,
  })
  return { material, sourceTexture }
}

describe('Wave Lines shader material', () => {
  it('owns an independent shader with exact Grainrad defaults', () => {
    const { material, sourceTexture } = createFixture()

    expect(material.uniforms.u_sourceTexture.value).toBe(sourceTexture)
    expect(material.uniforms.u_sourceSize.value.toArray()).toEqual([1024, 768])
    expect(material.uniforms.u_resolution.value.toArray()).toEqual([1280, 720])
    expect(material.uniforms.u_lineCount.value).toBe(50)
    expect(material.uniforms.u_amplitude.value).toBe(20)
    expect(material.uniforms.u_frequency.value).toBe(1)
    expect(material.uniforms.u_time.value).toBe(0)
    expect(material.uniforms.u_direction.value).toBe(0)
    expect(material.uniforms.u_lineThickness.value).toBe(0.4)
    expect(material.uniforms.u_brightness.value).toBe(0)
    expect(material.uniforms.u_contrast.value).toBe(0)
    expect(material.uniforms.u_colorMode.value).toBe(0)
    expect(material.uniforms.u_lineColor.value.getHexString()).toBe('ffffff')
    expect(material.uniforms.u_background.value.getHexString()).toBe('000000')
    expect(material.uniforms.u_animate.value).toBe(1)
  })

  it('maps the exact uniform ABI units and ids without clamping the raw controls', () => {
    const { material } = createFixture()

    applyWaveLinesUniforms(material, {
      'line-count': 135,
      amplitude: 42,
      frequency: 2.4,
      'line-thickness': 0.4,
      direction: 'vertical',
      animate: false,
      brightness: 40,
      contrast: -25,
      'color-mode': 'custom',
      'line-color': '#123456',
      background: '#abcdef',
    })

    expect(WAVE_LINES_DIRECTION_IDS).toEqual({ horizontal: 0, vertical: 1 })
    expect(WAVE_LINES_COLOR_MODE_IDS).toEqual({ original: 0, custom: 1 })
    expect(material.uniforms.u_lineCount.value).toBe(135)
    expect(material.uniforms.u_amplitude.value).toBe(42)
    expect(material.uniforms.u_frequency.value).toBe(2.4)
    expect(material.uniforms.u_lineThickness.value).toBe(0.4)
    expect(material.uniforms.u_direction.value).toBe(1)
    expect(material.uniforms.u_animate.value).toBe(0)
    expect(material.uniforms.u_brightness.value).toBe(0.4)
    expect(material.uniforms.u_contrast.value).toBe(-0.25)
    expect(material.uniforms.u_colorMode.value).toBe(1)
    expect(material.uniforms.u_lineColor.value.getHexString()).toBe('123456')
    expect(material.uniforms.u_background.value.getHexString()).toBe('abcdef')
  })

  it('keeps missing Animate enabled and preserves the below-minimum thickness default', () => {
    const { material } = createFixture()

    applyWaveLinesUniforms(material, { animate: true, 'line-thickness': 2.3 })
    expect(material.uniforms.u_animate.value).toBe(1)
    expect(material.uniforms.u_lineThickness.value).toBe(2.3)

    applyWaveLinesUniforms(material, {})
    expect(material.uniforms.u_animate.value).toBe(1)
    expect(material.uniforms.u_lineThickness.value).toBe(0.4)
  })

  it('clamp-samples, adjusts brightness and contrast, then uses Rec.601 luminance', () => {
    expect(WAVE_LINES_FRAGMENT_SHADER).toContain(
      'clamp(v_uv, vec2(0.0), vec2(1.0))',
    )
    expect(WAVE_LINES_FRAGMENT_SHADER).toContain(
      'applyWaveLinesBrightnessContrast(clamp(sourceColor, 0.0, 1.0))',
    )
    expect(WAVE_LINES_FRAGMENT_SHADER).toContain(
      '(1.0 + u_contrast) / (1.0 - 0.99 * u_contrast)',
    )
    expect(WAVE_LINES_FRAGMENT_SHADER).toContain(
      'dot(color, vec3(0.299, 0.587, 0.114))',
    )
  })

  it('ports horizontal and vertical line ownership as exact transpositions', () => {
    for (const marker of [
      'spacing = u_resolution.y / u_lineCount;',
      'lineIndex = floor(pixelPosition.y / spacing);',
      'phase = (pixelPosition.x / u_resolution.x) * WAVE_LINES_TWO_PI * u_frequency;',
      'distanceToLine = abs(pixelPosition.y - center);',
      'spacing = u_resolution.x / u_lineCount;',
      'lineIndex = floor(pixelPosition.x / spacing);',
      'phase = (pixelPosition.y / u_resolution.y) * WAVE_LINES_TWO_PI * u_frequency;',
      'distanceToLine = abs(pixelPosition.x - center);',
    ]) {
      expect(WAVE_LINES_FRAGMENT_SHADER).toContain(marker)
    }
    expect(WAVE_LINES_FRAGMENT_SHADER).toContain(
      'offset = sin(phase + animTime) * u_amplitude * luminanceValue;',
    )
    expect(WAVE_LINES_FRAGMENT_SHADER).toContain(
      'center = (lineIndex + 0.5) * spacing + offset;',
    )
  })

  it('uses raw seconds only when animated and a strict hard-edged thickness test', () => {
    expect(WAVE_LINES_FRAGMENT_SHADER).toContain(
      'float animTime = u_animate > 0.5 ? u_time : 0.0;',
    )
    expect(WAVE_LINES_FRAGMENT_SHADER).toContain(
      'float halfWidth = spacing * u_lineThickness * luminanceValue;',
    )
    expect(WAVE_LINES_FRAGMENT_SHADER).toContain(
      'bool isLine = distanceToLine < halfWidth;',
    )
    expect(WAVE_LINES_FRAGMENT_SHADER).not.toContain('smoothstep(halfWidth')
  })

  it('locks the uploaded Mono mapping and unreachable Line Color production no-op', () => {
    expect(WAVE_LINES_COLOR_MODE_IDS).toEqual({ original: 0, custom: 1 })
    expect(Object.values(WAVE_LINES_COLOR_MODE_IDS)).not.toContain(2)
    expect(WAVE_LINES_FRAGMENT_SHADER).toContain(
      'u_colorMode < 1.5 ? vec3(luminanceValue) : u_lineColor',
    )
    expect(WAVE_LINES_FRAGMENT_SHADER).toContain(
      'vec3 effectColor = isLine ? linePixelColor : u_background;',
    )
  })

  it('keeps Processing absent and maps shared Post after Wave Lines', () => {
    for (const processingUniform of [
      'u_processingInvert',
      'u_brightnessMap',
      'u_edgeEnhance',
      'u_blur',
      'u_quantizeColors',
      'u_shapeMatching',
    ]) {
      expect(WAVE_LINES_FRAGMENT_SHADER).not.toContain(processingUniform)
    }
    expect(WAVE_LINES_FRAGMENT_SHADER).toContain('vec3 applyWaveLinesPostProcessing')
    expect(WAVE_LINES_FRAGMENT_SHADER.indexOf('vec3 effectColor =')).toBeLessThan(
      WAVE_LINES_FRAGMENT_SHADER.indexOf('applyWaveLinesPostProcessing(effectColor'),
    )

    const { material } = createFixture()
    applyWaveLinesUniforms(material, {
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
    const material = createWaveLinesShaderMaterial({
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

    disposeWaveLinesShaderMaterial(material)

    expect(materialDispose).toHaveBeenCalledOnce()
    expect(sourceDispose).not.toHaveBeenCalled()
  })
})
