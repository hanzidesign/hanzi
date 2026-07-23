import { DataTexture, Vector2 } from 'three'
import { describe, expect, it, vi } from 'vitest'

import {
  PIXEL_SORT_PRESENT_FRAGMENT_SHADER,
  createPixelSortPresentMaterial,
  resolvePixelSortFallbackOverlay,
  setPixelSortPresentFrame,
  setPixelSortPresentMode,
  setPixelSortPreviewResolution,
  setPixelSortPreviewSettings,
  setPixelSortPreviewTrail,
} from './pixel-sort-present-material'

describe('Pixel Sort presentation material', () => {
  it('only presents the completed independently sorted frame', () => {
    const first = new DataTexture()
    const second = new DataTexture()
    const material = createPixelSortPresentMaterial(first)

    expect(material.uniforms.u_sortedFrame.value).toBe(first)
    expect(material.uniforms.u_trailFrame.value).toBe(first)
    expect(material.uniforms.u_streakLength.value).toBe(500)
    expect(material.uniforms.u_visualResolution.value).toEqual(new Vector2(1, 1))
    expect(material.uniforms.u_intensity.value).toBe(1)
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).toContain('texture2D(u_sortedFrame, v_uv)')
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).not.toContain('PIXEL_SORT_SAMPLE_COUNT')
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).not.toContain('sortValues')

    setPixelSortPresentFrame(material, second)
    expect(material.uniforms.u_sortedFrame.value).toBe(second)
  })

  it('owns only its presentation material lifecycle', () => {
    const material = createPixelSortPresentMaterial(new DataTexture())
    const dispose = vi.spyOn(material, 'dispose')

    material.dispose()

    expect(dispose).toHaveBeenCalledOnce()
  })

  it('keeps captured preview visual units while export resolution changes', () => {
    const material = createPixelSortPresentMaterial(new DataTexture())

    setPixelSortPreviewResolution(material, 768, 512, 768, 512)
    expect(material.uniforms.u_resolution.value).toEqual(new Vector2(768, 512))
    expect(material.uniforms.u_visualResolution.value).toEqual(new Vector2(768, 512))

    setPixelSortPreviewResolution(material, 2048, 2048, 768, 512)
    expect(material.uniforms.u_resolution.value).toEqual(new Vector2(2048, 2048))
    expect(material.uniforms.u_visualResolution.value).toEqual(new Vector2(768, 512))
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).toContain(
      'vec2 visualToActualScale = u_resolution / max(u_visualResolution, vec2(1.0));',
    )
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).toContain(
      'float streakLength = u_streakLength * directionalScale;',
    )
  })

  it('keeps preview source and exact frame independent while exposing bounded controls', () => {
    const source = new DataTexture()
    const exact = new DataTexture()
    const material = createPixelSortPresentMaterial(source)
    const settings = {
      direction: 'radial',
      mode: 'dark',
      threshold: 0.4,
      streakLength: 80,
      intensity: 0.7,
      randomness: 0.2,
      reverse: true,
      brightness: 25,
      contrast: -20,
      mix: 2,
      startColor: '#000001',
      middleColor: '#010101',
      endColor: '#ffffff',
      background: '#123456',
    } as const

    setPixelSortPreviewSettings(material, settings)
    setPixelSortPreviewResolution(material, 320, 180)
    setPixelSortPresentFrame(material, exact)
    setPixelSortPresentMode(material, 'preview')

    expect(material.uniforms.u_sourceFrame.value).toBe(source)
    expect(material.uniforms.u_sortedFrame.value).toBe(exact)
    expect(material.uniforms.u_renderMode.value).toBe(0)
    expect(material.uniforms.u_direction.value).toBe(4)
    expect(material.uniforms.u_sortMode.value).toBe(3)
    expect(material.uniforms.u_mix.value).toBe(2)
    expect(material.uniforms.u_resolution.value).toEqual(new Vector2(320, 180))
    expect(material.uniforms.u_visualResolution.value).toEqual(new Vector2(320, 180))
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).not.toMatch(/for\s*\(/)
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).toContain('u_background')
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).toContain('atan(')
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).toContain(
      'vec2 radialPixels = (v_uv - vec2(0.5)) * u_resolution;',
    )
  })

  it('keeps the depth base visible and overlays boundary trails across model and background', () => {
    expect(createPixelSortPresentMaterial(new DataTexture(), {
      settings: {
        direction: 'horizontal',
        mode: 'depth',
        threshold: 0.25,
        streakLength: 100,
        intensity: 0.8,
        randomness: 0.3,
        reverse: false,
        brightness: 0,
        contrast: 0,
        mix: 1,
        startColor: '#35115c',
        middleColor: '#c93472',
        endColor: '#e6a928',
        background: '#ffffff',
      },
    }).uniforms.u_sortMode.value).toBe(4)
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).toContain('float depthReach(float depth, float threshold, bool nonBlack)')
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).toContain('return clamp((depth - threshold) / max(1.0 - threshold, 0.0001), 0.0, 1.0);')
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).toContain(
      'return max(depthReach(candidate.a, u_threshold, nonBlack), maximum);',
    )
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).toContain('bool sourceNonBlack = sourceIsNonBlack(source.rgb);')
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).toContain('? mix(source.rgb, previewGradient(source.a), u_mix)')
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).toContain(': u_background;')
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).toContain('float streakLength = u_streakLength * directionalScale;')
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).toContain('streakLength * lineFactor * clamp(trail.a, 0.0, 1.0)')
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).toContain('step(0.0, trail.b)')
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).toContain('float foregroundTrail = float(sourceNonBlack) * step(0.0, trail.b);')
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).toContain('max(foregroundTrail, validTrail)')
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).toContain('previewGradient(source.a)')
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).toContain('trail.b / max(effectiveLimit, 0.0001)')
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).toContain('mix(base, lineColor, u_intensity * overlay)')
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).not.toMatch(/streakLength\s*\*\s*u_intensity/)
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).not.toMatch(/u_(?:shadow|midtone|highlight)/)
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).toContain('vec4(clamp(composed, 0.0, 1.0), 1.0)')
  })

  it('uses deterministic line-level randomness and a bounded mask fallback', () => {
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).toContain('u_randomness == 0.0 ? 1.0 : pow(lineHash, u_randomness)')
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).toContain('if (u_trailAvailable < 0.5)')
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).toContain('sourceMaximum(fallbackCandidate.rgb)')
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).not.toMatch(/for\s*\(/)
  })

  it('keeps every non-black source pixel visible when the trail is unavailable', () => {
    expect(resolvePixelSortFallbackOverlay(true, 0)).toBe(1)
    expect(resolvePixelSortFallbackOverlay(false, 0)).toBe(0)
    expect(resolvePixelSortFallbackOverlay(false, 0.4)).toBe(0.4)

    const material = createPixelSortPresentMaterial(new DataTexture())
    setPixelSortPreviewTrail(material, new DataTexture(), { available: false })

    expect(material.uniforms.u_trailAvailable.value).toBe(0)
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).toContain(
      'overlay = max(float(sourceNonBlack), fallbackOverlay);',
    )
  })

  it('binds the selected connected trail and keeps exact mode separate', () => {
    const source = new DataTexture()
    const trail = new DataTexture()
    const material = createPixelSortPresentMaterial(source)
    setPixelSortPreviewTrail(material, trail, {
      available: true,
      radial: true,
      maxRadius: 184,
      angularBins: 1157,
      radialBins: 185,
    })
    expect(material.uniforms.u_trailFrame.value).toBe(trail)
    expect(material.uniforms.u_trailAvailable.value).toBe(1)
    expect(material.uniforms.u_trailRadial.value).toBe(1)
    expect(material.uniforms.u_trailMaxRadius.value).toBe(184)
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).toContain('u_trailAvailable * max(foregroundTrail, validTrail)')
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).toContain('if (u_renderMode > 0.5)')
  })
})
