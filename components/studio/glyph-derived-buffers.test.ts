import { DataTexture } from 'three'
import { describe, expect, it } from 'vitest'

import {
  GLYPH_DISTANCE_DEFAULT_MAX_RESOLUTION,
  createFallbackGlyphDistancePack,
  deriveGlyphDistancePackFromAlpha,
  disposeGlyphDistancePack,
} from './glyph-derived-buffers'

describe('glyph derived buffers', () => {
  it('derives distance, edge, material, and vector buffers from mask alpha', () => {
    const alpha = new Uint8ClampedArray([
      0, 0, 0, 0, 0,
      0, 255, 255, 255, 0,
      0, 255, 255, 255, 0,
      0, 255, 255, 255, 0,
      0, 0, 0, 0, 0,
    ])

    const pack = deriveGlyphDistancePackFromAlpha({
      alpha,
      width: 5,
      height: 5,
      maxResolution: 5,
    })

    expect(pack.available).toBe(true)
    expect(pack.reason).toBeNull()
    expect(pack.width).toBe(5)
    expect(pack.height).toBe(5)
    expect(pack.textures.mask).toBeInstanceOf(DataTexture)
    expect(pack.textures.sdf).toBeInstanceOf(DataTexture)
    expect(pack.textures.edge).toBeInstanceOf(DataTexture)
    expect(pack.textures.height).toBeInstanceOf(DataTexture)
    expect(pack.textures.normal).toBeInstanceOf(DataTexture)
    expect(pack.textures.flow).toBeInstanceOf(DataTexture)
    expect(pack.textures.scatter).toBeInstanceOf(DataTexture)

    const center = pack.samples[2 + 2 * 5]
    const corner = pack.samples[0]
    const edge = pack.samples[1 + 1 * 5]

    expect(center.mask).toBe(1)
    expect(center.insideDistance).toBeGreaterThan(edge.insideDistance)
    expect(center.outsideDistance).toBe(0)
    expect(center.sdf).toBeGreaterThan(0)
    expect(corner.mask).toBe(0)
    expect(corner.outsideDistance).toBeGreaterThan(0)
    expect(corner.sdf).toBeLessThan(0)
    expect(edge.edge).toBeGreaterThan(center.edge)
    expect(center.normal.z).toBeGreaterThan(0.5)
    expect(center.scatter).toBeGreaterThanOrEqual(0)
    expect(center.scatter).toBeLessThanOrEqual(1)
  })

  it('caps derived buffer resolution while preserving source aspect ratio', () => {
    const alpha = new Uint8ClampedArray(80 * 40).fill(255)
    const pack = deriveGlyphDistancePackFromAlpha({
      alpha,
      width: 80,
      height: 40,
      maxResolution: 16,
    })

    expect(pack.width).toBe(16)
    expect(pack.height).toBe(8)
    expect(pack.maxResolution).toBe(16)
    expect(pack.textures.sdf.image.width).toBe(16)
    expect(pack.textures.sdf.image.height).toBe(8)
  })

  it('returns a neutral fallback pack for invalid alpha sources', () => {
    const pack = deriveGlyphDistancePackFromAlpha({
      alpha: new Uint8ClampedArray([255, 255]),
      width: 4,
      height: 4,
      maxResolution: 4,
    })

    expect(pack.available).toBe(false)
    expect(pack.reason).toMatch(/alpha/i)
    expect(pack.width).toBe(1)
    expect(pack.height).toBe(1)
    expect(pack.samples).toHaveLength(1)
  })

  it('creates disposable fallback textures with availability metadata', () => {
    const pack = createFallbackGlyphDistancePack('test fallback')

    expect(pack.available).toBe(false)
    expect(pack.reason).toBe('test fallback')
    expect(pack.textures.mask.image.width).toBe(1)
    expect(pack.textures.normal.image.data).toEqual(new Uint8Array([128, 128, 255, 255]))

    expect(() => disposeGlyphDistancePack(pack)).not.toThrow()
  })

  it('exports the default resolution cap used by runtime derivation', () => {
    expect(GLYPH_DISTANCE_DEFAULT_MAX_RESOLUTION).toBe(512)
  })
})
