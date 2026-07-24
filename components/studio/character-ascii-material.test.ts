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
import { compileStudioEffectRuntime } from './studio-effect-runtime'

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
      studioRuntime: compileStudioEffectRuntime({
        selectedEffectId: 'ascii',
        controls: {},
      }),
      foregroundColor: '#101820',
      backgroundColor: '#f4f1e8',
    })

    expect(material.uniforms).toHaveProperty('u_time')
    expect(material.uniforms).toHaveProperty('u_mouse')
    expect(material.uniforms).toHaveProperty('u_resolution')
    expect(material.uniforms).toHaveProperty('u_visualResolution')
    expect(material.uniforms.u_asciiCellSize.value).toBe(12)
    expect(material.uniforms.u_asciiDensity.value).toBe(0.7)
    expect(material.uniforms.u_asciiCharsetStyle.value).toBe(3)
    expect(material.uniforms.u_asciiPalette.value).toBe(2)
    expect(material.uniforms.u_scanlineAmount.value).toBe(0.2)
    expect(material.uniforms.u_bloomAmount.value).toBe(0.3)
    expect(material.uniforms.u_curvature.value).toBe(0.1)
    expect(material.uniforms.u_studioEffectId.value).toBe(0)
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
      studioRuntime: compileStudioEffectRuntime({
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

  it('contains procedural glyph, cell, depth, normal, Studio effects, and post-process shader logic', () => {
    expect(ASCII_VERTEX_SHADER).toContain('v_worldNormal')
    expect(ASCII_VERTEX_SHADER).toContain('v_viewDepth')
    expect(ASCII_FRAGMENT_SHADER).toContain('asciiCell')
    expect(ASCII_FRAGMENT_SHADER).toContain('glyph5x7')
    expect(ASCII_FRAGMENT_SHADER).toContain('applyStudioAscii')
    expect(ASCII_FRAGMENT_SHADER).not.toContain('applyStudioDithering')
    expect(ASCII_FRAGMENT_SHADER).not.toContain('applyStudioHalftone')
    expect(ASCII_FRAGMENT_SHADER).not.toContain('applyStudioMatrixRain')
    expect(ASCII_FRAGMENT_SHADER).not.toContain('applyStudioDots')
    expect(ASCII_FRAGMENT_SHADER).not.toContain('applyStudioContour')
    expect(ASCII_FRAGMENT_SHADER).not.toContain('applyStudioPixelSort')
    expect(ASCII_FRAGMENT_SHADER).not.toContain('applyStudioBlockify')
    expect(ASCII_FRAGMENT_SHADER).not.toContain('applyStudioThreshold')
    expect(ASCII_FRAGMENT_SHADER).not.toContain('applyStudioEdgeDetection')
    expect(ASCII_FRAGMENT_SHADER).not.toContain('applyStudioCrosshatch')
    expect(ASCII_FRAGMENT_SHADER).not.toContain('applyStudioWaveLines')
    expect(ASCII_FRAGMENT_SHADER).not.toContain('applyStudioNoiseField')
    expect(ASCII_FRAGMENT_SHADER).not.toContain('applyStudioVoronoi')
    expect(ASCII_FRAGMENT_SHADER).not.toContain('applyStudioVhs')
    expect(ASCII_FRAGMENT_SHADER).toContain('applyStudioProcessing')
    expect(ASCII_FRAGMENT_SHADER).toContain('applyStudioPostProcessing')
    expect(ASCII_FRAGMENT_SHADER).not.toContain('float grainAmount = u_postB')
    expect(ASCII_FRAGMENT_SHADER).toContain("* u_grain;")
    expect(ASCII_FRAGMENT_SHADER).toContain('u_asciiCellSize')
    expect(ASCII_FRAGMENT_SHADER).toContain('u_asciiCharsetStyle')
    expect(ASCII_FRAGMENT_SHADER).toContain('uniform sampler2D u_asciiGlyphAtlas')
    expect(ASCII_FRAGMENT_SHADER).toContain('sampleAsciiGlyphAtlas')
    expect(ASCII_FRAGMENT_SHADER).toContain('u_studioEffectId')
    expect(ASCII_FRAGMENT_SHADER).toContain('u_depthInfluence')
    expect(ASCII_FRAGMENT_SHADER).toContain('u_normalInfluence')
    expect(ASCII_FRAGMENT_SHADER).toContain('u_scanlineAmount')
    expect(ASCII_FRAGMENT_SHADER).toContain('u_bloomAmount')
    expect(ASCII_FRAGMENT_SHADER).toContain('u_curvature')
  })

  it('routes Studio ASCII Scale, Size, and Character Set into glyph sampling behavior', () => {
    expect(ASCII_FRAGMENT_SHADER).toContain('asciiEffectCellSize')
    expect(ASCII_FRAGMENT_SHADER).toContain('float asciiEffectCellSize = max(u_asciiCellSize, 1.0)')
    expect(ASCII_FRAGMENT_SHADER).not.toContain('outputColumnCount')
    expect(ASCII_FRAGMENT_SHADER).not.toContain('outputCellSize')
    expect(ASCII_FRAGMENT_SHADER).toContain('vec2 visualPixel = screenUv * u_visualResolution')
    expect(ASCII_FRAGMENT_SHADER).not.toContain('sin(gl_FragCoord.y * 3.14159)')
    expect(ASCII_FRAGMENT_SHADER).toContain('glyphScale = max(u_effectB, 0.01)')
    expect(ASCII_FRAGMENT_SHADER).not.toContain('glyphScale = max(u_effectN')
    expect(ASCII_FRAGMENT_SHADER).toContain('insideGlyphBox')
    expect(ASCII_FRAGMENT_SHADER).toContain('studioAsciiGlyph')
    expect(ASCII_FRAGMENT_SHADER).toContain('sampleAsciiGlyphAtlas(brightness, spacedAsciiEffectCellUv)')
    expect(ASCII_FRAGMENT_SHADER).toContain('studioAsciiGlyph(brightness, spacedAsciiEffectCellUv, asciiEffectCellId, u_asciiCharsetStyle)')
    expect(ASCII_FRAGMENT_SHADER).toContain('studioAsciiIntensity')
    expect(ASCII_FRAGMENT_SHADER).toContain('u_backgroundColor')
    expect(ASCII_FRAGMENT_SHADER).toContain('paletteColor(brightness, studioAsciiMask)')
    expect(ASCII_FRAGMENT_SHADER).not.toContain('paletteColor(brightness, glyph)')
    expect(ASCII_FRAGMENT_SHADER).toContain('monoAsciiColor = mix(u_effectColorB, u_effectColorA, mask * studioAsciiIntensity)')
    expect(ASCII_FRAGMENT_SHADER).toContain('asciiColor = mix(monoAsciiColor, originalAsciiColor, step(0.5, u_effectL))')
    expect(ASCII_FRAGMENT_SHADER).not.toContain('u_asciiCellSize * max(u_effectA')
    expect(ASCII_FRAGMENT_SHADER).not.toContain('glyph * (1.0 - spacing)')
  })

  it('keeps Processing Blur as a softening pass instead of a grayscale replacement', () => {
    expect(ASCII_FRAGMENT_SHADER).toContain('softenedProcessingColor')
    expect(ASCII_FRAGMENT_SHADER).not.toContain('u_processingD * 0.45')
  })

})
