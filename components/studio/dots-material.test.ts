import { DataTexture, Vector2 } from 'three'
import { describe, expect, it, vi } from 'vitest'

import {
  DOTS_FRAGMENT_SHADER,
  DOTS_GRID_IDS,
  DOTS_SHAPE_IDS,
  applyDotsUniforms,
  createDotsShaderMaterial,
  disposeDotsShaderMaterial,
} from './dots-material'

function createFixture() {
  const sourceTexture = new DataTexture()
  const material = createDotsShaderMaterial({
    controls: {},
    resolution: new Vector2(1280, 720),
    sourceSize: new Vector2(1024, 768),
    sourceTexture,
  })
  return { material, sourceTexture }
}

describe('Dots shader material', () => {
  it('owns an independent source shader with Studio defaults', () => {
    const { material, sourceTexture } = createFixture()

    expect(material.uniforms.u_sourceTexture.value).toBe(sourceTexture)
    expect(material.uniforms.u_sourceSize.value.toArray()).toEqual([1024, 768])
    expect(material.uniforms.u_resolution.value.toArray()).toEqual([1280, 720])
    expect(material.uniforms.u_sizeMultiplier.value).toBe(1)
    expect(material.uniforms.u_spacing.value).toBe(1)
    expect(material.uniforms.u_shape.value).toBe(0)
    expect(material.uniforms.u_gridType.value).toBe(0)
    expect(material.uniforms.u_invert.value).toBe(0)
    expect(material.uniforms.u_brightness.value).toBe(0)
    expect(material.uniforms.u_contrast.value).toBe(0)
    expect(material.uniforms.u_colorMode.value).toBe(1)
    expect(material.uniforms.u_foreground.value.getHexString()).toBe('ffffff')
    expect(material.uniforms.u_background.value.getHexString()).toBe('000000')
    expect(material.uniforms.u_processingInvert.value).toBe(0)
    expect(material.uniforms.u_brightnessMap.value).toBe(1)
    expect(material.uniforms.u_edgeEnhance.value).toBe(0)
    expect(material.uniforms.u_blur.value).toBe(0)
    expect(material.uniforms.u_quantizeColors.value).toBe(0)
    expect(material.uniforms.u_shapeMatching.value).toBe(0)
  })

  it('maps every Dots-local control in exact production units and ids', () => {
    const { material } = createFixture()

    applyDotsUniforms(material, {
      shape: 'diamond',
      'grid-type': 'hex',
      size: 1.7,
      spacing: 1.4,
      invert: true,
      brightness: 40,
      contrast: -25,
      'color-mode': 'custom',
      foreground: '#12ab34',
      background: '#abcdef',
    })

    expect(DOTS_SHAPE_IDS).toEqual({ circle: 0, square: 1, diamond: 2 })
    expect(DOTS_GRID_IDS).toEqual({ square: 0, hex: 1 })
    expect(material.uniforms.u_shape.value).toBe(2)
    expect(material.uniforms.u_gridType.value).toBe(1)
    expect(material.uniforms.u_sizeMultiplier.value).toBe(1.7)
    expect(material.uniforms.u_spacing.value).toBe(1.4)
    expect(material.uniforms.u_invert.value).toBe(1)
    expect(material.uniforms.u_brightness.value).toBe(0.4)
    expect(material.uniforms.u_contrast.value).toBe(-0.25)
    expect(material.uniforms.u_colorMode.value).toBe(1)
    expect(material.uniforms.u_foreground.value.getHexString()).toBe('12ab34')
    expect(material.uniforms.u_background.value.getHexString()).toBe('abcdef')
  })

  it('preserves exact grid, luminance, radius, strict shape, and production color-mode equations', () => {
    expect(DOTS_FRAGMENT_SHADER).toContain('float baseSpacing = 8.0 * u_spacing;')
    expect(DOTS_FRAGMENT_SHADER).toContain('float dotRadius = baseSpacing * 0.4 * u_sizeMultiplier;')
    expect(DOTS_FRAGMENT_SHADER).toContain('float hexSpacingY = baseSpacing * 0.866;')
    expect(DOTS_FRAGMENT_SHADER).toContain('float xOffset = oddRow ? baseSpacing * 0.5 : 0.0;')
    expect(DOTS_FRAGMENT_SHADER).toContain('float radius = dotRadius * (0.2 + cellLuminance * 0.8);')
    expect(DOTS_FRAGMENT_SHADER).toContain('distanceSquared < radius * radius')
    expect(DOTS_FRAGMENT_SHADER).toContain('max(absoluteLocal.x, absoluteLocal.y) < radius')
    expect(DOTS_FRAGMENT_SHADER).toContain('absoluteLocal.x + absoluteLocal.y < radius * 1.4')
    expect(DOTS_FRAGMENT_SHADER).toContain('u_colorMode < 0.5 ? adjustedColor : vec3(cellLuminance)')
    expect(DOTS_FRAGMENT_SHADER).toContain('u_colorMode > 0.5 ? u_foreground * cellLuminance : modeColor')
  })

  it('maps and consumes every Processing control before Post', () => {
    expect(DOTS_FRAGMENT_SHADER).toContain('vec3 sampleDotsSource')
    expect(DOTS_FRAGMENT_SHADER).toContain('vec2 blurTexel = texel * min(u_blur, 12.0);')
    expect(DOTS_FRAGMENT_SHADER).toContain('vec3 applyDotsProcessing')
    expect(DOTS_FRAGMENT_SHADER).toContain('mix(color, 1.0 - color, u_processingInvert)')
    expect(DOTS_FRAGMENT_SHADER).toContain('color *= u_brightnessMap;')
    expect(DOTS_FRAGMENT_SHADER).toContain('u_edgeEnhance * 8.0')
    expect(DOTS_FRAGMENT_SHADER).toContain('if (u_quantizeColors > 0.0)')
    expect(DOTS_FRAGMENT_SHADER).toContain(
      'float levels = max(floor(u_quantizeColors + 0.5), 2.0);',
    )
    expect(DOTS_FRAGMENT_SHADER).toContain('u_shapeMatching')
    expect(DOTS_FRAGMENT_SHADER).toContain('vec3 applyDotsPostProcessing')
    expect(DOTS_FRAGMENT_SHADER.indexOf('vec3 dotsColor =')).toBeLessThan(
      DOTS_FRAGMENT_SHADER.indexOf('dotsColor = applyDotsProcessing('),
    )
    expect(DOTS_FRAGMENT_SHADER.indexOf('dotsColor = applyDotsProcessing(')).toBeLessThan(
      DOTS_FRAGMENT_SHADER.indexOf('applyDotsPostProcessing(dotsColor'),
    )

    const { material } = createFixture()
    applyDotsUniforms(material, {
      'processing-invert': true,
      'brightness-map': 1.75,
      'edge-enhance': 0.35,
      blur: 4.5,
      'quantize-colors': 1,
      'shape-matching': 0.6,
    })

    expect(material.uniforms.u_processingInvert.value).toBe(1)
    expect(material.uniforms.u_brightnessMap.value).toBe(1.75)
    expect(material.uniforms.u_edgeEnhance.value).toBe(0.35)
    expect(material.uniforms.u_blur.value).toBe(4.5)
    expect(material.uniforms.u_quantizeColors.value).toBe(1)
    expect(material.uniforms.u_shapeMatching.value).toBe(0.6)
  })

  it('maps the currently exposed shared Post controls without treating them as Dots settings', () => {
    const { material } = createFixture()

    applyDotsUniforms(material, {
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
    expect(material.uniforms.u_postChromatic.value).toBe(1)
    expect(material.uniforms.u_scanlines.value).toBe(1)
    expect(material.uniforms.u_vignette.value).toBe(1)
    expect(material.uniforms.u_crtCurve.value).toBe(1)
    expect(material.uniforms.u_phosphor.value).toBe(1)
  })

  it('disposes only its own material', () => {
    const { material, sourceTexture } = createFixture()
    const materialDispose = vi.spyOn(material, 'dispose')
    const sourceDispose = vi.spyOn(sourceTexture, 'dispose')

    disposeDotsShaderMaterial(material)

    expect(materialDispose).toHaveBeenCalledOnce()
    expect(sourceDispose).not.toHaveBeenCalled()
  })
})
