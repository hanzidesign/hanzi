import { describe, expect, it } from 'vitest'

import {
  CHARACTER_SETS,
  createCharacterGlyphAtlas,
  resolveCharacterSet,
} from './character-glyph-atlas'

describe('Character glyph atlas', () => {
  it('resolves the real selected Character Set and preserves custom Unicode glyphs', () => {
    expect(resolveCharacterSet('binary')).toBe(CHARACTER_SETS.binary)
    expect(resolveCharacterSet('custom', '山水金')).toBe('山水金')

    const atlas = createCharacterGlyphAtlas('custom', '山水金')

    expect(atlas.characters).toBe('山水金')
    expect(atlas.count).toBe(3)
    expect(atlas.columns).toBe(2)
    expect(atlas.texture).toBeDefined()
  })

  it('counts Unicode code points rather than UTF-16 code units', () => {
    const atlas = createCharacterGlyphAtlas('custom', 'A💧水')

    expect(atlas.characters).toBe('A💧水')
    expect(atlas.count).toBe(3)
  })
})
