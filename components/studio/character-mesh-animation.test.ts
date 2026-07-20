import { describe, expect, it } from 'vitest'

import {
  shouldRunCharacterMeshAnimation,
} from './character-mesh-animation'

describe('character mesh animation cadence', () => {
  it('allows the initial preview frame, skips one frame after an update, then allows the following frame', () => {
    expect(shouldRunCharacterMeshAnimation({
      exportRender: false,
      skipNextPreviewFrame: false,
    })).toBe(true)
    expect(shouldRunCharacterMeshAnimation({
      exportRender: false,
      skipNextPreviewFrame: true,
    })).toBe(false)
    expect(shouldRunCharacterMeshAnimation({
      exportRender: false,
      skipNextPreviewFrame: false,
    })).toBe(true)
  })

  it('always allows export updates', () => {
    expect(shouldRunCharacterMeshAnimation({
      exportRender: true,
      skipNextPreviewFrame: true,
    })).toBe(true)
  })
})
