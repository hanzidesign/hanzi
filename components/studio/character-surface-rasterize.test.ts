import { describe, expect, it } from 'vitest'

import {
  CURRENT_PREVIEW_CHARACTER_SPAN_RATIO,
  CURRENT_PREVIEW_VERTICAL_INSET_PX,
  createCharacterSurfaceRasterPlan,
  extractCharacterSurfaceSvgMetadata,
} from './character-surface-rasterize'

const squareSvg = `
  <svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 0L500 0L500 500L0 500Z" fill="black"/>
  </svg>
`

describe('character surface rasterization helpers', () => {
  it('rejects empty or non-drawable SVG data', () => {
    expect(() => extractCharacterSurfaceSvgMetadata('')).toThrow(/empty svg/i)
    expect(() =>
      extractCharacterSurfaceSvgMetadata(
        '<svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg" />',
      ),
    ).toThrow(/drawable/i)
  })

  it('extracts drawable SVG viewBox metadata without DOM APIs', () => {
    expect(
      extractCharacterSurfaceSvgMetadata(`
        <svg viewBox="10 20 300 150" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 20L310 20L310 170Z" />
        </svg>
      `),
    ).toEqual({
      viewBox: {
        x: 10,
        y: 20,
        width: 300,
        height: 150,
      },
      aspectRatio: 2,
    })
  })

  it('returns viewport-aspect mask dimensions bounded by a max texture size', () => {
    const plan = createCharacterSurfaceRasterPlan(squareSvg, {
      viewportWidth: 2400,
      viewportHeight: 1200,
      maxTextureSize: 1024,
    })

    expect(plan.mask).toEqual({ width: 1024, height: 512 })
  })

  it('computes an upright centered fit without changing character proportions', () => {
    const plan = createCharacterSurfaceRasterPlan(
      `
        <svg viewBox="0 0 500 250" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 0L500 0L500 250L0 250Z" />
        </svg>
      `,
      {
        viewportWidth: 1000,
        viewportHeight: 500,
        maxTextureSize: 1000,
      },
    )

    expect(plan.fit.width / plan.fit.height).toBeCloseTo(2)
    expect(plan.fit.x).toBeCloseTo((plan.mask.width - plan.fit.width) / 2)
    expect(plan.fit.y).toBeCloseTo((plan.mask.height - plan.fit.height) / 2)
    expect(plan.fit.flipY).toBe(false)
  })

  it('preserves the current preview default visual scale', () => {
    const plan = createCharacterSurfaceRasterPlan(squareSvg, {
      viewportWidth: 1000,
      viewportHeight: 500,
      maxTextureSize: 1000,
    })

    expect(
      Math.max(plan.fit.width, plan.fit.height) /
        Math.min(
          plan.mask.width,
          plan.mask.height - CURRENT_PREVIEW_VERTICAL_INSET_PX,
        ),
    ).toBeCloseTo(CURRENT_PREVIEW_CHARACTER_SPAN_RATIO)
  })
})
