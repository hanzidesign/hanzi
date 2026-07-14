import { describe, expect, it, vi } from 'vitest'
import { Texture, Vector2 } from 'three'

import {
  EDGE_DETECTION_FRAGMENT_SHADER,
  applyEdgeDetectionUniforms,
  createEdgeDetectionShaderMaterial,
  disposeEdgeDetectionShaderMaterial,
} from './edge-detection-material'

describe('Edge Detection shader material', () => {
  it('maps exact production ids, raw units, normalized adjustments, and colors', () => {
    const material = createEdgeDetectionShaderMaterial({ controls: {}, sourceTexture: new Texture() })
    expect(material.uniforms.u_brightnessMap.value).toBe(1)
    applyEdgeDetectionUniforms(material, {
      algorithm: 'laplacian', threshold: 0.65, 'line-width': 3.5, invert: true,
      brightness: 40, contrast: -25, 'edge-color': '#123456', background: '#abcdef',
      'color-mode': 'original',
      'brightness-map': 1.4,
    })
    expect(material.uniforms.u_algorithm.value).toBe(2)
    expect(material.uniforms.u_threshold.value).toBe(0.65)
    expect(material.uniforms.u_lineWidth.value).toBe(3.5)
    expect(material.uniforms.u_invert.value).toBe(1)
    expect(material.uniforms.u_brightness.value).toBe(0.4)
    expect(material.uniforms.u_contrast.value).toBe(-0.25)
    expect(material.uniforms.u_colorMode.value).toBe(1)
    expect(material.uniforms.u_brightnessMap.value).toBe(1.4)
    expect(material.uniforms.u_edgeColor.value.getHexString()).toBe('123456')
    expect(material.uniforms.u_background.value.getHexString()).toBe('abcdef')
  })

  it('keeps source and output sizes independently owned', () => {
    const sourceSize = new Vector2(320, 240)
    const resolution = new Vector2(640, 480)
    const material = createEdgeDetectionShaderMaterial({ controls: {}, sourceTexture: new Texture(), sourceSize, resolution })
    expect(material.uniforms.u_sourceSize.value).not.toBe(sourceSize)
    expect(material.uniforms.u_resolution.value).not.toBe(resolution)
    expect(material.uniforms.u_sourceSize.value.toArray()).toEqual([320, 240])
    expect(material.uniforms.u_resolution.value.toArray()).toEqual([640, 480])
  })

  it('locks nested Gaussian, coarse/fine algorithms and the hybrid Prewitt quirk', () => {
    expect(EDGE_DETECTION_FRAGMENT_SHADER).toContain('edgeGaussianLuminance')
    expect(EDGE_DETECTION_FRAGMENT_SHADER).toContain('* 0.0625')
    expect(EDGE_DETECTION_FRAGMENT_SHADER).toContain('* 0.25')
    expect(EDGE_DETECTION_FRAGMENT_SHADER).toContain('float coarseEdge = edgeDetector')
    expect(EDGE_DETECTION_FRAGMENT_SHADER).toContain('float fineAlgorithm = u_algorithm > 1.5 ? 2.0 : 0.0')
    expect(EDGE_DETECTION_FRAGMENT_SHADER).toContain('float combinedEdge = max(coarseEdge, fineEdge * 0.7)')
  })

  it('locks exact B/C, detector stride, softness, mask, and color branches', () => {
    expect(EDGE_DETECTION_FRAGMENT_SHADER).toContain('(1.0 + u_contrast) / (1.0 - 0.99 * u_contrast)')
    expect(EDGE_DETECTION_FRAGMENT_SHADER).toContain('vec2 pixelSize = vec2(u_lineWidth) / u_resolution')
    expect(EDGE_DETECTION_FRAGMENT_SHADER).toContain('float softness = u_threshold * 0.3')
    expect(EDGE_DETECTION_FRAGMENT_SHADER).toContain('smoothstep(u_threshold - softness, u_threshold + softness, combinedEdge)')
    expect(EDGE_DETECTION_FRAGMENT_SHADER).toContain('vec3 foreground = u_colorMode > 0.5 ? processedOriginal : u_edgeColor')
    expect(EDGE_DETECTION_FRAGMENT_SHADER).toContain('mix(u_background, foreground, mask)')
  })

  it('maps and consumes every Processing control between Edge Detection and Post', () => {
    expect(EDGE_DETECTION_FRAGMENT_SHADER).toContain('vec3 edgeSourceSample')
    expect(EDGE_DETECTION_FRAGMENT_SHADER).toContain('edgeSourceSample(uv + vec2(blurTexel.x, 0.0))')
    expect(EDGE_DETECTION_FRAGMENT_SHADER).toContain('edgeSourceSample(uv - vec2(blurTexel.x, 0.0))')
    expect(EDGE_DETECTION_FRAGMENT_SHADER).toContain('edgeSourceSample(uv + vec2(0.0, blurTexel.y))')
    expect(EDGE_DETECTION_FRAGMENT_SHADER).toContain('edgeSourceSample(uv - vec2(0.0, blurTexel.y))')
    for (const name of [
      'u_processingInvert', 'u_brightnessMap', 'u_edgeEnhance', 'u_blur',
      'u_quantizeColors', 'u_shapeMatching',
    ]) {
      expect(EDGE_DETECTION_FRAGMENT_SHADER.split(name).length).toBeGreaterThan(2)
    }
    expect(EDGE_DETECTION_FRAGMENT_SHADER).toContain('if (u_quantizeColors >= 1.0)')
    expect(EDGE_DETECTION_FRAGMENT_SHADER).toContain('max(u_quantizeColors, 2.0)')
    expect(EDGE_DETECTION_FRAGMENT_SHADER).toContain('applyEdgeDetectionPostProcessing')
    expect(EDGE_DETECTION_FRAGMENT_SHADER.indexOf('mix(u_background, foreground, mask)')).toBeLessThan(
      EDGE_DETECTION_FRAGMENT_SHADER.indexOf('effectColor = applyEdgeDetectionProcessing'),
    )
    expect(EDGE_DETECTION_FRAGMENT_SHADER.indexOf('effectColor = applyEdgeDetectionProcessing')).toBeLessThan(
      EDGE_DETECTION_FRAGMENT_SHADER.lastIndexOf('applyEdgeDetectionPostProcessing(effectColor'),
    )

    const material = createEdgeDetectionShaderMaterial({ controls: {}, sourceTexture: new Texture() })
    applyEdgeDetectionUniforms(material, {
      'processing-invert': true, 'brightness-map': 1.4, 'edge-enhance': 0.35,
      blur: 3, 'quantize-colors': 1, 'shape-matching': 0.25,
    })
    expect(material.uniforms.u_processingInvert.value).toBe(1)
    expect(material.uniforms.u_brightnessMap.value).toBe(1.4)
    expect(material.uniforms.u_edgeEnhance.value).toBe(0.35)
    expect(material.uniforms.u_blur.value).toBe(3)
    expect(material.uniforms.u_quantizeColors.value).toBe(1)
    expect(material.uniforms.u_shapeMatching.value).toBe(0.25)
  })

  it('maps shared Post uniforms and disposes once', () => {
    const material = createEdgeDetectionShaderMaterial({ controls: {}, sourceTexture: new Texture() })
    applyEdgeDetectionUniforms(material, {
      bloom: true, 'grain-intensity': 20, 'grain-size': 4, 'grain-speed': 60,
      chromatic: true, scanlines: true, vignette: true, 'crt-curve': true, phosphor: true,
    })
    expect(material.uniforms.u_bloom.value).toBe(1)
    expect(material.uniforms.u_grainIntensity.value).toBe(20)
    expect(material.uniforms.u_postChromatic.value).toBe(1)
    const spy = vi.spyOn(material, 'dispose')
    disposeEdgeDetectionShaderMaterial(material)
    expect(spy).toHaveBeenCalledOnce()
  })
})
