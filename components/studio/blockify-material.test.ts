import { DataTexture, Vector2 } from 'three'
import { describe, expect, it, vi } from 'vitest'

import {
  BLOCKIFY_COLOR_MODE_IDS,
  BLOCKIFY_FRAGMENT_SHADER,
  BLOCKIFY_STYLE_IDS,
  applyBlockifyUniforms,
  createBlockifyShaderMaterial,
  disposeBlockifyShaderMaterial,
} from './blockify-material'

function createFixture() {
  const sourceTexture = new DataTexture()
  const material = createBlockifyShaderMaterial({
    controls: {},
    resolution: new Vector2(1280, 720),
    sourceSize: new Vector2(1024, 768),
    sourceTexture,
  })
  return { material, sourceTexture }
}

describe('Blockify shader material', () => {
  it('owns an independent source shader with exact Grainrad defaults', () => {
    const { material, sourceTexture } = createFixture()

    expect(material.uniforms.u_sourceTexture.value).toBe(sourceTexture)
    expect(material.uniforms.u_sourceSize.value.toArray()).toEqual([1024, 768])
    expect(material.uniforms.u_resolution.value.toArray()).toEqual([1280, 720])
    expect(material.uniforms.u_style.value).toBe(0)
    expect(material.uniforms.u_blockSize.value).toBe(8)
    expect(material.uniforms.u_borderWidth.value).toBe(1)
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

  it('maps every Blockify-local control in exact production units and ids', () => {
    const { material } = createFixture()

    applyBlockifyUniforms(material, {
      style: 'outline',
      'block-size': 17,
      'border-width': 2.5,
      brightness: 40,
      contrast: -25,
      'color-mode': 'grayscale',
      foreground: '#123456',
      background: '#abcdef',
    })

    expect(BLOCKIFY_STYLE_IDS).toEqual({ full: 0, shaded: 1, outline: 2 })
    expect(BLOCKIFY_COLOR_MODE_IDS).toEqual({ color: 0, mono: 1, grayscale: 1 })
    expect(material.uniforms.u_style.value).toBe(2)
    expect(material.uniforms.u_blockSize.value).toBe(17)
    expect(material.uniforms.u_borderWidth.value).toBe(2.5)
    expect(material.uniforms.u_brightness.value).toBe(0.4)
    expect(material.uniforms.u_contrast.value).toBe(-0.25)
    expect(material.uniforms.u_colorMode.value).toBe(1)
    expect(material.uniforms.u_foreground.value.getHexString()).toBe('123456')
    expect(material.uniforms.u_background.value.getHexString()).toBe('abcdef')
  })

  it('samples one linear-clamped block center and adjusts it before style and grayscale', () => {
    expect(BLOCKIFY_FRAGMENT_SHADER).toContain('vec2 pixelPos = v_uv * u_resolution;')
    expect(BLOCKIFY_FRAGMENT_SHADER).toContain(
      'vec2 blockPos = floor(pixelPos / u_blockSize);',
    )
    expect(BLOCKIFY_FRAGMENT_SHADER).toContain(
      'vec2 blockCenter = (blockPos + 0.5) * u_blockSize;',
    )
    expect(BLOCKIFY_FRAGMENT_SHADER).toContain(
      'vec2 blockUv = blockCenter / u_resolution;',
    )
    expect(BLOCKIFY_FRAGMENT_SHADER).toContain(
      'vec3 color = sampleBlockifySource(blockUv);',
    )
    expect(BLOCKIFY_FRAGMENT_SHADER).toContain('color = color + u_brightness;')
    expect(BLOCKIFY_FRAGMENT_SHADER).toContain(
      '(1.0 + u_contrast) / (1.0 - 0.99 * u_contrast)',
    )
    expect(BLOCKIFY_FRAGMENT_SHADER).toContain(
      'color = clamp((color - 0.5) * factor + 0.5, 0.0, 1.0);',
    )
    expect(BLOCKIFY_FRAGMENT_SHADER).toContain(
      'float gray = blockifyLuminance(color);',
    )
  })

  it('ports fixed shaded blocks and strict Outline edges with Foreground/Background roles', () => {
    expect(BLOCKIFY_FRAGMENT_SHADER).toContain(
      'vec2 local = (pixelPos - blockPos * u_blockSize) / u_blockSize;',
    )
    expect(BLOCKIFY_FRAGMENT_SHADER).toContain(
      'float shade = 0.9 + 0.1 * (1.0 - length(local - 0.5) * 1.4);',
    )
    expect(BLOCKIFY_FRAGMENT_SHADER).toContain(
      'vec2 localPix = pixelPos - blockPos * u_blockSize;',
    )
    expect(BLOCKIFY_FRAGMENT_SHADER).toContain('localPix.x < u_borderWidth')
    expect(BLOCKIFY_FRAGMENT_SHADER).toContain(
      'localPix.x > u_blockSize - u_borderWidth',
    )
    expect(BLOCKIFY_FRAGMENT_SHADER).toContain('localPix.y < u_borderWidth')
    expect(BLOCKIFY_FRAGMENT_SHADER).toContain(
      'localPix.y > u_blockSize - u_borderWidth',
    )
    expect(BLOCKIFY_FRAGMENT_SHADER).not.toContain('localPix.x <= u_borderWidth')
    expect(BLOCKIFY_FRAGMENT_SHADER).not.toContain('localPix.y <= u_borderWidth')
    expect(BLOCKIFY_FRAGMENT_SHADER).toContain('mix(u_background, u_foreground, gray)')
    expect(BLOCKIFY_FRAGMENT_SHADER.indexOf('color = color + u_brightness;')).toBeLessThan(
      BLOCKIFY_FRAGMENT_SHADER.indexOf('mix(u_background, u_foreground, gray)'),
    )
  })

  it('maps and consumes every Processing control before shared Post', () => {
    expect(BLOCKIFY_FRAGMENT_SHADER).toContain('vec3 sampleBlockifySource')
    expect(BLOCKIFY_FRAGMENT_SHADER).toContain('vec2 blurTexel = texel * min(u_blur, 12.0);')
    expect(BLOCKIFY_FRAGMENT_SHADER).toContain('vec3 applyBlockifyProcessing')
    expect(BLOCKIFY_FRAGMENT_SHADER).toContain('mix(color, 1.0 - color, u_processingInvert)')
    expect(BLOCKIFY_FRAGMENT_SHADER).toContain('color *= u_brightnessMap;')
    expect(BLOCKIFY_FRAGMENT_SHADER).toContain('u_edgeEnhance * 8.0')
    expect(BLOCKIFY_FRAGMENT_SHADER).toContain('if (u_quantizeColors > 0.0)')
    expect(BLOCKIFY_FRAGMENT_SHADER).toContain(
      'float levels = max(floor(u_quantizeColors + 0.5), 2.0);',
    )
    expect(BLOCKIFY_FRAGMENT_SHADER).toContain('u_shapeMatching')
    expect(BLOCKIFY_FRAGMENT_SHADER).toContain('vec3 applyBlockifyPostProcessing')
    expect(BLOCKIFY_FRAGMENT_SHADER.indexOf('mix(u_background, u_foreground, gray)')).toBeLessThan(
      BLOCKIFY_FRAGMENT_SHADER.indexOf('effectColor = applyBlockifyProcessing('),
    )
    expect(BLOCKIFY_FRAGMENT_SHADER.indexOf('effectColor = applyBlockifyProcessing(')).toBeLessThan(
      BLOCKIFY_FRAGMENT_SHADER.indexOf('applyBlockifyPostProcessing(effectColor'),
    )

    const { material } = createFixture()
    applyBlockifyUniforms(material, {
      'processing-invert': true,
      'brightness-map': 1.75,
      'edge-enhance': 0.35,
      blur: 4.5,
      'quantize-colors': 1,
      'shape-matching': 0.6,
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

    expect(material.uniforms.u_processingInvert.value).toBe(1)
    expect(material.uniforms.u_brightnessMap.value).toBe(1.75)
    expect(material.uniforms.u_edgeEnhance.value).toBe(0.35)
    expect(material.uniforms.u_blur.value).toBe(4.5)
    expect(material.uniforms.u_quantizeColors.value).toBe(1)
    expect(material.uniforms.u_shapeMatching.value).toBe(0.6)
    expect(material.uniforms.u_bloom.value).toBe(1)
    expect(material.uniforms.u_postChromatic.value).toBe(1)
    expect(material.uniforms.u_scanlines.value).toBe(1)
    expect(material.uniforms.u_vignette.value).toBe(1)
    expect(material.uniforms.u_crtCurve.value).toBe(1)
    expect(material.uniforms.u_phosphor.value).toBe(1)
  })

  it('uses source dimensions as output resolution when none is supplied', () => {
    const material = createBlockifyShaderMaterial({
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

    disposeBlockifyShaderMaterial(material)

    expect(materialDispose).toHaveBeenCalledOnce()
    expect(sourceDispose).not.toHaveBeenCalled()
  })
})
