import { describe, expect, it } from 'vitest'

import {
  PIXEL_SORT_TRAIL_PROPAGATE_FRAGMENT_SHADER,
  PIXEL_SORT_TRAIL_RADIAL_PROPAGATE_FRAGMENT_SHADER,
  PIXEL_SORT_TRAIL_RADIAL_SEED_FRAGMENT_SHADER,
  PIXEL_SORT_TRAIL_SEED_FRAGMENT_SHADER,
  getPixelSortLinearStep,
  getPixelSortRadialBin,
  getPixelSortRadialDimensions,
  getPixelSortRadialUv,
  getPixelSortTrailPipeline,
} from './pixel-sort-trail-material'

describe('Pixel Sort connected preview trail helpers', () => {
  it('uses discrete polar dimensions with a complete angular ring', () => {
    expect(getPixelSortRadialDimensions(320, 180)).toEqual({
      maxRadius: 184,
      angularBins: 1157,
      radialBins: 185,
    })
  })

  it('caps export-sized polar targets below common WebGL texture limits', () => {
    expect(getPixelSortRadialDimensions(2048, 2048)).toEqual({
      maxRadius: 1449,
      angularBins: 4096,
      radialBins: 1450,
    })
  })

  it.each([
    ['horizontal', { x: 3, y: 0 }],
    ['vertical', { x: 0, y: 3 }],
    ['diagonal', { x: 3, y: 3 }],
    ['anti-diagonal', { x: 3, y: -3 }],
  ] as const)('maps %s to integer scanline steps', (direction, step) => {
    expect(getPixelSortLinearStep(direction, 3)).toEqual(step)
    const reversed = getPixelSortLinearStep(direction, 3, true)
    expect(reversed.x).toBeCloseTo(-step.x)
    expect(reversed.y).toBeCloseTo(-step.y)
  })

  it('round-trips a canvas sample through polar bins within one raster pixel', () => {
    const dimensions = getPixelSortRadialDimensions(64, 48)
    const source = { x: 45, y: 13 }
    const bin = getPixelSortRadialBin(source.x, source.y, 64, 48)
    const mapped = getPixelSortRadialUv(bin.angleBin, bin.radiusBin, 64, 48)
    expect(Math.hypot(mapped.x - source.x, mapped.y - source.y)).toBeLessThanOrEqual(1.5)
    expect(bin.angleBin).toBeGreaterThanOrEqual(0)
    expect(bin.angleBin).toBeLessThan(dimensions.angularBins)
  })

  it('keeps the GPU payload and propagation contracts explicit', () => {
    expect(PIXEL_SORT_TRAIL_SEED_FRAGMENT_SHADER).toContain('gl_FragColor = occupied > 0.5')
    expect(PIXEL_SORT_TRAIL_SEED_FRAGMENT_SHADER).toContain('? vec4((pixel + 0.5) / u_resolution, 0.0, reach)')
    expect(PIXEL_SORT_TRAIL_SEED_FRAGMENT_SHADER).toContain(': vec4(0.0, 0.0, -1.0, reach)')
    expect(PIXEL_SORT_TRAIL_SEED_FRAGMENT_SHADER).toContain('sourceMaximum(source.rgb)')
    expect(PIXEL_SORT_TRAIL_SEED_FRAGMENT_SHADER).toContain('max(1.0 - u_threshold, 0.0001)')
    expect(PIXEL_SORT_TRAIL_SEED_FRAGMENT_SHADER).toContain('return max(depthReach, maximum);')
    expect(PIXEL_SORT_TRAIL_PROPAGATE_FRAGMENT_SHADER).toContain('v_uv - delta')
    expect(PIXEL_SORT_TRAIL_PROPAGATE_FRAGMENT_SHADER).not.toContain('v_uv + delta')
    expect(PIXEL_SORT_TRAIL_PROPAGATE_FRAGMENT_SHADER).toContain('stepPixels *= mix(1.0, -1.0, u_reverse)')
    expect(PIXEL_SORT_TRAIL_PROPAGATE_FRAGMENT_SHADER).toContain('if (current.b >= 0.0)')
    expect(PIXEL_SORT_TRAIL_PROPAGATE_FRAGMENT_SHADER).toContain('upstream.b + u_step')
    expect(PIXEL_SORT_TRAIL_PROPAGATE_FRAGMENT_SHADER).toContain('max(current.a, upstream.a)')
    expect(PIXEL_SORT_TRAIL_PROPAGATE_FRAGMENT_SHADER).toContain('vec4(0.0, 0.0, -1.0')
    expect(PIXEL_SORT_TRAIL_RADIAL_SEED_FRAGMENT_SHADER).toContain('vec2 center = (u_sourceResolution - 1.0) * 0.5;')
    expect(PIXEL_SORT_TRAIL_RADIAL_SEED_FRAGMENT_SHADER).toContain('if (radius < 0.0 || sourcePixel.x < 0.0')
    expect(PIXEL_SORT_TRAIL_RADIAL_SEED_FRAGMENT_SHADER).toContain('gl_FragColor = occupied > 0.5')
    expect(PIXEL_SORT_TRAIL_RADIAL_SEED_FRAGMENT_SHADER).not.toContain('clamp(sourcePixel')
    expect(PIXEL_SORT_TRAIL_RADIAL_SEED_FRAGMENT_SHADER).toContain('return max(depthReach, maximum);')
    expect(PIXEL_SORT_TRAIL_RADIAL_PROPAGATE_FRAGMENT_SHADER).toContain('v_uv - delta')
    expect(PIXEL_SORT_TRAIL_RADIAL_PROPAGATE_FRAGMENT_SHADER).not.toContain('v_uv + delta')
    expect(PIXEL_SORT_TRAIL_RADIAL_PROPAGATE_FRAGMENT_SHADER).toContain('upstream.b + u_step')
    expect(PIXEL_SORT_TRAIL_RADIAL_PROPAGATE_FRAGMENT_SHADER).toContain('max(current.a, upstream.a)')
  })

  it('selects exactly one propagation pipeline per direction', () => {
    expect(getPixelSortTrailPipeline('horizontal')).toBe('linear')
    expect(getPixelSortTrailPipeline('vertical')).toBe('linear')
    expect(getPixelSortTrailPipeline('diagonal')).toBe('linear')
    expect(getPixelSortTrailPipeline('anti-diagonal')).toBe('linear')
    expect(getPixelSortTrailPipeline('radial')).toBe('radial')
  })
})
