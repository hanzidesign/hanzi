import { DataTexture, Vector2 } from 'three'
import { describe, expect, it, vi } from 'vitest'

import {
  CROSSHATCH_FRAGMENT_SHADER,
  applyCrosshatchUniforms,
  createCrosshatchShaderMaterial,
  disposeCrosshatchShaderMaterial,
} from './crosshatch-material'

function createFixture() {
  const sourceTexture = new DataTexture()
  const material = createCrosshatchShaderMaterial({
    controls: {},
    resolution: new Vector2(1280, 720),
    sourceSize: new Vector2(1024, 768),
    sourceTexture,
  })
  return { material, sourceTexture }
}

describe('Crosshatch shader material', () => {
  it('owns an independent shader with exact production defaults', () => {
    const { material, sourceTexture } = createFixture()

    expect(material.uniforms.u_sourceTexture.value).toBe(sourceTexture)
    expect(material.uniforms.u_sourceSize.value.toArray()).toEqual([1024, 768])
    expect(material.uniforms.u_resolution.value.toArray()).toEqual([1280, 720])
    expect(material.uniforms.u_density.value).toBe(6)
    expect(material.uniforms.u_layers.value).toBe(3)
    expect(material.uniforms.u_angle.value).toBeCloseTo(Math.PI / 4)
    expect(material.uniforms.u_lineWidth.value).toBe(0.08)
    expect(material.uniforms.u_backgroundDensity.value).toBe(12)
    expect(material.uniforms.u_backgroundLayers.value).toBe(1)
    expect(material.uniforms.u_backgroundAngle.value).toBeCloseTo(Math.PI / 4)
    expect(material.uniforms.u_backgroundLineWidth.value).toBe(0.08)
    expect(material.uniforms.u_backgroundRandomness.value).toBe(0)
    expect(material.uniforms.u_backgroundSpeed.value).toBe(0.1)
    expect(material.uniforms.u_randomness.value).toBe(0)
    expect(material.uniforms.u_brightnessMap.value).toBe(1)
    expect(material.uniforms.u_invert.value).toBe(0)
    expect(material.uniforms.u_brightness.value).toBe(-0.04)
    expect(material.uniforms.u_contrast.value).toBe(0)
    expect(material.uniforms.u_lineColor.value.getHexString()).toBe('000000')
    expect(material.uniforms.u_background.value.getHexString()).toBe('ffffff')
    expect(material.uniforms.u_time.value).toBe(0)
  })

  it('maps local controls in raw physical units', () => {
    const { material } = createFixture()

    applyCrosshatchUniforms(material, {
      density: 11,
      layers: 4,
      angle: 90,
      'line-width': 0.75,
      'background-density': 40,
      'background-layers': 4,
      'background-angle': 15,
      'background-line-width': 0.24,
      'background-randomness': 0.35,
      'background-speed': 2.4,
      randomness: 0.65,
      invert: true,
      brightness: 40,
      contrast: -25,
      'line-color': '#123456',
      background: '#abcdef',
      'brightness-map': 1.4,
    })

    expect(material.uniforms.u_density.value).toBe(11)
    expect(material.uniforms.u_layers.value).toBe(4)
    expect(material.uniforms.u_angle.value).toBeCloseTo(Math.PI / 2)
    expect(material.uniforms.u_lineWidth.value).toBe(0.75)
    expect(material.uniforms.u_backgroundDensity.value).toBe(40)
    expect(material.uniforms.u_backgroundLayers.value).toBe(4)
    expect(material.uniforms.u_backgroundAngle.value).toBeCloseTo(Math.PI / 12)
    expect(material.uniforms.u_backgroundLineWidth.value).toBe(0.24)
    expect(material.uniforms.u_backgroundRandomness.value).toBe(0.35)
    expect(material.uniforms.u_backgroundSpeed.value).toBe(2.4)
    expect(material.uniforms.u_randomness.value).toBe(0.65)
    expect(material.uniforms.u_invert.value).toBe(1)
    expect(material.uniforms.u_brightness.value).toBe(0.4)
    expect(material.uniforms.u_contrast.value).toBe(-0.25)
    expect(material.uniforms.u_lineColor.value.getHexString()).toBe('123456')
    expect(material.uniforms.u_background.value.getHexString()).toBe('abcdef')
    expect(material.uniforms.u_brightnessMap.value).toBe(1.4)

    applyCrosshatchUniforms(material, { 'line-width': 0.15 })
    expect(material.uniforms.u_lineWidth.value).toBe(0.15)
  })

  it('ports the production hash, value noise, hatch wobble, and visual-pixel scaling', () => {
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain(
      'vec3 p3 = fract(vec3(p.x, p.y, p.x) * 0.1031);',
    )
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain('p3 += dot(p3, p3.yzx + 33.33);')
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain('vec2 u = f * f * (3.0 - 2.0 * f);')
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain(
      'vec2 noiseCoord = vec2(floor(scaledX) * 0.1 + seed * 7.0, rotatedY * 0.02);',
    )
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain(
      '(crosshatchValueNoise(noiseCoord * 3.0) - 0.5) * randomness * 0.4',
    )
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain(
      'vec2 pixelPosition = uv * u_resolution;',
    )
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain(
      'float scaledX = rotatedX / spacing + phase;',
    )
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain('float aa = 1.5 / max(spacing, 0.0001);')
    const hatchFunction = CROSSHATCH_FRAGMENT_SHADER.slice(
      CROSSHATCH_FRAGMENT_SHADER.indexOf('float crosshatchPattern'),
      CROSSHATCH_FRAGMENT_SHADER.indexOf('float crosshatchPostNoise'),
    )
    expect(hatchFunction).not.toContain('u_time')
  })

  it('moves only the unmasked background hatch with the shared animation timeline', () => {
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain(
      'vec3 rawSourceColor = crosshatchSourceSample(v_uv);',
    )
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain(
      'float backgroundMotionMask = smoothstep(0.92, 0.995, crosshatchLuminance(rawSourceColor));',
    )
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain(
      'float backgroundPhase = backgroundMotionMask * u_time * 0.08 * u_backgroundSpeed;',
    )
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain(
      'float backgroundHatchStrength = clamp(0.04 - u_brightness * 0.2, 0.006, 0.2);',
    )
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain(
      'float backgroundHatchFloor = backgroundMotionMask * backgroundHatchStrength;',
    )
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain(
      'float crosshatchPattern(vec2 uv, float angle, float spacing, float width, float seed, float phase, float randomness)',
    )
    expect(CROSSHATCH_FRAGMENT_SHADER).not.toContain('hatchValue *= backgroundMotionMask')
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain(
      'float hatchValue = mix(characterHatchValue, backgroundHatchValue, backgroundMotionMask);',
    )
  })

  it('uses Background Lines Layers as the exact progressive direction count', () => {
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain(
      'float backgroundPattern = background0;',
    )
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain('if (u_backgroundLayers >= 2.0)')
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain(
      'backgroundPattern = max(backgroundPattern, background90);',
    )
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain('if (u_backgroundLayers >= 3.0)')
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain(
      'backgroundPattern = max(backgroundPattern, background45);',
    )
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain('if (u_backgroundLayers >= 4.0)')
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain(
      'backgroundPattern = max(backgroundPattern, background135);',
    )
  })

  it('applies canonical Brightness to source luminance before hatch density', () => {
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain(
      'vec3 adjustedColor = applyCrosshatchBrightnessContrast',
    )
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain(
      'vec3 result = color + vec3(u_brightness);',
    )
    expect(CROSSHATCH_FRAGMENT_SHADER).not.toContain(
      'effectColor = clamp(effectColor + vec3(u_brightness)',
    )
  })

  it('builds all six cumulative TAM patterns with exact production multipliers', () => {
    for (const marker of [
      'baseAngle, spacing * 1.5, width * 0.7, 0.0',
      'baseAngle + CROSSHATCH_PI * 0.5, spacing * 1.5, width * 0.7, 1.0',
      'baseAngle, spacing, width * 0.8, 2.0',
      'baseAngle + CROSSHATCH_PI * 0.5, spacing, width * 0.8, 3.0',
      'baseAngle + CROSSHATCH_PI * 0.25, spacing * 0.85, width * 0.9, 4.0',
      'baseAngle + CROSSHATCH_PI * 0.75, spacing * 0.85, width * 0.9, 5.0',
    ]) {
      expect(CROSSHATCH_FRAGMENT_SHADER).toContain(marker)
    }
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain('float hatch1 = max(hatch0, hatch1New);')
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain('float hatch5 = max(hatch4, hatch5New);')
  })

  it('collapses layer availability and blends adjacent darkness ramps without a model fill', () => {
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain('if (u_layers < 2.0)')
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain('level5 = level0;')
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain('else if (u_layers < 3.0)')
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain('level5 = level3;')
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain('else if (u_layers < 4.0)')
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain('level5 = level4;')
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain('float tone = darkness * 6.0;')
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain('float weight0 = ramp0 - ramp1;')
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain('float weight5 = ramp5;')
    expect(CROSSHATCH_FRAGMENT_SHADER).not.toContain('solidFill')
    expect(CROSSHATCH_FRAGMENT_SHADER).not.toContain('hatchValue = max')
    expect(CROSSHATCH_FRAGMENT_SHADER).not.toContain('sourceMask')
  })

  it('keeps the buggy luma, luminance-only invert, and fixed palette mix', () => {
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain(
      'dot(color, vec3(0.2326, 0.7152, 0.0722))',
    )
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain('luminanceValue = 1.0 - luminanceValue;')
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain(
      'vec3 effectColor = mix(u_background, u_lineColor, hatchValue);',
    )
  })

  it('maps and consumes every Processing control between Crosshatch and Post', () => {
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain('vec3 crosshatchBlurredSource')
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain('crosshatchSourceSample(uv + vec2(blurTexel.x, 0.0))')
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain('crosshatchSourceSample(uv - vec2(blurTexel.x, 0.0))')
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain('crosshatchSourceSample(uv + vec2(0.0, blurTexel.y))')
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain('crosshatchSourceSample(uv - vec2(0.0, blurTexel.y))')
    for (const processingUniform of [
      'u_processingInvert', 'u_brightnessMap', 'u_edgeEnhance', 'u_blur',
      'u_quantizeColors', 'u_shapeMatching',
    ]) {
      expect(CROSSHATCH_FRAGMENT_SHADER.split(processingUniform).length).toBeGreaterThan(2)
    }
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain('if (u_quantizeColors >= 1.0)')
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain('max(u_quantizeColors, 2.0)')
    expect(CROSSHATCH_FRAGMENT_SHADER.indexOf('float hatchValue =')).toBeLessThan(
      CROSSHATCH_FRAGMENT_SHADER.indexOf('effectColor = applyCrosshatchProcessing'),
    )
    expect(CROSSHATCH_FRAGMENT_SHADER.indexOf('effectColor = applyCrosshatchProcessing')).toBeLessThan(
      CROSSHATCH_FRAGMENT_SHADER.indexOf('applyCrosshatchPostProcessing(effectColor'),
    )

    const { material } = createFixture()
    applyCrosshatchUniforms(material, {
      'processing-invert': true,
      'brightness-map': 1.4,
      'edge-enhance': 0.35,
      blur: 3,
      'quantize-colors': 1,
      'shape-matching': 0.25,
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
    expect(material.uniforms.u_brightnessMap.value).toBe(1.4)
    expect(material.uniforms.u_edgeEnhance.value).toBe(0.35)
    expect(material.uniforms.u_blur.value).toBe(3)
    expect(material.uniforms.u_quantizeColors.value).toBe(1)
    expect(material.uniforms.u_shapeMatching.value).toBe(0.25)
    expect(material.uniforms.u_bloom.value).toBe(1)
    expect(material.uniforms.u_postChromatic.value).toBe(1)
    expect(material.uniforms.u_scanlines.value).toBe(1)
    expect(material.uniforms.u_vignette.value).toBe(1)
    expect(material.uniforms.u_crtCurve.value).toBe(1)
    expect(material.uniforms.u_phosphor.value).toBe(1)
  })

  it('uses source dimensions as output resolution when none is supplied', () => {
    const material = createCrosshatchShaderMaterial({
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

    disposeCrosshatchShaderMaterial(material)

    expect(materialDispose).toHaveBeenCalledOnce()
    expect(sourceDispose).not.toHaveBeenCalled()
  })
})
