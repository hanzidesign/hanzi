import { DataTexture, Vector2 } from 'three'
import { describe, expect, it } from 'vitest'

import {
  HALFTONE_FRAGMENT_SHADER,
  HALFTONE_SHAPE_IDS,
  applyHalftoneUniforms,
  createHalftoneShaderMaterial,
} from './halftone-material'

describe('Halftone shader material', () => {
  it('samples the Character render texture on a Studio halftone grid', () => {
    const sourceTexture = new DataTexture()
    const material = createHalftoneShaderMaterial({
      controls: {},
      resolution: new Vector2(1280, 720),
      sourceSize: new Vector2(1024, 768),
      sourceTexture,
    })

    expect(material.uniforms.u_sourceTexture.value).toBe(sourceTexture)
    expect(material.uniforms.u_sourceSize.value.toArray()).toEqual([1024, 768])
    expect(material.uniforms.u_resolution.value.toArray()).toEqual([1280, 720])
    expect(material.uniforms.u_spacing.value).toBe(8)
    expect(HALFTONE_FRAGMENT_SHADER).toContain('texture2D(u_sourceTexture')
    expect(HALFTONE_FRAGMENT_SHADER).toContain('halftonePattern')
  })

  it('uses source dimensions as the output resolution when none is supplied', () => {
    const material = createHalftoneShaderMaterial({
      controls: {},
      sourceSize: new Vector2(640, 360),
      sourceTexture: new DataTexture(),
    })

    expect(material.uniforms.u_resolution.value.toArray()).toEqual([640, 360])
  })

  it('maps every effect-local control using Studio units and enum ids', () => {
    const material = createHalftoneShaderMaterial({
      controls: {},
      sourceTexture: new DataTexture(),
    })

    applyHalftoneUniforms(material, {
      'angle': 75,
      'background': '#102030',
      'brightness': 24,
      'color-mode': 'color',
      'contrast': -18,
      'dot-scale': 1.7,
      'foreground': '#fedcba',
      'invert': true,
      'shape': 'diamond',
      'spacing': 13,
    })

    expect(HALFTONE_SHAPE_IDS).toEqual({
      circle: 0,
      square: 1,
      diamond: 2,
      line: 3,
    })
    expect(material.uniforms.u_shape.value).toBe(2)
    expect(material.uniforms.u_dotScale.value).toBe(1.7)
    expect(material.uniforms.u_spacing.value).toBe(13)
    expect(material.uniforms.u_angle.value).toBe(75)
    expect(material.uniforms.u_invert.value).toBe(1)
    expect(material.uniforms.u_colorMode.value).toBe(1)
    expect(material.uniforms.u_foreground.value.getHexString()).toBe('fedcba')
    expect(material.uniforms.u_background.value.getHexString()).toBe('102030')
    expect(material.uniforms.u_brightness.value).toBe(0.24)
    expect(material.uniforms.u_contrast.value).toBe(-0.18)
  })

  it('maps all shared Processing and Post-Processing controls', () => {
    const material = createHalftoneShaderMaterial({
      controls: {},
      sourceTexture: new DataTexture(),
    })

    applyHalftoneUniforms(material, {
      'processing-invert': true,
      'brightness-map': 1.4,
      'edge-enhance': 0.35,
      'blur': 3,
      'quantize-colors': 8,
      'shape-matching': 0.25,
      'bloom': true,
      'grain-intensity': 61,
      'grain-size': 4,
      'grain-speed': 72,
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
  })

  it('runs Halftone output through the same shared Processing and Post pipeline as Dithering', () => {
    expect(HALFTONE_FRAGMENT_SHADER).toContain('vec3 applySharedProcessing')
    expect(HALFTONE_FRAGMENT_SHADER).toContain('vec3 applySharedPostProcessing')
    expect(HALFTONE_FRAGMENT_SHADER).toContain(
      'effectColor = applySharedProcessing(effectColor, sourceLuminance);',
    )
    expect(HALFTONE_FRAGMENT_SHADER).toContain(
      'effectColor = applySharedPostProcessing(effectColor, sourceLuminance, v_uv);',
    )
    expect(HALFTONE_FRAGMENT_SHADER.indexOf('applySharedProcessing(effectColor')).toBeLessThan(
      HALFTONE_FRAGMENT_SHADER.indexOf('applySharedPostProcessing(effectColor'),
    )
  })

  it('preserves Studio shape, luminance, radius, rotation, and Dot Scale semantics', () => {
    expect(HALFTONE_FRAGMENT_SHADER).toContain('dot(color, vec3(0.299, 0.587, 0.114))')
    expect(HALFTONE_FRAGMENT_SHADER).toContain(
      'float radians = u_angle * 0.017453292519943295;',
    )
    expect(HALFTONE_FRAGMENT_SHADER).toContain('distanceToCenter = length(nearest);')
    expect(HALFTONE_FRAGMENT_SHADER).toContain(
      'distanceToCenter = max(abs(nearest.x), abs(nearest.y));',
    )
    expect(HALFTONE_FRAGMENT_SHADER).toContain(
      'distanceToCenter = abs(nearest.x) + abs(nearest.y);',
    )
    expect(HALFTONE_FRAGMENT_SHADER).toContain('distanceToCenter = abs(nearest.y);')
    expect(HALFTONE_FRAGMENT_SHADER).toContain(
      'float radius = sqrt(max(value, 0.0)) * 0.5;',
    )
    expect(HALFTONE_FRAGMENT_SHADER.match(/u_dotScale/g)).toHaveLength(2)
    expect(HALFTONE_FRAGMENT_SHADER).toContain(') * 0.02 * u_dotScale;')
  })

  it('does not redeclare Three.js built-in shader helpers', () => {
    expect(HALFTONE_FRAGMENT_SHADER).not.toContain('float luminance(')
    expect(HALFTONE_FRAGMENT_SHADER).toContain('float halftoneLuminance(')
  })
})
