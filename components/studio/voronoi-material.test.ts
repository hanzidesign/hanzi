import { DataTexture, Vector2 } from 'three'
import { describe, expect, it, vi } from 'vitest'

import {
  VORONOI_COLOR_MODE_IDS,
  VORONOI_EDGE_COLOR_IDS,
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
    expect(material.uniforms.u_edgeColor.value).toBe(0)
    expect(material.uniforms.u_colorMode.value).toBe(0)
    expect(material.uniforms.u_randomize.value).toBe(0.8)
    expect(material.uniforms.u_brightness.value).toBe(0)
    expect(material.uniforms.u_contrast.value).toBe(0)
    expect(material.uniforms.u_time.value).toBe(0)
  })

  it('maps string control ids to the exact numeric uniform ABI without clamping', () => {
    const { material } = createFixture()

    applyVoronoiUniforms(material, {
      'cell-size': 85,
      'edge-width': 0.65,
      'edge-color': '2',
      'color-mode': '1',
      randomize: 0.35,
      brightness: 40,
      contrast: -25,
    })

    expect(VORONOI_EDGE_COLOR_IDS).toEqual({ '0': 0, '1': 1, '2': 2 })
    expect(VORONOI_COLOR_MODE_IDS).toEqual({ '0': 0, '1': 1, '2': 2 })
    expect(material.uniforms.u_cellSize.value).toBe(85)
    expect(material.uniforms.u_edgeWidth.value).toBe(0.65)
    expect(material.uniforms.u_edgeColor.value).toBe(2)
    expect(material.uniforms.u_colorMode.value).toBe(1)
    expect(material.uniforms.u_randomize.value).toBe(0.35)
    expect(material.uniforms.u_brightness.value).toBe(0.4)
    expect(material.uniforms.u_contrast.value).toBe(-0.25)
  })

  it('rejects numeric select values at the string control boundary and uses fallbacks', () => {
    const { material } = createFixture()

    applyVoronoiUniforms(material, {
      'cell-size': Number.NaN,
      'edge-color': 2,
      'color-mode': 1,
    })

    expect(material.uniforms.u_cellSize.value).toBe(30)
    expect(material.uniforms.u_edgeColor.value).toBe(0)
    expect(material.uniforms.u_colorMode.value).toBe(0)
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
      'cellColor = averageColor / sampleCount;',
    ]) {
      expect(VORONOI_FRAGMENT_SHADER).toContain(marker)
    }
    expect(VORONOI_FRAGMENT_SHADER).toContain(
      'clamp(uv, vec2(0.0), vec2(1.0))',
    )
  })

  it('uses the nominal unrandomized center for Center Sample and exact Gradient mixing', () => {
    expect(VORONOI_FRAGMENT_SHADER.match(/closestCell \+ 0\.5/g)).toHaveLength(3)
    expect(VORONOI_FRAGMENT_SHADER).toContain(
      'float gradientAmount = smoothstep(0.0, 0.7, closestDistance);',
    )
    expect(VORONOI_FRAGMENT_SHADER).toContain(
      'cellColor = mix(centerColor, currentColor, gradientAmount * 0.5);',
    )
  })

  it('ports Black, White, and actual Darkened edge modes before B/C', () => {
    expect(VORONOI_FRAGMENT_SHADER).toContain('edgePixelColor = vec3(0.0);')
    expect(VORONOI_FRAGMENT_SHADER).toContain('edgePixelColor = vec3(1.0);')
    expect(VORONOI_FRAGMENT_SHADER).toContain('edgePixelColor = cellColor * 0.3;')
    expect(VORONOI_FRAGMENT_SHADER).toContain(
      'vec3 effectColor = mix(edgePixelColor, cellColor, interiorMask);',
    )
    expect(VORONOI_FRAGMENT_SHADER).toContain(
      '(1.0 + u_contrast) / (1.0 - 0.99 * u_contrast)',
    )
    expect(VORONOI_FRAGMENT_SHADER.indexOf('vec3 effectColor = mix')).toBeLessThan(
      VORONOI_FRAGMENT_SHADER.indexOf(
        'effectColor = applyVoronoiBrightnessContrast(effectColor);',
      ),
    )
  })

  it('keeps Processing absent and maps shared Post after the complete effect', () => {
    for (const processingUniform of [
      'u_processingInvert',
      'u_brightnessMap',
      'u_edgeEnhance',
      'u_blur',
      'u_quantizeColors',
      'u_shapeMatching',
    ]) {
      expect(VORONOI_FRAGMENT_SHADER).not.toContain(processingUniform)
    }
    expect(VORONOI_FRAGMENT_SHADER).toContain('vec3 applyVoronoiPostProcessing')
    expect(
      VORONOI_FRAGMENT_SHADER.indexOf(
        'effectColor = applyVoronoiBrightnessContrast(effectColor);',
      ),
    ).toBeLessThan(VORONOI_FRAGMENT_SHADER.lastIndexOf('applyVoronoiPostProcessing('))

    const { material } = createFixture()
    applyVoronoiUniforms(material, {
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
