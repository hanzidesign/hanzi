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
    expect(material.uniforms.u_lineWidth.value).toBe(0.15)
    expect(material.uniforms.u_randomness.value).toBe(0)
    expect(material.uniforms.u_brightnessMap.value).toBe(1)
    expect(material.uniforms.u_invert.value).toBe(0)
    expect(material.uniforms.u_brightness.value).toBe(0)
    expect(material.uniforms.u_contrast.value).toBe(0)
    expect(material.uniforms.u_lineColor.value.getHexString()).toBe('000000')
    expect(material.uniforms.u_background.value.getHexString()).toBe('ffffff')
    expect(material.uniforms.u_time.value).toBe(0)
  })

  it('maps local controls in raw production units, including the below-range width', () => {
    const { material } = createFixture()

    applyCrosshatchUniforms(material, {
      density: 11,
      layers: 4,
      angle: 90,
      'line-width': 2.25,
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
    expect(material.uniforms.u_lineWidth.value).toBe(2.25)
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

  it('ports the production hash, value noise, hatch wobble, and width-only scaling', () => {
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain(
      'vec3 p3 = fract(vec3(p.x, p.y, p.x) * 0.1031);',
    )
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain('p3 += dot(p3, p3.yzx + 33.33);')
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain('vec2 u = f * f * (3.0 - 2.0 * f);')
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain(
      'vec2 noiseCoord = vec2(floor(scaledX) * 0.1 + seed * 7.0, rotatedY * 0.02);',
    )
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain(
      '(crosshatchValueNoise(noiseCoord * 3.0) - 0.5) * u_randomness * 0.4',
    )
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain(
      'float scaledX = rotatedX * u_resolution.x / spacing;',
    )
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain('float aa = 1.5 / u_resolution.x;')
    const hatchFunction = CROSSHATCH_FRAGMENT_SHADER.slice(
      CROSSHATCH_FRAGMENT_SHADER.indexOf('float crosshatchPattern'),
      CROSSHATCH_FRAGMENT_SHADER.indexOf('float crosshatchPostNoise'),
    )
    expect(hatchFunction).not.toContain('u_time')
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

  it('collapses layer availability and blends adjacent darkness ramps exactly', () => {
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain('if (u_layers < 2.0)')
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain('level5 = level0;')
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain('else if (u_layers < 3.0)')
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain('level5 = level3;')
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain('else if (u_layers < 4.0)')
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain('level5 = level4;')
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain('float tone = darkness * 6.0;')
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain('float weight0 = ramp0 - ramp1;')
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain('float weight5 = ramp5;')
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain(
      'float solidFill = smoothstep(0.92, 1.0, darkness);',
    )
    expect(CROSSHATCH_FRAGMENT_SHADER).toContain('hatchValue = max(hatchValue, solidFill);')
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
    expect(CROSSHATCH_FRAGMENT_SHADER.indexOf('hatchValue = max')).toBeLessThan(
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
