import { DataTexture } from 'three'
import { describe, expect, it, vi } from 'vitest'

import {
  PIXEL_SORT_PRESENT_FRAGMENT_SHADER,
  createPixelSortPresentMaterial,
  setPixelSortPresentFrame,
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
})
