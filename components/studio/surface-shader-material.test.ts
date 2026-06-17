import { DataTexture } from 'three'
import { describe, expect, it } from 'vitest'

import {
  SURFACE_SHADER_STYLE_IDS,
  createCharacterSurfaceMaterial,
  toSurfaceShaderStyleIndex,
} from './surface-shader-material'

describe('surface shader material', () => {
  it('supports the Phase 4 rendering baseline style presets', () => {
    expect(SURFACE_SHADER_STYLE_IDS).toEqual(['solid', 'soft-gradient', 'depth-lit', 'gradient'])
    expect(toSurfaceShaderStyleIndex('solid')).toBe(0)
    expect(toSurfaceShaderStyleIndex('soft-gradient')).toBe(1)
    expect(toSurfaceShaderStyleIndex('depth-lit')).toBe(2)
    expect(toSurfaceShaderStyleIndex('gradient')).toBe(3)
    expect(toSurfaceShaderStyleIndex('removed-style')).toBe(0)
  })

  it('creates a material with separate foreground and background shader uniforms', () => {
    const maskTexture = new DataTexture()
    const foregroundPattern = new DataTexture()
    const backgroundPattern = new DataTexture()
    const morphStackPattern = new DataTexture()
    const material = createCharacterSurfaceMaterial({
      maskTexture,
      foreground: {
        color: '#111111',
        stylePresetId: 'depth-lit',
        params: {
          opacity: 0.7,
          gradientType: 'radial',
          gradientAngle: 45,
          gradientStops: [
            { color: '#000000', position: 0 },
            { color: '#ffffff', position: 1, opacity: 0.5 },
          ],
        },
      },
      background: {
        color: '#eeeeee',
        stylePresetId: 'soft-gradient',
        params: {
          opacity: 0.4,
        },
      },
      patterns: {
        foreground: foregroundPattern,
        background: backgroundPattern,
        morphStack: morphStackPattern,
      },
    })

    expect(material.uniforms.u_characterMask.value).toBe(maskTexture)
    expect(material.uniforms.u_foregroundColor.value).toMatchObject({
      x: 1 / 15,
      y: 1 / 15,
      z: 1 / 15,
    })
    expect(material.uniforms.u_backgroundColor.value).toMatchObject({
      x: 14 / 15,
      y: 14 / 15,
      z: 14 / 15,
    })
    expect(material.uniforms.u_foregroundStyle.value).toBe(2)
    expect(material.uniforms.u_backgroundStyle.value).toBe(1)
    expect(material.uniforms.u_foregroundOpacity.value).toBe(0.7)
    expect(material.uniforms.u_backgroundOpacity.value).toBe(0.4)
    expect(material.uniforms.u_foregroundGradientType.value).toBe(1)
    expect(material.uniforms.u_foregroundGradientAngle.value).toBe(45)
    expect(material.uniforms.u_foregroundGradientStopCount.value).toBe(2)
    expect(material.uniforms.u_foregroundGradientOpacities.value).toEqual([1, 0.5, 0.5, 0.5, 0.5, 0.5])
    expect(material.uniforms.u_foregroundGradientPositions.value).toEqual([0, 1, 1, 1, 1, 1])
    expect(material.uniforms.u_foregroundPattern.value).toBe(foregroundPattern)
    expect(material.uniforms.u_backgroundPattern.value).toBe(backgroundPattern)
    expect(material.uniforms.u_morphStackPattern.value).toBe(morphStackPattern)
    expect(material.uniforms.u_hasForegroundPattern.value).toBe(1)
    expect(material.uniforms.u_hasBackgroundPattern.value).toBe(1)
    expect(material.uniforms.u_hasMorphStackPattern.value).toBe(1)
    expect(material.transparent).toBe(true)
  })

  it('keeps foreground and background routing separate in the fragment shader', () => {
    const material = createCharacterSurfaceMaterial({
      maskTexture: new DataTexture(),
      foreground: {
        color: '#000000',
        stylePresetId: 'solid',
      },
      background: {
        color: '#ffffff',
        stylePresetId: 'solid',
      },
      patterns: {},
    })

    expect(material.fragmentShader).toContain('applyForegroundLayer')
    expect(material.fragmentShader).toContain('applyBackgroundLayer')
    expect(material.fragmentShader).toContain('applyMorphStackPattern')
    expect(material.fragmentShader).toContain('readForegroundGradientPosition')
    expect(material.fragmentShader).toContain('readForegroundOpacity')
    expect(material.fragmentShader).toContain('mix(visibleBackgroundColor, foregroundColor, foregroundAlpha)')
  })

  it('makes depth-lit visible on dark foreground colors', () => {
    const material = createCharacterSurfaceMaterial({
      maskTexture: new DataTexture(),
      foreground: {
        color: '#000000',
        stylePresetId: 'depth-lit',
      },
      background: {
        color: '#ffffff',
        stylePresetId: 'solid',
      },
      patterns: {},
    })

    expect(material.fragmentShader).toContain('additiveHighlight')
    expect(material.fragmentShader).toContain('rimLight')
    expect(material.fragmentShader).not.toContain('return baseColor * (0.74 + edge * 0.3 + highlight * 0.18);')
  })

  it('uses foreground gradient stops only inside the character mask', () => {
    const material = createCharacterSurfaceMaterial({
      maskTexture: new DataTexture(),
      foreground: {
        color: '#000000',
        stylePresetId: 'gradient',
        params: {
          gradientType: 'linear',
          gradientAngle: 315,
          gradientStops: [
            { color: '#ff0000', position: 0 },
            { color: '#00ff00', position: 0.5, opacity: 0.25 },
            { color: '#0000ff', position: 1 },
          ],
        },
      },
      background: {
        color: '#ffffff',
        stylePresetId: 'solid',
      },
      patterns: {},
    })

    expect(material.uniforms.u_foregroundStyle.value).toBe(3)
    expect(material.uniforms.u_foregroundGradientType.value).toBe(0)
    expect(material.uniforms.u_foregroundGradientAngle.value).toBe(315)
    expect(material.uniforms.u_foregroundGradientStopCount.value).toBe(3)
    expect(material.uniforms.u_foregroundGradientOpacities.value).toEqual([1, 0.25, 1, 1, 1, 1])
    expect(material.fragmentShader).toContain('sampleForegroundGradient')
    expect(material.fragmentShader).toContain('sampleForegroundGradientOpacity')
    expect(material.fragmentShader).toContain('applySurfaceStyle(foregroundColor, u_foregroundStyle, mask, uv)')
    expect(material.fragmentShader).toContain('float foregroundAlpha = alpha * readForegroundOpacity(sampledUv)')
  })
})
