import { DataTexture, Vector2 } from 'three'
import { describe, expect, it, vi } from 'vitest'

import {
  VORONOI_FRAGMENT_SHADER,
  applyVoronoiUniforms,
  createVoronoiShaderMaterial,
  disposeVoronoiShaderMaterial,
} from './voronoi-material'

function createFixture() {
  const sourceTexture = new DataTexture()
  const material = createVoronoiShaderMaterial({
    controls: {},
    resolution: new Vector2(1280, 720),
    sourceSize: new Vector2(1024, 768),
    sourceTexture,
  })
  return { material, sourceTexture }
}

describe('Voronoi shader material', () => {
  it('owns an independent shader with exact Grainrad defaults', () => {
    const { material, sourceTexture } = createFixture()

    expect(material.uniforms.u_sourceTexture.value).toBe(sourceTexture)
    expect(material.uniforms.u_sourceSize.value.toArray()).toEqual([1024, 768])
    expect(material.uniforms.u_resolution.value.toArray()).toEqual([1280, 720])
    expect(material.uniforms.u_cellSize.value).toBe(30)
    expect(material.uniforms.u_edgeWidth.value).toBe(0.3)
    expect(material.uniforms.u_edgeColor.value).toEqual([16 / 255, 16 / 255, 16 / 255])
    expect(material.uniforms.u_cellShadow.value).toEqual([43 / 255, 45 / 255, 66 / 255])
    expect(material.uniforms.u_cellMidtone.value).toEqual([109 / 255, 89 / 255, 122 / 255])
    expect(material.uniforms.u_cellHighlight.value).toEqual([233 / 255, 196 / 255, 106 / 255])
    expect(material.uniforms.u_background.value).toEqual([1, 1, 1])
    expect(material.uniforms.u_fillCanvas.value).toBe(0)
    expect(material.uniforms.u_randomize.value).toBe(0.8)
    expect(material.uniforms.u_brightness.value).toBe(0)
    expect(material.uniforms.u_contrast.value).toBe(0)
    expect(material.uniforms.u_brightnessMap.value).toBe(1)
    expect(material.uniforms.u_time.value).toBe(0)
  })

  it('maps numeric controls and every direct color picker without clamping', () => {
    const { material } = createFixture()

    applyVoronoiUniforms(material, {
      'cell-size': 85,
      'edge-width': 0.65,
      'edge-color': '#123456',
      'cell-shadow': '#102030',
      'cell-midtone': '#405060',
      'cell-highlight': '#708090',
      background: '#abcdef',
      'fill-canvas': true,
      randomize: 0.35,
      brightness: 40,
      contrast: -25,
      'brightness-map': 1.4,
    })

    expect(material.uniforms.u_cellSize.value).toBe(85)
    expect(material.uniforms.u_edgeWidth.value).toBe(0.65)
    expect(material.uniforms.u_edgeColor.value).toEqual([0x12 / 255, 0x34 / 255, 0x56 / 255])
    expect(material.uniforms.u_cellShadow.value).toEqual([0x10 / 255, 0x20 / 255, 0x30 / 255])
    expect(material.uniforms.u_cellMidtone.value).toEqual([0x40 / 255, 0x50 / 255, 0x60 / 255])
    expect(material.uniforms.u_cellHighlight.value).toEqual([0x70 / 255, 0x80 / 255, 0x90 / 255])
    expect(material.uniforms.u_background.value).toEqual([0xab / 255, 0xcd / 255, 0xef / 255])
    expect(material.uniforms.u_fillCanvas.value).toBe(1)
    expect(material.uniforms.u_randomize.value).toBe(0.35)
    expect(material.uniforms.u_brightness.value).toBe(0.4)
    expect(material.uniforms.u_contrast.value).toBe(-0.25)
    expect(material.uniforms.u_brightnessMap.value).toBe(1.4)
  })

  it('rejects invalid direct colors and uses fallbacks', () => {
    const { material } = createFixture()

    applyVoronoiUniforms(material, {
      'cell-size': Number.NaN,
      'edge-color': 2,
    })

    expect(material.uniforms.u_cellSize.value).toBe(30)
    expect(material.uniforms.u_edgeColor.value).toEqual([16 / 255, 16 / 255, 16 / 255])
  })

  it('ports the exact correlated hash and randomized feature-point equation', () => {
    for (const marker of [
      'vec2 k = vec2(0.3183099, 0.3678794);',
      'vec2 pp = p * k + k.yx;',
      'float q = fract(pp.x * pp.y * (pp.x + pp.y));',
      'return fract(16.0 * k * q) * 2.0 - 1.0;',
      'voronoiHash2(integerCell) * randomness * 0.5;',
      'vec2 featurePoint = neighbor + 0.5 + randomOffset;',
    ]) {
      expect(VORONOI_FRAGMENT_SHADER).toContain(marker)
    }
  })

  it('searches the exact 3 by 3 neighborhood and tracks both closest distances', () => {
    expect(VORONOI_FRAGMENT_SHADER).toContain('float closestDistance = 8.0;')
    expect(VORONOI_FRAGMENT_SHADER).toContain('float secondClosestDistance = 8.0;')
    expect(VORONOI_FRAGMENT_SHADER).toContain('for (int y = -1; y <= 1; y++)')
    expect(VORONOI_FRAGMENT_SHADER).toContain('for (int x = -1; x <= 1; x++)')
    expect(VORONOI_FRAGMENT_SHADER).toContain(
      'return vec4(closestCell, closestDistance, secondClosestDistance);',
    )
  })

  it('keeps raw pixel cell size and the exact cell-space edge mask', () => {
    expect(VORONOI_FRAGMENT_SHADER).toContain('vec2 pixelPosition = v_uv * u_resolution;')
    expect(VORONOI_FRAGMENT_SHADER).toContain(
      'vec2 scaledPosition = pixelPosition / u_cellSize;',
    )
    expect(VORONOI_FRAGMENT_SHADER).toContain(
      'float edgeDistance = secondClosestDistance - closestDistance;',
    )
    expect(VORONOI_FRAGMENT_SHADER).toContain(
      'float interiorMask = smoothstep(0.0, u_edgeWidth * 0.3, edgeDistance);',
    )
  })

  it('ports the exact 25-sample mip-zero-equivalent Cell Average stencil', () => {
    for (const marker of [
      'for (int dy = -2; dy <= 2; dy++)',
      'for (int dx = -2; dx <= 2; dx++)',
      'vec2 sampleOffset = vec2(float(dx), float(dy)) * 0.2;',
      'averageColor += sampleVoronoiMipZero(sampleUv);',
      'sampleCount += 1.0;',
      'averageColor /= sampleCount;',
    ]) {
      expect(VORONOI_FRAGMENT_SHADER).toContain(marker)
    }
    expect(VORONOI_FRAGMENT_SHADER).toContain(
      'clamp(uv, vec2(0.0), vec2(1.0))',
    )
  })

  it('maps model-source tone into all three colors and composes the direct edge color before B/C', () => {
    expect(VORONOI_FRAGMENT_SHADER).toContain(
      'float cellTone = smoothstep(0.15, 0.9, sourceLuminance);',
    )
    expect(VORONOI_FRAGMENT_SHADER).toContain(
      'voronoiLuminance(texture2D(u_sourceTexture, v_uv).rgb)',
    )
    expect(VORONOI_FRAGMENT_SHADER).toContain('u_cellHighlight')
    expect(VORONOI_FRAGMENT_SHADER).toContain(
      'vec3 voronoiColor = mix(u_edgeColor, cellColor, interiorMask);',
    )
    expect(VORONOI_FRAGMENT_SHADER).toContain(
      '(1.0 + u_contrast) / (1.0 - 0.99 * u_contrast)',
    )
    expect(VORONOI_FRAGMENT_SHADER.indexOf('vec3 voronoiColor = mix')).toBeLessThan(
      VORONOI_FRAGMENT_SHADER.indexOf(
        'effectColor = applyVoronoiBrightnessContrast(effectColor);',
      ),
    )
  })

  it('applies every shared Processing control after the complete effect and before shared Post', () => {
    expect(VORONOI_FRAGMENT_SHADER).toContain('vec3 sampleVoronoiMipZero(vec2 uv)')
    expect(VORONOI_FRAGMENT_SHADER).toContain('if (u_blur <= 0.0)')
    expect(VORONOI_FRAGMENT_SHADER).toContain(
      'vec2 blurTexel = min(u_blur, 12.0) / max(u_sourceSize, vec2(1.0));',
    )
    expect(VORONOI_FRAGMENT_SHADER).toContain(
      'averageColor += sampleVoronoiMipZero(sampleUv);',
    )
    expect(VORONOI_FRAGMENT_SHADER).toContain(
      'color = mix(color, 1.0 - color, u_processingInvert);',
    )
    expect(VORONOI_FRAGMENT_SHADER).toContain('color *= u_brightnessMap;')
    expect(VORONOI_FRAGMENT_SHADER).toContain(
      'length(fwidth(vec2(luminance))) * u_edgeEnhance * 8.0',
    )
    expect(VORONOI_FRAGMENT_SHADER).toContain('if (u_quantizeColors >= 1.0)')
    expect(VORONOI_FRAGMENT_SHADER).toContain(
      'float levels = max(u_quantizeColors, 2.0);',
    )
    expect(VORONOI_FRAGMENT_SHADER).toContain(
      'color = mix(color, vec3(step(0.5, luminance)), u_shapeMatching);',
    )
    expect(VORONOI_FRAGMENT_SHADER).toContain('vec3 applyVoronoiPostProcessing')
    const effectIndex = VORONOI_FRAGMENT_SHADER.indexOf(
      'effectColor = applyVoronoiBrightnessContrast(effectColor);',
    )
    const processingIndex = VORONOI_FRAGMENT_SHADER.lastIndexOf(
      'effectColor = applyVoronoiProcessing(',
    )
    const postIndex = VORONOI_FRAGMENT_SHADER.lastIndexOf(
      'applyVoronoiPostProcessing(',
    )
    expect(effectIndex).toBeLessThan(processingIndex)
    expect(processingIndex).toBeLessThan(postIndex)
    const backgroundIndex = VORONOI_FRAGMENT_SHADER.lastIndexOf(
      'effectColor = mix(u_background, effectColor, mix(modelMask, 1.0, u_fillCanvas));',
    )
    expect(postIndex).toBeLessThan(backgroundIndex)
    expect(VORONOI_FRAGMENT_SHADER).toContain(
      'gl_FragColor = vec4(effectColor, 1.0);',
    )

    const { material } = createFixture()
    applyVoronoiUniforms(material, {
      'processing-invert': true,
      'brightness-map': 1.75,
      'edge-enhance': 0.6,
      blur: 3,
      'quantize-colors': 1,
      'shape-matching': 0.4,
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
    expect(material.uniforms.u_edgeEnhance.value).toBe(0.6)
    expect(material.uniforms.u_blur.value).toBe(3)
    expect(material.uniforms.u_quantizeColors.value).toBe(1)
    expect(material.uniforms.u_shapeMatching.value).toBe(0.4)
    expect(material.uniforms.u_bloom.value).toBe(1)
    expect(material.uniforms.u_postChromatic.value).toBe(1)
    expect(material.uniforms.u_scanlines.value).toBe(1)
    expect(material.uniforms.u_vignette.value).toBe(1)
    expect(material.uniforms.u_crtCurve.value).toBe(1)
    expect(material.uniforms.u_phosphor.value).toBe(1)
  })

  it('uses source dimensions as output resolution when none is supplied', () => {
    const material = createVoronoiShaderMaterial({
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

    disposeVoronoiShaderMaterial(material)

    expect(materialDispose).toHaveBeenCalledOnce()
    expect(sourceDispose).not.toHaveBeenCalled()
  })
})
