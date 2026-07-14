import { DataTexture, Vector2 } from 'three'
import { describe, expect, it, vi } from 'vitest'

import {
  CONTOUR_COLOR_MODE_IDS,
  CONTOUR_FILL_MODE_IDS,
  CONTOUR_FRAGMENT_SHADER,
  applyContourUniforms,
  createContourShaderMaterial,
  disposeContourShaderMaterial,
} from './contour-material'

function createFixture() {
  const sourceTexture = new DataTexture()
  const material = createContourShaderMaterial({
    controls: {},
    resolution: new Vector2(1280, 720),
    sourceSize: new Vector2(1024, 768),
    sourceTexture,
  })
  return { material, sourceTexture }
}

describe('Contour shader material', () => {
  it('owns an independent source shader with exact Grainrad defaults', () => {
    const { material, sourceTexture } = createFixture()

    expect(material.uniforms.u_sourceTexture.value).toBe(sourceTexture)
    expect(material.uniforms.u_sourceSize.value.toArray()).toEqual([1024, 768])
    expect(material.uniforms.u_resolution.value.toArray()).toEqual([1280, 720])
    expect(material.uniforms.u_levels.value).toBe(8)
    expect(material.uniforms.u_lineThickness.value).toBe(1)
    expect(material.uniforms.u_fillMode.value).toBe(0)
    expect(material.uniforms.u_brightness.value).toBe(0)
    expect(material.uniforms.u_contrast.value).toBe(0)
    expect(material.uniforms.u_lineColor.value.getHexString()).toBe('000000')
    expect(material.uniforms.u_background.value.getHexString()).toBe('ffffff')
    expect(material.uniforms.u_colorMode.value).toBe(2)
    expect(material.uniforms.u_invert.value).toBe(0)
  })

  it('uses source dimensions as output resolution when none is supplied', () => {
    const material = createContourShaderMaterial({
      controls: {},
      sourceSize: new Vector2(640, 360),
      sourceTexture: new DataTexture(),
    })

    expect(material.uniforms.u_resolution.value.toArray()).toEqual([640, 360])
  })

  it('maps every Contour-local control in exact production units and ids', () => {
    const { material } = createFixture()

    applyContourUniforms(material, {
      'fill-mode': 'lines',
      levels: 17,
      'line-thickness': 2.25,
      invert: true,
      brightness: 40,
      contrast: -25,
      'color-mode': 'custom',
      'line-color': '#123456',
      background: '#abcdef',
    })

    expect(CONTOUR_FILL_MODE_IDS).toEqual({ filled: 0, lines: 1 })
    expect(CONTOUR_COLOR_MODE_IDS).toEqual({ original: 1, mono: 2, custom: 2 })
    expect(material.uniforms.u_fillMode.value).toBe(1)
    expect(material.uniforms.u_levels.value).toBe(17)
    expect(material.uniforms.u_lineThickness.value).toBe(2.25)
    expect(material.uniforms.u_invert.value).toBe(1)
    expect(material.uniforms.u_brightness.value).toBe(0.4)
    expect(material.uniforms.u_contrast.value).toBe(-0.25)
    expect(material.uniforms.u_colorMode.value).toBe(2)
    expect(material.uniforms.u_lineColor.value.getHexString()).toBe('123456')
    expect(material.uniforms.u_background.value.getHexString()).toBe('abcdef')
  })

  it('ports exact band, neighbor-distance, contour, and fill equations', () => {
    expect(CONTOUR_FRAGMENT_SHADER).toContain(
      'float quantized = floor(brightness * u_levels) / u_levels;',
    )
    expect(CONTOUR_FRAGMENT_SHADER).toContain(
      'float quantizedBrightness = quantized + 0.5 / u_levels;',
    )
    expect(CONTOUR_FRAGMENT_SHADER).toContain(
      'vec2 pixelSize = vec2(u_lineThickness) / u_resolution;',
    )
    expect(CONTOUR_FRAGMENT_SHADER).toContain('v_uv + vec2(-pixelSize.x, 0.0)')
    expect(CONTOUR_FRAGMENT_SHADER).toContain('v_uv + vec2(pixelSize.x, 0.0)')
    expect(CONTOUR_FRAGMENT_SHADER).toContain('v_uv + vec2(0.0, -pixelSize.y)')
    expect(CONTOUR_FRAGMENT_SHADER).toContain('v_uv + vec2(0.0, pixelSize.y)')
    expect(CONTOUR_FRAGMENT_SHADER).toContain(
      'bool isContour = leftQ != centerQ || rightQ != centerQ || topQ != centerQ || bottomQ != centerQ;',
    )
    expect(CONTOUR_FRAGMENT_SHADER).toContain(
      'floor(adjustedColor * u_levels) / u_levels + 0.5 / u_levels',
    )
    expect(CONTOUR_FRAGMENT_SHADER).toContain(
      'mix(u_background, u_lineColor, quantizedBrightness)',
    )
    expect(CONTOUR_FRAGMENT_SHADER).toContain('vec3(quantizedBrightness)')
  })

  it('preserves the production center-only Invert bug', () => {
    expect(CONTOUR_FRAGMENT_SHADER).toContain('brightness = 1.0 - brightness;')
    expect(CONTOUR_FRAGMENT_SHADER).not.toContain('left = 1.0 - left')
    expect(CONTOUR_FRAGMENT_SHADER).not.toContain('right = 1.0 - right')
    expect(CONTOUR_FRAGMENT_SHADER).not.toContain('top = 1.0 - top')
    expect(CONTOUR_FRAGMENT_SHADER).not.toContain('bottom = 1.0 - bottom')
  })

  it('uses a non-conflicting Rec.601 helper and exact brightness/contrast factor', () => {
    expect(CONTOUR_FRAGMENT_SHADER).not.toContain('float luminance(')
    expect(CONTOUR_FRAGMENT_SHADER).toContain('float contourLuminance(')
    expect(CONTOUR_FRAGMENT_SHADER).toContain('dot(color, vec3(0.299, 0.587, 0.114))')
    expect(CONTOUR_FRAGMENT_SHADER).toContain(
      '(1.0 + u_contrast) / (1.0 - u_contrast * 0.99)',
    )
  })

  it('keeps shared Processing and Post exclusively in the Studio compositor', () => {
    expect(CONTOUR_FRAGMENT_SHADER).not.toContain('u_processingInvert')
    expect(CONTOUR_FRAGMENT_SHADER).not.toContain('u_brightnessMap')
    expect(CONTOUR_FRAGMENT_SHADER).not.toContain('u_edgeEnhance')
    expect(CONTOUR_FRAGMENT_SHADER).not.toContain('u_blur')
    expect(CONTOUR_FRAGMENT_SHADER).not.toContain('u_quantizeColors')
    expect(CONTOUR_FRAGMENT_SHADER).not.toContain('u_shapeMatching')
    for (const uniform of [
      'u_bloom',
      'u_grainIntensity',
      'u_postChromatic',
      'u_scanlines',
      'u_vignette',
      'u_crtCurve',
      'u_phosphor',
    ]) {
      expect(CONTOUR_FRAGMENT_SHADER).not.toContain(uniform)
    }
  })

  it('disposes only its own material', () => {
    const { material, sourceTexture } = createFixture()
    const materialDispose = vi.spyOn(material, 'dispose')
    const sourceDispose = vi.spyOn(sourceTexture, 'dispose')

    disposeContourShaderMaterial(material)

    expect(materialDispose).toHaveBeenCalledOnce()
    expect(sourceDispose).not.toHaveBeenCalled()
  })
})
