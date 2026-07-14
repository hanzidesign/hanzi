import { DataTexture, Vector2 } from 'three'
import { describe, expect, it, vi } from 'vitest'

import {
  VHS_FRAGMENT_SHADER,
  applyVhsUniforms,
  createVhsShaderMaterial,
  disposeVhsShaderMaterial,
} from './vhs-material'

function createFixture() {
  const sourceTexture = new DataTexture()
  const material = createVhsShaderMaterial({
    controls: {},
    resolution: new Vector2(1280, 720),
    sourceSize: new Vector2(1024, 768),
    sourceTexture,
  })
  return { material, sourceTexture }
}

describe('VHS shader material', () => {
  it('owns an independent shader with exact Grainrad defaults', () => {
    const { material, sourceTexture } = createFixture()

    expect(material.uniforms.u_sourceTexture.value).toBe(sourceTexture)
    expect(material.uniforms.u_sourceSize.value.toArray()).toEqual([1024, 768])
    expect(material.uniforms.u_resolution.value.toArray()).toEqual([1280, 720])
    expect(material.uniforms.u_time.value).toBe(0)
    expect(material.uniforms.u_distortion.value).toBe(0.5)
    expect(material.uniforms.u_noise.value).toBe(0.3)
    expect(material.uniforms.u_colorBleed.value).toBe(0.5)
    expect(material.uniforms.u_vhsScanlines.value).toBe(0.3)
    expect(material.uniforms.u_trackingError.value).toBe(0.2)
    expect(material.uniforms.u_brightness.value).toBe(0)
    expect(material.uniforms.u_contrast.value).toBe(0)
    expect(material.uniforms.u_brightnessMap.value).toBe(1)
  })

  it('maps the exact uniform ABI units without clamping raw controls', () => {
    const { material } = createFixture()

    applyVhsUniforms(material, {
      distortion: 0.75,
      noise: 0.65,
      'color-bleed': 0.55,
      'vhs-scanlines': 0.45,
      'tracking-error': 0.35,
      brightness: 40,
      contrast: -25,
      'brightness-map': 1.4,
    })

    expect(material.uniforms.u_distortion.value).toBe(0.75)
    expect(material.uniforms.u_noise.value).toBe(0.65)
    expect(material.uniforms.u_colorBleed.value).toBe(0.55)
    expect(material.uniforms.u_vhsScanlines.value).toBe(0.45)
    expect(material.uniforms.u_trackingError.value).toBe(0.35)
    expect(material.uniforms.u_brightness.value).toBe(0.4)
    expect(material.uniforms.u_contrast.value).toBe(-0.25)
    expect(material.uniforms.u_brightnessMap.value).toBe(1.4)
  })

  it('keeps numeric VHS Scanlines independent from boolean shared Post Scanlines', () => {
    const { material } = createFixture()

    applyVhsUniforms(material, {
      'vhs-scanlines': 0.8,
      scanlines: false,
    })
    expect(material.uniforms.u_vhsScanlines.value).toBe(0.8)
    expect(material.uniforms.u_scanlines.value).toBe(0)

    applyVhsUniforms(material, {
      'vhs-scanlines': 0.25,
      scanlines: true,
    })
    expect(material.uniforms.u_vhsScanlines.value).toBe(0.25)
    expect(material.uniforms.u_scanlines.value).toBe(1)

    applyVhsUniforms(material, { scanlines: 0.9 })
    expect(material.uniforms.u_vhsScanlines.value).toBe(0.3)
    expect(material.uniforms.u_scanlines.value).toBe(0)
  })

  it('ports the exact hash and smooth value-noise equations', () => {
    expect(VHS_FRAGMENT_SHADER).toContain('dot(p, vec2(127.1, 311.7))')
    expect(VHS_FRAGMENT_SHADER).toContain('* 43758.5453')
    expect(VHS_FRAGMENT_SHADER).toContain('vec2 u = f * f * (3.0 - 2.0 * f);')
    expect(VHS_FRAGMENT_SHADER).toContain(
      'mix(vhsHash(i), vhsHash(i + vec2(1.0, 0.0)), u.x)',
    )
  })

  it('ports twenty tracking bands and the exact occasional big-jump gate', () => {
    for (const marker of [
      'if (u_trackingError > 0.01)',
      'floor(warpedUv.y * 20.0)',
      'floor(time * 2.0)',
      '(trackingNoise - 0.5) * 0.1 * u_trackingError',
      'vhsValueNoise(vec2(time * 0.5, 0.0))',
      'step(0.92, jumpNoise)',
      'vhsValueNoise(vec2(warpedUv.y * 5.0, time))',
      'bigJump * u_trackingError',
    ]) {
      expect(VHS_FRAGMENT_SHADER).toContain(marker)
    }
  })

  it('ports all three distortion terms and clamps their combined UV once afterward', () => {
    for (const marker of [
      'if (u_distortion > 0.01)',
      '3.0 + vhsValueNoise(vec2(time * 0.1, 0.0)) * 5.0',
      'warpedUv.y * warpFrequency * 6.28 + time * 2.0',
      'vhsValueNoise(vec2(time * 10.0, 0.0)) - 0.5',
      'shake * u_distortion * 0.01',
      'pow(edgeDistance, 3.0) * u_distortion * 0.1',
      'sin(time * 3.0 + warpedUv.y * 10.0) * edgeWarp',
      'warpedUv = clamp(warpedUv, vec2(0.0), vec2(1.0));',
    ]) {
      expect(VHS_FRAGMENT_SHADER).toContain(marker)
    }
  })

  it('ports separated RGB, the independent five-tap blur, and fixed 30 percent mix', () => {
    expect(VHS_FRAGMENT_SHADER).toContain('if (u_colorBleed > 0.01)')
    expect(VHS_FRAGMENT_SHADER).toContain('float bleedAmount = u_colorBleed * 0.01;')
    expect(VHS_FRAGMENT_SHADER).toContain('warpedUv + vec2(bleedAmount * 2.0, 0.0)')
    expect(VHS_FRAGMENT_SHADER).toContain('warpedUv - vec2(bleedAmount * 2.0, 0.0)')
    expect(VHS_FRAGMENT_SHADER).toContain('for (int i = -2; i <= 2; i++)')
    expect(VHS_FRAGMENT_SHADER).toContain('chromaBlur /= 5.0;')
    expect(VHS_FRAGMENT_SHADER).toContain(
      'effectColor = mix(vec3(red, green, blue), chromaBlur, 0.3);',
    )
  })

  it('uses only the effect-local numeric VHS Scanlines in the VHS branch', () => {
    expect(VHS_FRAGMENT_SHADER).toContain('if (u_vhsScanlines > 0.01)')
    expect(VHS_FRAGMENT_SHADER).toContain(
      'sin(warpedUv.y * u_resolution.y * 3.14159) * 0.5 + 0.5',
    )
    expect(VHS_FRAGMENT_SHADER).toContain(
      'mix(1.0, scanlinePattern, u_vhsScanlines * 0.5)',
    )
    expect(VHS_FRAGMENT_SHADER).toContain(
      '1.0 - u_vhsScanlines * 0.1',
    )

    const vhsBranch = VHS_FRAGMENT_SHADER.slice(
      VHS_FRAGMENT_SHADER.indexOf('if (u_vhsScanlines > 0.01)'),
      VHS_FRAGMENT_SHADER.indexOf('if (u_noise > 0.01)'),
    )
    expect(vhsBranch).not.toContain('u_scanlines')
  })

  it('ports fine grain, gated bands, and the inclusive rolling static bar', () => {
    for (const marker of [
      'if (u_noise > 0.01)',
      'warpedUv * u_resolution + vec2(time * 1000.0)',
      'grain * u_noise * 0.3',
      'vhsValueNoise(vec2(warpedUv.y * 100.0, time * 5.0))',
      'step(0.97, bandNoise)',
      'float barY = fract(time * 0.3);',
      'float insideBar = step(barDistance, 0.02);',
      'floor(time * 60.0)',
      'barNoise * insideBar * u_noise * 0.5',
    ]) {
      expect(VHS_FRAGMENT_SHADER).toContain(marker)
    }
  })

  it('keeps the VHS grading, channel bias, and fixed warped-UV vignette unconditional', () => {
    expect(VHS_FRAGMENT_SHADER).toContain('vec3(vhsLuminance(effectColor))')
    expect(VHS_FRAGMENT_SHADER).toContain('effectColor.r *= 1.1;')
    expect(VHS_FRAGMENT_SHADER).toContain('effectColor.b *= 0.9;')
    expect(VHS_FRAGMENT_SHADER).toContain(
      'length((warpedUv - 0.5) * vec2(0.5, 0.7)) * 0.5;',
    )
    expect(VHS_FRAGMENT_SHADER).toContain(
      '(1.0 + u_contrast) / (1.0 - 0.99 * u_contrast)',
    )
    expect(VHS_FRAGMENT_SHADER.lastIndexOf('applyVhsBrightnessContrast(effectColor)')).toBeLessThan(
      VHS_FRAGMENT_SHADER.lastIndexOf('applyVhsPostProcessing('),
    )
  })

  it('applies every shared Processing control after VHS and before shared Post', () => {
    expect(VHS_FRAGMENT_SHADER).toContain('vec3 sampleVhsSource(vec2 uv)')
    expect(VHS_FRAGMENT_SHADER).toContain('if (u_blur <= 0.0)')
    expect(VHS_FRAGMENT_SHADER).toContain(
      'vec2 blurTexel = min(u_blur, 12.0) / max(u_sourceSize, vec2(1.0));',
    )
    expect(VHS_FRAGMENT_SHADER).toContain(
      'effectColor = sampleVhsSource(warpedUv);',
    )
    expect(VHS_FRAGMENT_SHADER).toContain(
      'color = mix(color, 1.0 - color, u_processingInvert);',
    )
    expect(VHS_FRAGMENT_SHADER).toContain('color *= u_brightnessMap;')
    expect(VHS_FRAGMENT_SHADER).toContain(
      'length(fwidth(vec2(luminance))) * u_edgeEnhance * 8.0',
    )
    expect(VHS_FRAGMENT_SHADER).toContain('if (u_quantizeColors >= 1.0)')
    expect(VHS_FRAGMENT_SHADER).toContain(
      'float levels = max(u_quantizeColors, 2.0);',
    )
    expect(VHS_FRAGMENT_SHADER).toContain(
      'color = mix(color, vec3(step(0.5, luminance)), u_shapeMatching);',
    )
    expect(VHS_FRAGMENT_SHADER).toContain('vec3 applyVhsPostProcessing')
    const effectIndex = VHS_FRAGMENT_SHADER.indexOf(
      'effectColor = applyVhsBrightnessContrast(effectColor);',
    )
    const processingIndex = VHS_FRAGMENT_SHADER.lastIndexOf(
      'effectColor = applyVhsProcessing(',
    )
    const postIndex = VHS_FRAGMENT_SHADER.lastIndexOf('applyVhsPostProcessing(')
    expect(effectIndex).toBeLessThan(processingIndex)
    expect(processingIndex).toBeLessThan(postIndex)

    const { material } = createFixture()
    applyVhsUniforms(material, {
      'vhs-scanlines': 0.7,
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

    expect(material.uniforms.u_vhsScanlines.value).toBe(0.7)
    expect(material.uniforms.u_processingInvert.value).toBe(1)
    expect(material.uniforms.u_brightnessMap.value).toBe(1.75)
    expect(material.uniforms.u_edgeEnhance.value).toBe(0.6)
    expect(material.uniforms.u_blur.value).toBe(3)
    expect(material.uniforms.u_quantizeColors.value).toBe(1)
    expect(material.uniforms.u_shapeMatching.value).toBe(0.4)
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
    const material = createVhsShaderMaterial({
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

    disposeVhsShaderMaterial(material)

    expect(materialDispose).toHaveBeenCalledOnce()
    expect(sourceDispose).not.toHaveBeenCalled()
  })
})
