import { DataTexture, Vector2 } from 'three'
import { describe, expect, it, vi } from 'vitest'

import {
  PIXEL_SORT_PRESENT_FRAGMENT_SHADER,
  createPixelSortPresentMaterial,
  setPixelSortPresentFrame,
  setPixelSortPresentMode,
  setPixelSortPreviewResolution,
  setPixelSortPreviewSettings,
} from './pixel-sort-present-material'

describe('Pixel Sort presentation material', () => {
  it('only presents the completed independently sorted frame', () => {
    const first = new DataTexture()
    const second = new DataTexture()
    const material = createPixelSortPresentMaterial(first)

    expect(material.uniforms.u_sortedFrame.value).toBe(first)
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
      shadow: '#000001',
      midtone: '#010101',
      highlight: '#ffffff',
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
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).not.toMatch(/for\s*\(/)
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).toContain('u_background')
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).toContain('atan(')
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).toContain(
      'float orderingValue = mix(value, 1.0 - value, u_reverse);',
    )
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).toContain(
      'vec2 radialPixels = (v_uv - vec2(0.5)) * u_resolution;',
    )
  })

  it('keeps Shadow visible by mapping the palette across each directional streak', () => {
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).toContain(
      'float paletteT = eligible * fract(',
    )
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).toContain('previewPalette(paletteT)')
    expect(PIXEL_SORT_PRESENT_FRAGMENT_SHADER).not.toContain(
      'previewPalette(shiftedValue)',
    )
  })
})
