import { DataTexture, Vector2 } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { createMatrixRainGlyphAtlas } from './matrix-rain-charset'
import {
  MATRIX_RAIN_DIRECTION_IDS,
  MATRIX_RAIN_FRAGMENT_SHADER,
  applyMatrixRainUniforms,
  createMatrixRainShaderMaterial,
  disposeMatrixRainShaderMaterial,
} from './matrix-rain-material'

function createFixture() {
  const glyphAtlas = createMatrixRainGlyphAtlas('binary')
  const sourceTexture = new DataTexture()
  const material = createMatrixRainShaderMaterial({
    controls: {},
    glyphAtlas,
    resolution: new Vector2(1280, 720),
    sourceSize: new Vector2(1024, 768),
    sourceTexture,
  })

  return { glyphAtlas, material, sourceTexture }
}

describe('Matrix Rain shader material', () => {
  it('owns an independent source/atlas shader with Grainrad defaults and metadata', () => {
    const { glyphAtlas, material, sourceTexture } = createFixture()

    expect(material.uniforms.u_sourceTexture.value).toBe(sourceTexture)
    expect(material.uniforms.u_glyphAtlas.value).toBe(glyphAtlas.texture)
    expect(material.uniforms.u_sourceSize.value.toArray()).toEqual([1024, 768])
    expect(material.uniforms.u_resolution.value.toArray()).toEqual([1280, 720])
    expect(material.uniforms.u_atlasSize.value.toArray()).toEqual([320, 32])
    expect(material.uniforms.u_atlasCharacterSize.value.toArray()).toEqual([20, 32])
    expect(material.uniforms.u_atlasColumns.value).toBe(16)
    expect(material.uniforms.u_characterCount.value).toBe(3)
    expect(material.uniforms.u_cellSize.value).toBe(12)
    expect(material.uniforms.u_spacing.value).toBe(0)
    expect(material.uniforms.u_speed.value).toBe(1)
    expect(material.uniforms.u_trailLength.value).toBe(15)
    expect(material.uniforms.u_rainColor.value.getHexString()).toBe('00ff00')
  })

  it('maps every Matrix-local control in exact Grainrad units', () => {
    const { glyphAtlas, material } = createFixture()

    applyMatrixRainUniforms(material, {
      'bg-opacity': 0.65,
      'brightness': 37,
      'cell-size': 21,
      'contrast': -42,
      'direction': 'left',
      'glow': 1.7,
      'rain-color': '#12abef',
      'spacing': 0.35,
      'speed': 2.4,
      'threshold': 0.27,
      'trail-length': 24,
    }, glyphAtlas)

    expect(MATRIX_RAIN_DIRECTION_IDS).toEqual({ down: 0, up: 1, left: 2, right: 3 })
    expect(material.uniforms.u_cellSize.value).toBe(21)
    expect(material.uniforms.u_spacing.value).toBe(0.35)
    expect(material.uniforms.u_speed.value).toBe(2.4)
    expect(material.uniforms.u_trailLength.value).toBe(24)
    expect(material.uniforms.u_direction.value).toBe(2)
    expect(material.uniforms.u_glowIntensity.value).toBe(1.7)
    expect(material.uniforms.u_backgroundOpacity.value).toBe(0.65)
    expect(material.uniforms.u_brightness.value).toBe(0.37)
    expect(material.uniforms.u_contrast.value).toBe(-0.42)
    expect(material.uniforms.u_threshold.value).toBe(0.27)
    expect(material.uniforms.u_rainColor.value.getHexString()).toBe('12abef')
  })

  it('can replace atlas bindings without rebuilding the material', () => {
    const { material } = createFixture()
    const detailed = createMatrixRainGlyphAtlas('detailed')

    applyMatrixRainUniforms(material, {}, detailed)

    expect(material.uniforms.u_glyphAtlas.value).toBe(detailed.texture)
    expect(material.uniforms.u_atlasSize.value.toArray()).toEqual(detailed.size.toArray())
    expect(material.uniforms.u_atlasColumns.value).toBe(detailed.columns)
    expect(material.uniforms.u_characterCount.value).toBe(detailed.count)
  })

  it('maps every shared Processing and Post-Processing control', () => {
    const { glyphAtlas, material } = createFixture()

    applyMatrixRainUniforms(material, {
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
    }, glyphAtlas)

    expect(material.uniforms.u_processingInvert.value).toBe(1)
    expect(material.uniforms.u_brightnessMap.value).toBe(1.4)
    expect(material.uniforms.u_edgeEnhance.value).toBe(0.35)
    expect(material.uniforms.u_blur.value).toBe(3)
    expect(material.uniforms.u_quantizeColors.value).toBe(8)
    expect(material.uniforms.u_shapeMatching.value).toBe(0.25)
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

  it('preserves the exact Matrix stream, source, threshold, glyph, and glow equations', () => {
    expect(MATRIX_RAIN_FRAGMENT_SHADER).toContain('float dropSeed = columnIndex * 73.156 + float(dropIndex) * 31.71;')
    expect(MATRIX_RAIN_FRAGMENT_SHADER).toContain('float dropSpeed = 0.5 + matrixHash11(dropSeed) * 0.5;')
    expect(MATRIX_RAIN_FRAGMENT_SHADER).toContain('float dropPhase = matrixHash11(dropSeed + 17.3);')
    expect(MATRIX_RAIN_FRAGMENT_SHADER).toContain('float dropLength = trailLength * (0.7 + matrixHash11(dropSeed + 41.7) * 0.6);')
    expect(MATRIX_RAIN_FRAGMENT_SHADER).toContain('float headPosition = fract(time * speed * dropSpeed * 0.15 + dropPhase);')
    expect(MATRIX_RAIN_FRAGMENT_SHADER).toContain('float trailLength = u_trailLength / 50.0;')
    expect(MATRIX_RAIN_FRAGMENT_SHADER).toContain('float characterAnimationIndex = floor(characterSeed * 50.0 + u_time * 2.0);')
    expect(MATRIX_RAIN_FRAGMENT_SHADER).toContain('float aboveThreshold = step(u_threshold, cellBrightness);')
    expect(MATRIX_RAIN_FRAGMENT_SHADER).toContain('vec3 backgroundColor = adjustedSourceColor * u_backgroundOpacity * 0.1;')
    expect(MATRIX_RAIN_FRAGMENT_SHADER).toContain('headColor * characterVisibility * u_glowIntensity')
    expect(MATRIX_RAIN_FRAGMENT_SHADER).toContain('float margin = 0.05 + u_spacing * 0.15;')
  })

  it('runs the effect through Processing then Post-Processing and avoids built-in names', () => {
    expect(MATRIX_RAIN_FRAGMENT_SHADER).toContain('vec3 applyMatrixSharedProcessing')
    expect(MATRIX_RAIN_FRAGMENT_SHADER).toContain('vec3 applyMatrixSharedPostProcessing')
    expect(MATRIX_RAIN_FRAGMENT_SHADER.indexOf('applyMatrixSharedProcessing(effectColor')).toBeLessThan(
      MATRIX_RAIN_FRAGMENT_SHADER.indexOf('applyMatrixSharedPostProcessing(effectColor'),
    )
    expect(MATRIX_RAIN_FRAGMENT_SHADER).not.toContain('float luminance(')
    expect(MATRIX_RAIN_FRAGMENT_SHADER).toContain('float matrixRainLuminance(')
  })

  it('disposes only the material; atlas lifetime remains explicit and separate', () => {
    const { glyphAtlas, material } = createFixture()
    const materialDispose = vi.spyOn(material, 'dispose')
    const atlasDispose = vi.spyOn(glyphAtlas.texture, 'dispose')

    disposeMatrixRainShaderMaterial(material)

    expect(materialDispose).toHaveBeenCalledOnce()
    expect(atlasDispose).not.toHaveBeenCalled()
  })
})
