import { describe, expect, it, vi } from 'vitest'

import { createInitialStudioStoreState } from '@/app/studio/studio-store'
import {
  ASCII_CHARACTER_SETS,
  ASCII_FRAGMENT_SHADER,
  ASCII_VERTEX_SHADER,
  createAsciiShaderMaterial,
  disposeAsciiShaderMaterial,
  resolveAsciiCharacterSet,
} from './character-ascii-material'
import { compileGrainradEffectRuntime } from './grainrad-effect-runtime'

describe('Phase 5C ASCII shader material', () => {
  it('defines concrete ASCII character strings for every Character Set option', () => {
    expect(ASCII_CHARACTER_SETS.standard).toBe('@%#*+=-:. ')
    expect(ASCII_CHARACTER_SETS.blocks).toBe('█▓▒░')
    expect(ASCII_CHARACTER_SETS.binary).toBe('01')
    expect(ASCII_CHARACTER_SETS.detailed).toBe('$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`\'. ')
    expect(ASCII_CHARACTER_SETS.minimal).toBe('#.')
    expect(ASCII_CHARACTER_SETS.alphabetic).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz')
    expect(ASCII_CHARACTER_SETS.numeric).toBe('0123456789')
    expect(ASCII_CHARACTER_SETS.math).toBe('+-*/=<>^%()[]{}|~')
    expect(ASCII_CHARACTER_SETS.symbols).toBe('!@#$%^&*()_+-=[]{}|;\':",./<>?`~')
    expect(ASCII_CHARACTER_SETS.custom).toBe('█▓▒░@#%*+=-:. ')

    expect(resolveAsciiCharacterSet('custom', 'ABC123')).toBe('ABC123')
    expect(resolveAsciiCharacterSet('custom', '')).toBe(ASCII_CHARACTER_SETS.custom)
  })

  it('creates required uniforms for 3D ASCII rendering and finishing controls', () => {
    const material = createAsciiShaderMaterial({
      ascii: {
        cellSize: 12,
        density: 0.7,
        contrast: 1.2,
        brightness: 0,
        saturation: 0,
        hueRotation: 0,
        sharpness: 0,
        gamma: 1,
        invert: false,
        charsetStyle: 'detailed',
        palette: 'noir',
        foregroundColor: '#101820',
        backgroundColor: '#f4f1e8',
        colorIntensity: 1,
        depthInfluence: 0.5,
        normalInfluence: 0.4,
        scanlineAmount: 0.2,
        bloomAmount: 0.3,
        curvature: 0.1,
        vignette: 0.2,
        chromaticOffset: 0.1,
        grain: 0.15,
      },
      grainradRuntime: compileGrainradEffectRuntime({
        selectedEffectId: 'ascii',
        controls: {},
      }),
      foregroundColor: '#101820',
      backgroundColor: '#f4f1e8',
    })

    expect(material.uniforms).toHaveProperty('u_time')
    expect(material.uniforms).toHaveProperty('u_mouse')
    expect(material.uniforms).toHaveProperty('u_resolution')
    expect(material.uniforms.u_asciiCellSize.value).toBe(12)
    expect(material.uniforms.u_asciiDensity.value).toBe(0.7)
    expect(material.uniforms.u_asciiCharsetStyle.value).toBe(3)
    expect(material.uniforms.u_asciiPalette.value).toBe(2)
    expect(material.uniforms.u_scanlineAmount.value).toBe(0.2)
    expect(material.uniforms.u_bloomAmount.value).toBe(0.3)
    expect(material.uniforms.u_curvature.value).toBe(0.1)
    expect(material.uniforms.u_grainradEffectId.value).toBe(0)
    expect(material.uniforms).toHaveProperty('u_effectA')
    expect(material.uniforms).toHaveProperty('u_effectT')
    expect(material.uniforms).toHaveProperty('u_processingA')
    expect(material.uniforms).toHaveProperty('u_postI')
    expect(material.uniforms).toHaveProperty('u_effectColorA')
    expect(material.uniforms).toHaveProperty('u_effectColorB')
    expect(material.uniforms).toHaveProperty('u_asciiGlyphAtlas')
    expect(material.uniforms.u_asciiGlyphCount.value).toBe(ASCII_CHARACTER_SETS.detailed.length)
    expect(material.uniforms.u_asciiGlyphColumns.value).toBeGreaterThan(0)
  })

  it('disposes the generated glyph atlas texture with the material', () => {
    const initialState = createInitialStudioStoreState()
    const material = createAsciiShaderMaterial({
      ascii: initialState.ascii,
      grainradRuntime: compileGrainradEffectRuntime({
        selectedEffectId: 'ascii',
        controls: {},
      }),
      foregroundColor: initialState.ascii.foregroundColor,
      backgroundColor: initialState.ascii.backgroundColor,
    })
    const textureDispose = vi.spyOn(material.uniforms.u_asciiGlyphAtlas.value, 'dispose')
    const materialDispose = vi.spyOn(material, 'dispose')

    disposeAsciiShaderMaterial(material)

    expect(textureDispose).toHaveBeenCalledTimes(1)
    expect(materialDispose).toHaveBeenCalledTimes(1)
  })

  it('contains procedural glyph, cell, depth, normal, Grainrad effects, and post-process shader logic', () => {
    expect(ASCII_VERTEX_SHADER).toContain('v_worldNormal')
    expect(ASCII_VERTEX_SHADER).toContain('v_viewDepth')
    expect(ASCII_FRAGMENT_SHADER).toContain('asciiCell')
    expect(ASCII_FRAGMENT_SHADER).toContain('glyph5x7')
    expect(ASCII_FRAGMENT_SHADER).toContain('applyGrainradAscii')
    expect(ASCII_FRAGMENT_SHADER).toContain('applyGrainradDithering')
    expect(ASCII_FRAGMENT_SHADER).toContain('applyGrainradHalftone')
    expect(ASCII_FRAGMENT_SHADER).toContain('applyGrainradMatrixRain')
    expect(ASCII_FRAGMENT_SHADER).toContain('applyGrainradDots')
    expect(ASCII_FRAGMENT_SHADER).toContain('applyGrainradContour')
    expect(ASCII_FRAGMENT_SHADER).toContain('applyGrainradPixelSort')
    expect(ASCII_FRAGMENT_SHADER).toContain('applyGrainradBlockify')
    expect(ASCII_FRAGMENT_SHADER).toContain('applyGrainradThreshold')
    expect(ASCII_FRAGMENT_SHADER).toContain('applyGrainradEdgeDetection')
    expect(ASCII_FRAGMENT_SHADER).toContain('applyGrainradCrosshatch')
    expect(ASCII_FRAGMENT_SHADER).toContain('applyGrainradWaveLines')
    expect(ASCII_FRAGMENT_SHADER).toContain('applyGrainradNoiseField')
    expect(ASCII_FRAGMENT_SHADER).toContain('applyGrainradVoronoi')
    expect(ASCII_FRAGMENT_SHADER).toContain('applyGrainradVhs')
    expect(ASCII_FRAGMENT_SHADER).toContain('applyGrainradProcessing')
    expect(ASCII_FRAGMENT_SHADER).toContain('applyGrainradPostProcessing')
    expect(ASCII_FRAGMENT_SHADER).toContain('u_asciiCellSize')
    expect(ASCII_FRAGMENT_SHADER).toContain('u_asciiCharsetStyle')
    expect(ASCII_FRAGMENT_SHADER).toContain('uniform sampler2D u_asciiGlyphAtlas')
    expect(ASCII_FRAGMENT_SHADER).toContain('sampleAsciiGlyphAtlas')
    expect(ASCII_FRAGMENT_SHADER).toContain('u_grainradEffectId')
    expect(ASCII_FRAGMENT_SHADER).toContain('u_depthInfluence')
    expect(ASCII_FRAGMENT_SHADER).toContain('u_normalInfluence')
    expect(ASCII_FRAGMENT_SHADER).toContain('u_scanlineAmount')
    expect(ASCII_FRAGMENT_SHADER).toContain('u_bloomAmount')
    expect(ASCII_FRAGMENT_SHADER).toContain('u_curvature')
  })

  it('routes Grainrad ASCII Scale, Spacing, Output Width, and Character Set into glyph sampling behavior', () => {
    expect(ASCII_FRAGMENT_SHADER).toContain('asciiEffectCellSize')
    expect(ASCII_FRAGMENT_SHADER).toContain('outputColumnCount')
    expect(ASCII_FRAGMENT_SHADER).toContain('outputColumnCount = clamp(u_effectC, 0.0, 600.0)')
    expect(ASCII_FRAGMENT_SHADER).toContain('outputCellSize = max(u_resolution.x / max(outputColumnCount, 1.0), 1.0)')
    expect(ASCII_FRAGMENT_SHADER).toContain('glyphScale = mix(1.0, 0.25, clamp(u_effectB, 0.0, 1.0))')
    expect(ASCII_FRAGMENT_SHADER).toContain('insideGlyphBox')
    expect(ASCII_FRAGMENT_SHADER).toContain('grainradAsciiGlyph')
    expect(ASCII_FRAGMENT_SHADER).toContain('sampleAsciiGlyphAtlas(brightness, spacedAsciiEffectCellUv)')
    expect(ASCII_FRAGMENT_SHADER).toContain('grainradAsciiGlyph(brightness, spacedAsciiEffectCellUv, asciiEffectCellId, u_asciiCharsetStyle)')
    expect(ASCII_FRAGMENT_SHADER).toContain('grainradAsciiIntensity')
    expect(ASCII_FRAGMENT_SHADER).toContain('u_backgroundColor')
    expect(ASCII_FRAGMENT_SHADER).toContain('monoAsciiColor = mix(u_effectColorB, u_effectColorA, mask * grainradAsciiIntensity)')
    expect(ASCII_FRAGMENT_SHADER).toContain('asciiColor = mix(monoAsciiColor, originalAsciiColor, step(0.5, u_effectL))')
    expect(ASCII_FRAGMENT_SHADER).not.toContain('u_asciiCellSize * max(u_effectA')
    expect(ASCII_FRAGMENT_SHADER).not.toContain('glyph * (1.0 - spacing)')
  })

  it('keeps Processing Blur as a softening pass instead of a grayscale replacement', () => {
    expect(ASCII_FRAGMENT_SHADER).toContain('softenedProcessingColor')
    expect(ASCII_FRAGMENT_SHADER).not.toContain('u_processingD * 0.45')
  })

  it('uses larger Pixel Sort Streak Length values for longer streaks', () => {
    expect(ASCII_FRAGMENT_SHADER).toContain('streakSegments = mix(160.0, 8.0, clamp(u_effectD')
  })
})
