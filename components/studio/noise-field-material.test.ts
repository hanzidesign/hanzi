import { DataTexture, Vector2 } from 'three'
import { describe, expect, it, vi } from 'vitest'

import {
  NOISE_FIELD_FRAGMENT_SHADER,
  NOISE_FIELD_TYPE_IDS,
  applyNoiseFieldUniforms,
  createNoiseFieldShaderMaterial,
  disposeNoiseFieldShaderMaterial,
} from './noise-field-material'

function createFixture() {
  const sourceTexture = new DataTexture()
  const material = createNoiseFieldShaderMaterial({
    controls: {},
    resolution: new Vector2(1280, 720),
    sourceSize: new Vector2(1024, 768),
    sourceTexture,
  })
  return { material, sourceTexture }
}

describe('Noise Field shader material', () => {
  it('owns an independent shader with exact Grainrad defaults', () => {
    const { material, sourceTexture } = createFixture()

    expect(material.uniforms.u_sourceTexture.value).toBe(sourceTexture)
    expect(material.uniforms.u_sourceSize.value.toArray()).toEqual([1024, 768])
    expect(material.uniforms.u_resolution.value.toArray()).toEqual([1280, 720])
    expect(material.uniforms.u_scale.value).toBe(50)
    expect(material.uniforms.u_intensity.value).toBe(1)
    expect(material.uniforms.u_speed.value).toBe(1)
    expect(material.uniforms.u_time.value).toBe(0)
    expect(material.uniforms.u_octaves.value).toBe(4)
    expect(material.uniforms.u_animate.value).toBe(1)
    expect(material.uniforms.u_brightness.value).toBe(0)
    expect(material.uniforms.u_contrast.value).toBe(0)
    expect(material.uniforms.u_noiseType.value).toBe(0)
    expect(material.uniforms.u_distortOnly.value).toBe(0)
  })

  it('maps the exact uniform ABI units and ids without clamping raw controls', () => {
    const { material } = createFixture()

    applyNoiseFieldUniforms(material, {
      'noise-type': 'worley',
      scale: 85,
      intensity: 2.4,
      octaves: 8,
      speed: 2.2,
      animate: false,
      'distort-only': true,
      brightness: 40,
      contrast: -25,
    })

    expect(NOISE_FIELD_TYPE_IDS).toEqual({ perlin: 0, simplex: 1, worley: 2 })
    expect(material.uniforms.u_noiseType.value).toBe(2)
    expect(material.uniforms.u_scale.value).toBe(85)
    expect(material.uniforms.u_intensity.value).toBe(2.4)
    expect(material.uniforms.u_octaves.value).toBe(8)
    expect(material.uniforms.u_speed.value).toBe(2.2)
    expect(material.uniforms.u_animate.value).toBe(0)
    expect(material.uniforms.u_distortOnly.value).toBe(1)
    expect(material.uniforms.u_brightness.value).toBe(0.4)
    expect(material.uniforms.u_contrast.value).toBe(-0.25)
  })

  it('keeps missing Animate enabled and exact production fallbacks', () => {
    const { material } = createFixture()

    applyNoiseFieldUniforms(material, {
      'noise-type': 'simplex',
      animate: true,
      scale: Number.NaN,
    })
    expect(material.uniforms.u_noiseType.value).toBe(1)
    expect(material.uniforms.u_animate.value).toBe(1)
    expect(material.uniforms.u_scale.value).toBe(50)

    applyNoiseFieldUniforms(material, {})
    expect(material.uniforms.u_noiseType.value).toBe(0)
    expect(material.uniforms.u_animate.value).toBe(1)
  })

  it('ports the exact scalar and vector hash constants and smooth value noise', () => {
    expect(NOISE_FIELD_FRAGMENT_SHADER).toContain('dot(p, vec2(127.1, 311.7))')
    expect(NOISE_FIELD_FRAGMENT_SHADER).toContain('dot(p, vec2(269.5, 183.3))')
    expect(NOISE_FIELD_FRAGMENT_SHADER).toContain('* 43758.5453')
    expect(NOISE_FIELD_FRAGMENT_SHADER).toContain('vec2 u = f * f * (3.0 - 2.0 * f);')
    expect(NOISE_FIELD_FRAGMENT_SHADER).toContain(
      'noiseFieldHash(i + vec2(1.0, 1.0))',
    )
  })

  it('ports the exact simplex approximation and conversion to a non-negative branch', () => {
    for (const marker of [
      'const float K1 = 0.366025404;',
      'const float K2 = 0.211324865;',
      'vec2 o = step(a.yx, a.xy);',
      '0.5 - vec3(dot(a, a), dot(b, b), dot(c, c))',
      'vec3 n = h * h * h * h * vec3(',
      'return dot(n, vec3(70.0));',
      'return noiseFieldSimplex(p) * 0.5 + 0.5;',
    ]) {
      expect(NOISE_FIELD_FRAGMENT_SHADER).toContain(marker)
    }
  })

  it('searches the exact Worley neighborhood and returns minimum Euclidean distance', () => {
    expect(NOISE_FIELD_FRAGMENT_SHADER).toContain('float minDistance = 1.0;')
    expect(NOISE_FIELD_FRAGMENT_SHADER).toContain(
      'for (int y = -1; y <= 1; y++)',
    )
    expect(NOISE_FIELD_FRAGMENT_SHADER).toContain(
      'for (int x = -1; x <= 1; x++)',
    )
    expect(NOISE_FIELD_FRAGMENT_SHADER).toContain(
      'minDistance = min(minDistance, length(difference));',
    )
  })

  it('runs up to all eight UI octaves with the exact unnormalized FBM progression', () => {
    for (const marker of [
      'float value = 0.0;',
      'float amplitude = 0.5;',
      'for (int i = 0; i < 8; i++)',
      'value += amplitude * noiseFieldGetNoise(position, noiseType);',
      'position *= 2.0;',
      'amplitude *= 0.5;',
      'int octaveCount = int(u_octaves + 0.5);',
    ]) {
      expect(NOISE_FIELD_FRAGMENT_SHADER).toContain(marker)
    }
    expect(NOISE_FIELD_FRAGMENT_SHADER).not.toContain('value /')
  })

  it('keeps effect-local time, speed, displacement, and clamped source sampling exact', () => {
    expect(NOISE_FIELD_FRAGMENT_SHADER).toContain(
      'float animatedTime = u_animate > 0.5 ? u_time * u_speed : 0.0;',
    )
    expect(NOISE_FIELD_FRAGMENT_SHADER).toContain(
      'vec2 noisePosition = v_uv * u_scale + vec2(animatedTime * 0.1);',
    )
    expect(NOISE_FIELD_FRAGMENT_SHADER).toContain(
      'noisePosition + vec2(100.0, 100.0)',
    )
    expect(NOISE_FIELD_FRAGMENT_SHADER).toContain(
      '* 2.0 * u_intensity * 0.02;',
    )
    expect(NOISE_FIELD_FRAGMENT_SHADER).toContain(
      'clamp(displacedUv, vec2(0.0), vec2(1.0))',
    )
  })

  it('applies B then C before the positive overlay and preserves Distort Only semantics', () => {
    expect(NOISE_FIELD_FRAGMENT_SHADER).toContain(
      '(1.0 + u_contrast) / (1.0 - 0.99 * u_contrast)',
    )
    expect(NOISE_FIELD_FRAGMENT_SHADER).toContain('if (u_distortOnly < 0.5)')
    expect(NOISE_FIELD_FRAGMENT_SHADER).toContain(
      'v_uv * u_scale * 2.0 + vec2(animatedTime)',
    )
    expect(NOISE_FIELD_FRAGMENT_SHADER).toContain(
      'effectColor += vec3(overlay * u_intensity * 0.3);',
    )

    const adjustmentIndex = NOISE_FIELD_FRAGMENT_SHADER.indexOf(
      'effectColor = applyNoiseFieldBrightnessContrast(effectColor);',
    )
    const overlayIndex = NOISE_FIELD_FRAGMENT_SHADER.indexOf('float overlay =')
    const finalClampIndex = NOISE_FIELD_FRAGMENT_SHADER.indexOf(
      'effectColor = clamp(effectColor',
    )
    expect(adjustmentIndex).toBeLessThan(overlayIndex)
    expect(overlayIndex).toBeLessThan(finalClampIndex)
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
      expect(NOISE_FIELD_FRAGMENT_SHADER).not.toContain(processingUniform)
    }
    expect(NOISE_FIELD_FRAGMENT_SHADER).toContain('vec3 applyNoiseFieldPostProcessing')
    expect(NOISE_FIELD_FRAGMENT_SHADER.indexOf('effectColor = clamp(effectColor')).toBeLessThan(
      NOISE_FIELD_FRAGMENT_SHADER.lastIndexOf('applyNoiseFieldPostProcessing('),
    )

    const { material } = createFixture()
    applyNoiseFieldUniforms(material, {
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
    const material = createNoiseFieldShaderMaterial({
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

    disposeNoiseFieldShaderMaterial(material)

    expect(materialDispose).toHaveBeenCalledOnce()
    expect(sourceDispose).not.toHaveBeenCalled()
  })
})
