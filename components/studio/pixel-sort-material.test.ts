import { DataTexture, Vector2 } from 'three'
import { describe, expect, it, vi } from 'vitest'

import {
  PIXEL_SORT_DIRECTION_IDS,
  PIXEL_SORT_FRAGMENT_SHADER,
  PIXEL_SORT_MAX_STREAK_STEPS,
  PIXEL_SORT_MODE_IDS,
  PIXEL_SORT_SAMPLE_COUNT,
  applyPixelSortUniforms,
  createPixelSortShaderMaterial,
  disposePixelSortShaderMaterial,
} from './pixel-sort-material'

function createFixture() {
  const sourceTexture = new DataTexture()
  const material = createPixelSortShaderMaterial({
    controls: {},
    resolution: new Vector2(1280, 720),
    sourceSize: new Vector2(1024, 768),
    sourceTexture,
  })
  return { material, sourceTexture }
}

describe('Pixel Sort shader material', () => {
  it('owns an independent source shader with exact Grainrad defaults', () => {
    const { material, sourceTexture } = createFixture()

    expect(material.uniforms.u_sourceTexture.value).toBe(sourceTexture)
    expect(material.uniforms.u_sourceSize.value.toArray()).toEqual([1024, 768])
    expect(material.uniforms.u_resolution.value.toArray()).toEqual([1280, 720])
    expect(material.uniforms.u_direction.value).toBe(0)
    expect(material.uniforms.u_mode.value).toBe(0)
    expect(material.uniforms.u_threshold.value).toBe(0.25)
    expect(material.uniforms.u_streakLength.value).toBe(100)
    expect(material.uniforms.u_intensity.value).toBe(0.8)
    expect(material.uniforms.u_randomness.value).toBe(0.3)
    expect(material.uniforms.u_reverse.value).toBe(0)
    expect(material.uniforms.u_brightness.value).toBe(0)
    expect(material.uniforms.u_contrast.value).toBe(0)
  })

  it('uses source dimensions as output resolution when none is supplied', () => {
    const material = createPixelSortShaderMaterial({
      controls: {},
      sourceSize: new Vector2(640, 360),
      sourceTexture: new DataTexture(),
    })

    expect(material.uniforms.u_resolution.value.toArray()).toEqual([640, 360])
  })

  it('maps every Pixel Sort control in exact production units and ids', () => {
    const { material } = createFixture()

    applyPixelSortUniforms(material, {
      direction: 'diagonal',
      'sort-mode': 'saturation',
      threshold: 0.45,
      'streak-length': 270,
      intensity: 0.65,
      randomness: 0.9,
      reverse: true,
      brightness: 40,
      contrast: -25,
    })

    expect(PIXEL_SORT_DIRECTION_IDS).toEqual({ horizontal: 0, vertical: 1, diagonal: 2 })
    expect(PIXEL_SORT_MODE_IDS).toEqual({ brightness: 0, hue: 1, saturation: 2 })
    expect(material.uniforms.u_direction.value).toBe(2)
    expect(material.uniforms.u_mode.value).toBe(2)
    expect(material.uniforms.u_threshold.value).toBe(0.45)
    expect(material.uniforms.u_streakLength.value).toBe(270)
    expect(material.uniforms.u_intensity.value).toBe(0.65)
    expect(material.uniforms.u_randomness.value).toBe(0.9)
    expect(material.uniforms.u_reverse.value).toBe(1)
    expect(material.uniforms.u_brightness.value).toBe(0.4)
    expect(material.uniforms.u_contrast.value).toBe(-0.25)
  })

  it('keeps the exact fixed production work limits', () => {
    expect(PIXEL_SORT_MAX_STREAK_STEPS).toBe(300)
    expect(PIXEL_SORT_SAMPLE_COUNT).toBe(24)
    expect(PIXEL_SORT_FRAGMENT_SHADER).toContain('const int PIXEL_SORT_MAX_STREAK_STEPS = 300;')
    expect(PIXEL_SORT_FRAGMENT_SHADER).toContain('const int PIXEL_SORT_SAMPLE_COUNT = 24;')
  })

  it('preserves the mislabeled production mode predicates and always sorts by Rec.601 luminance', () => {
    expect(PIXEL_SORT_FRAGMENT_SHADER).toContain('float blackThreshold = threshold * 0.25;')
    expect(PIXEL_SORT_FRAGMENT_SHADER).toContain('return pixelSortLuminance(color) > blackThreshold;')
    expect(PIXEL_SORT_FRAGMENT_SHADER).toContain('float whiteThreshold = 1.0 - threshold * 0.25;')
    expect(PIXEL_SORT_FRAGMENT_SHADER).toContain('return pixelSortLuminance(color) < whiteThreshold;')
    expect(PIXEL_SORT_FRAGMENT_SHADER).toContain('return pixelSortBrightness(color) > threshold;')
    expect(PIXEL_SORT_FRAGMENT_SHADER).toContain('return pixelSortLuminance(color) <= blackThreshold;')
    expect(PIXEL_SORT_FRAGMENT_SHADER).toContain('return pixelSortLuminance(color) >= whiteThreshold;')
    expect(PIXEL_SORT_FRAGMENT_SHADER).toContain('return pixelSortBrightness(color) <= threshold;')
    expect(PIXEL_SORT_FRAGMENT_SHADER).toContain('sortValues[i] = pixelSortLuminance(sampleColor);')
    expect(PIXEL_SORT_FRAGMENT_SHADER).not.toContain('float luminance(')
  })

  it('ports line randomness, directions, raw span scans, and terminal inclusion exactly', () => {
    expect(PIXEL_SORT_FRAGMENT_SHADER).toContain('float lineRand = pixelSortHash11(lineCoord * 0.173);')
    expect(PIXEL_SORT_FRAGMENT_SHADER).toContain(
      'float thresholdVar = u_threshold * (1.0 + (lineRand - 0.5) * u_randomness * 0.5);',
    )
    expect(PIXEL_SORT_FRAGMENT_SHADER).toContain('direction = normalize(vec2(1.0, 1.0));')
    expect(PIXEL_SORT_FRAGMENT_SHADER).toContain('lineCoord = floor(pixel.x - pixel.y);')
    expect(PIXEL_SORT_FRAGMENT_SHADER).toContain('vec3 currentColor = texture2D(u_sourceTexture, v_uv).rgb;')
    expect(PIXEL_SORT_FRAGMENT_SHADER).toContain(
      'for (int i = 1; i <= PIXEL_SORT_MAX_STREAK_STEPS; i++)',
    )
    expect(PIXEL_SORT_FRAGMENT_SHADER).toContain('if (float(i) > u_streakLength) break;')
    expect(PIXEL_SORT_FRAGMENT_SHADER).toContain('spanStartDist = i;')
    expect(PIXEL_SORT_FRAGMENT_SHADER).toContain('spanEndDist = i;')
    expect(PIXEL_SORT_FRAGMENT_SHADER).toContain('vec3 checkColor = texture2D(u_sourceTexture, checkUV).rgb;')
  })

  it('ports capped sampling, luminance bubble sort, interpolation, and intensity exactly', () => {
    expect(PIXEL_SORT_FRAGMENT_SHADER).toContain('if (spanSize < 3)')
    expect(PIXEL_SORT_FRAGMENT_SHADER).toContain(
      'int actualSamples = min(spanSize, PIXEL_SORT_SAMPLE_COUNT);',
    )
    expect(PIXEL_SORT_FRAGMENT_SHADER).toContain(
      'float t = float(i) / float(actualSamples - 1);',
    )
    expect(PIXEL_SORT_FRAGMENT_SHADER).toContain(
      'float sampleOffset = float(-spanStartDist) + t * float(spanSize);',
    )
    expect(PIXEL_SORT_FRAGMENT_SHADER).toContain('sampleUV = clamp(sampleUV, vec2(0.001), vec2(0.999));')
    expect(PIXEL_SORT_FRAGMENT_SHADER).toContain('colors[i] = currentColor;')
    expect(PIXEL_SORT_FRAGMENT_SHADER).toContain('sortValues[i] = pixelSortLuminance(currentColor);')
    expect(PIXEL_SORT_FRAGMENT_SHADER).toContain('sortValues[i] > sortValues[i + 1]')
    expect(PIXEL_SORT_FRAGMENT_SHADER).toContain('sortValues[i] < sortValues[i + 1]')
    expect(PIXEL_SORT_FRAGMENT_SHADER).toContain('vec3 sortedColor = mix(colors[idxLow], colors[idxHigh], fraction);')
    expect(PIXEL_SORT_FRAGMENT_SHADER).toContain(
      'effectColor = mix(currentColor, sortedColor, u_intensity);',
    )
  })

  it('applies brightness/contrast only to final effect output and Post after it', () => {
    expect(PIXEL_SORT_FRAGMENT_SHADER).toContain(
      '(1.0 + u_contrast) / (1.0 - u_contrast * 0.99)',
    )
    expect(PIXEL_SORT_FRAGMENT_SHADER).toContain(
      'effectColor = applyPixelSortBrightnessContrast(effectColor);',
    )
    expect(PIXEL_SORT_FRAGMENT_SHADER).not.toContain(
      'currentColor = applyPixelSortBrightnessContrast(currentColor)',
    )
    expect(PIXEL_SORT_FRAGMENT_SHADER).not.toContain(
      'sampleColor = applyPixelSortBrightnessContrast(sampleColor)',
    )
    expect(PIXEL_SORT_FRAGMENT_SHADER).toContain('vec3 applyPixelSortPostProcessing')
    expect(PIXEL_SORT_FRAGMENT_SHADER.indexOf('effectColor = applyPixelSortBrightnessContrast')).toBeLessThan(
      PIXEL_SORT_FRAGMENT_SHADER.indexOf('effectColor = applyPixelSortPostProcessing('),
    )
  })

  it('keeps Grainrad Processing controls as no-ops and maps shared Post controls', () => {
    for (const processingUniform of [
      'u_processingInvert',
      'u_brightnessMap',
      'u_edgeEnhance',
      'u_blur',
      'u_quantizeColors',
      'u_shapeMatching',
    ]) {
      expect(PIXEL_SORT_FRAGMENT_SHADER).not.toContain(processingUniform)
    }

    const { material } = createFixture()
    applyPixelSortUniforms(material, {
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

  it('disposes only its own material', () => {
    const { material, sourceTexture } = createFixture()
    const materialDispose = vi.spyOn(material, 'dispose')
    const sourceDispose = vi.spyOn(sourceTexture, 'dispose')

    disposePixelSortShaderMaterial(material)

    expect(materialDispose).toHaveBeenCalledOnce()
    expect(sourceDispose).not.toHaveBeenCalled()
  })
})
