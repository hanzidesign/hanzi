import { describe, expect, it } from 'vitest'

import {
  DISPLACEMENT_TEXTURE_TRANSFORM_IDENTITY,
  getCoverTextureTransform,
} from './displacement-texture'

describe('displacement texture helpers', () => {
  it('uses identity texture transform for square or invalid dimensions', () => {
    expect(getCoverTextureTransform(512, 512)).toEqual(
      DISPLACEMENT_TEXTURE_TRANSFORM_IDENTITY,
    )
    expect(getCoverTextureTransform(0, 512)).toEqual(
      DISPLACEMENT_TEXTURE_TRANSFORM_IDENTITY,
    )
  })

  it('center-covers wide and tall textures without stretching', () => {
    expect(getCoverTextureTransform(1200, 600)).toEqual({
      repeatX: 0.5,
      repeatY: 1,
      offsetX: 0.25,
      offsetY: 0,
    })
    expect(getCoverTextureTransform(600, 1200)).toEqual({
      repeatX: 1,
      repeatY: 0.5,
      offsetX: 0,
      offsetY: 0.25,
    })
  })
})
