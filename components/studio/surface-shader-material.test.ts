import { DataTexture } from 'three'
import { describe, expect, it } from 'vitest'
import type { StudioShaderLayer } from '@/app/studio/studio-store'

import {
  SURFACE_SHADER_STYLE_IDS,
  createCharacterSurfaceMaterial,
  toSurfaceShaderStyleIndex,
} from './surface-shader-material'
import { createFallbackGlyphDistancePack } from './glyph-derived-buffers'

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
          depthStrength: 0.8,
          highlightStrength: 0.45,
          rimStrength: 0.35,
          edgeSoftness: 0.12,
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
      morphLayers: [
        {
          id: 'morph-layer-1',
          definitionId: 'sine-bend',
          params: {
            amplitude: 0.18,
            frequency: 2.5,
            phase: 0,
          },
          enabled: true,
          intensity: 0.5,
          collapsed: false,
          locked: false,
        },
      ],
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
    expect(material.uniforms.u_foregroundDepthStrength.value).toBe(0.8)
    expect(material.uniforms.u_foregroundHighlightStrength.value).toBe(0.45)
    expect(material.uniforms.u_foregroundRimStrength.value).toBe(0.35)
    expect(material.uniforms.u_foregroundEdgeSoftness.value).toBe(0.12)
    expect(material.uniforms.u_backgroundStyle.value).toBe(1)
    expect(material.uniforms.u_foregroundOpacity.value).toBe(0.7)
    expect(material.uniforms.u_backgroundOpacity.value).toBe(0.4)
    expect(material.uniforms.u_foregroundGradientType.value).toBe(1)
    expect(material.uniforms.u_foregroundGradientAngle.value).toBe(45)
    expect(material.uniforms.u_foregroundGradientStopCount.value).toBe(2)
    expect(material.uniforms.u_foregroundGradientOpacities.value).toEqual([1, 0.5, 0.5, 0.5, 0.5, 0.5])
    expect(material.uniforms.u_foregroundGradientPositions.value).toEqual([0, 1, 1, 1, 1, 1])
    expect(material.uniforms.u_foregroundPattern0.value).toBe(foregroundPattern)
    expect(material.uniforms.u_backgroundPattern0.value).toBe(backgroundPattern)
    expect(material.uniforms.u_morphStackPattern0.value).toBe(morphStackPattern)
    expect(material.uniforms.u_foregroundPatternCount.value).toBe(1)
    expect(material.uniforms.u_backgroundPatternCount.value).toBe(1)
    expect(material.uniforms.u_morphStackPatternCount.value).toBe(1)
    expect(material.uniforms.u_morphLayerCount.value).toBe(1)
    expect(material.uniforms.u_morphLayerKinds.value[0]).toBe(1)
    expect(material.uniforms.u_morphLayerIntensities.value[0]).toBe(0.5)
    expect(material.uniforms.u_morphLayerParams.value[0].toArray()).toEqual([0.18, 2.5, 0, 0])
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
    expect(material.fragmentShader).toContain('applyMorphLayerStack')
    expect(material.fragmentShader).toContain('applyMaskMorphLayers')
    expect(material.fragmentShader).toContain('applySurfaceDepthMorphLayers')
    expect(material.fragmentShader).toContain('u_foregroundDepthStrength')
    expect(material.fragmentShader).toContain('u_foregroundHighlightStrength')
    expect(material.fragmentShader).toContain('u_foregroundRimStrength')
    expect(material.fragmentShader).toContain('u_foregroundEdgeSoftness')
    expect(material.fragmentShader).toContain('readForegroundGradientPosition')
    expect(material.fragmentShader).toContain('readForegroundOpacity')
    expect(material.fragmentShader).toContain('mix(visibleBackgroundColor, foregroundColor, foregroundAlpha)')
  })

  it('does not inject hidden effects without matching Studio panel controllers', () => {
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

    expect(material.fragmentShader).not.toContain('sampleProceduralPaper')
    expect(material.fragmentShader).not.toContain('sampleBlueprintGrid')
    expect(material.fragmentShader).not.toContain('sampleCastInkShadow')
    expect(material.fragmentShader).not.toContain('samplePixelTrail')
    expect(material.fragmentShader).not.toContain('applyInkEdgeDarkening')
    expect(material.fragmentShader).not.toContain('sampleFineNoise')
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

  it('binds up to three Pattern Layer texture slots per target with intensity and blend mode uniforms', () => {
    const foregroundPatternA = new DataTexture()
    const foregroundPatternB = new DataTexture()
    const backgroundPattern = new DataTexture()
    const morphPatternA = new DataTexture()
    const morphPatternB = new DataTexture()
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
      patterns: {
        foreground: [
          {
            id: 'pattern-layer-1',
            texture: foregroundPatternA,
            intensity: 0.25,
            blendMode: 'multiply',
          },
          {
            id: 'pattern-layer-2',
            texture: foregroundPatternB,
            intensity: 0.75,
            blendMode: 'screen',
          },
        ],
        background: [
          {
            id: 'pattern-layer-3',
            texture: backgroundPattern,
            intensity: 0.5,
            blendMode: 'overlay',
          },
        ],
        morphStack: [
          {
            id: 'pattern-layer-4',
            texture: morphPatternA,
            intensity: 0.2,
            blendMode: 'normal',
          },
          {
            id: 'pattern-layer-5',
            texture: morphPatternB,
            intensity: 1,
            blendMode: 'soft-light',
          },
        ],
      },
    })

    expect(material.uniforms.u_foregroundPattern0.value).toBe(foregroundPatternA)
    expect(material.uniforms.u_foregroundPattern1.value).toBe(foregroundPatternB)
    expect(material.uniforms.u_foregroundPatternCount.value).toBe(2)
    expect(material.uniforms.u_foregroundPatternIntensities.value).toEqual([0.25, 0.75, 0])
    expect(material.uniforms.u_foregroundPatternBlendModes.value).toEqual([1, 2, 0])
    expect(material.uniforms.u_backgroundPattern0.value).toBe(backgroundPattern)
    expect(material.uniforms.u_backgroundPatternCount.value).toBe(1)
    expect(material.uniforms.u_backgroundPatternIntensities.value).toEqual([0.5, 0, 0])
    expect(material.uniforms.u_backgroundPatternBlendModes.value).toEqual([3, 0, 0])
    expect(material.uniforms.u_morphStackPattern0.value).toBe(morphPatternA)
    expect(material.uniforms.u_morphStackPattern1.value).toBe(morphPatternB)
    expect(material.uniforms.u_morphStackPatternCount.value).toBe(2)
    expect(material.uniforms.u_morphStackPatternIntensities.value).toEqual([0.2, 1, 0])
    expect(material.fragmentShader).toContain('blendPatternColor')
    expect(material.fragmentShader).toContain('sampleForegroundPatterns')
    expect(material.fragmentShader).toContain('sampleBackgroundPatterns')
    expect(material.fragmentShader).toContain('sampleMorphStackPatternOffset')
  })

  it('binds derived glyph buffer uniforms without changing the visible output path', () => {
    const glyphDistancePack = createFallbackGlyphDistancePack('unit test fallback')
    const material = createCharacterSurfaceMaterial({
      maskTexture: new DataTexture(),
      glyphDistancePack,
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

    expect(material.uniforms.u_glyphBufferAvailable.value).toBe(0)
    expect(material.uniforms.u_glyphBufferResolution.value.toArray()).toEqual([1, 1])
    expect(material.uniforms.u_glyphSdf.value).toBe(glyphDistancePack.textures.sdf)
    expect(material.uniforms.u_glyphEdge.value).toBe(glyphDistancePack.textures.edge)
    expect(material.uniforms.u_glyphHeight.value).toBe(glyphDistancePack.textures.height)
    expect(material.uniforms.u_glyphNormal.value).toBe(glyphDistancePack.textures.normal)
    expect(material.uniforms.u_glyphFlow.value).toBe(glyphDistancePack.textures.flow)
    expect(material.uniforms.u_glyphScatter.value).toBe(glyphDistancePack.textures.scatter)
    expect(material.fragmentShader).toContain('uniform sampler2D u_glyphSdf')
    expect(material.fragmentShader).toContain('uniform vec2 u_glyphBufferResolution')
    expect(material.fragmentShader).toContain('mix(visibleBackgroundColor, foregroundColor, foregroundAlpha)')
  })

  it('compiles enabled Shader Layer rows into visible material effect uniforms', () => {
    const shaderLayers: StudioShaderLayer[] = [
      {
        id: 'shader-layer-1',
        effectId: 'ink-graphite',
        target: 'foreground-shader' as const,
        enabled: true,
        intensity: 0,
        blendMode: 'normal' as const,
        params: {
          edgeWidth: 0.25,
          bevelDepth: 0.5,
          roughness: 0.35,
          readabilityClamp: 0.8,
        },
        locked: false,
      },
      {
        id: 'shader-layer-2',
        effectId: 'dithered-reveal',
        target: 'foreground-shader' as const,
        enabled: true,
        intensity: 0.5,
        blendMode: 'multiply' as const,
        params: {
          threshold: 0.45,
          contrast: 1.2,
          scale: 12,
        },
        locked: false,
      },
      {
        id: 'shader-layer-3',
        effectId: 'fluid-chrome',
        target: 'foreground-shader' as const,
        enabled: true,
        intensity: 1,
        blendMode: 'screen' as const,
        params: {
          flowStrength: 0.4,
          metalness: 0.8,
          refraction: 0.25,
        },
        locked: false,
      },
      {
        id: 'shader-layer-disabled',
        effectId: 'technical-hatch',
        target: 'foreground-shader' as const,
        enabled: false,
        intensity: 1,
        blendMode: 'normal' as const,
        params: {
          scale: 12,
          angle: 45,
          threshold: 0.5,
        },
        locked: false,
      },
    ]
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
      shaderLayers,
    })

    expect(material.uniforms.u_shaderLayerCount.value).toBe(3)
    expect(material.uniforms.u_shaderLayerKinds.value.slice(0, 3)).toEqual([1, 20, 40])
    expect(material.uniforms.u_shaderLayerTargets.value.slice(0, 3)).toEqual([1, 1, 1])
    expect(material.uniforms.u_shaderLayerIntensities.value.slice(0, 3)).toEqual([0, 0.5, 1])
    expect(material.uniforms.u_shaderLayerParams.value[0].toArray()).toEqual([0.25, 0.5, 0.35, 0.8])
    expect(material.fragmentShader).toContain('applySdfReliefShaderLayer')
    expect(material.fragmentShader).toContain('applyPrintDamageShaderLayer')
    expect(material.fragmentShader).toContain('applyChromeGlassShaderLayer')
    expect(material.fragmentShader).toContain('u_glyphSdf')
    expect(material.fragmentShader).toContain('u_timeEffective')
  })
})
