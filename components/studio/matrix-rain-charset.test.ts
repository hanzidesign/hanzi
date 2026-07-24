import {
  ClampToEdgeWrapping,
  DataTexture,
  LinearFilter,
} from 'three'
import { describe, expect, it, vi } from 'vitest'

import {
  MATRIX_RAIN_CHARACTER_SETS,
  MATRIX_RAIN_DEFAULT_CUSTOM_CHARS,
  createMatrixRainGlyphAtlas,
  disposeMatrixRainGlyphAtlas,
  resolveMatrixRainCharacterSet,
} from './matrix-rain-charset'

describe('Matrix Rain character resources', () => {
  it('preserves every exact Studio character vocabulary', () => {
    expect(MATRIX_RAIN_CHARACTER_SETS).toEqual({
      standard: ' .:-=+*#%@',
      blocks: ' ░▒▓█',
      binary: ' 01',
      detailed: ' .\'`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
      minimal: ' .:#',
      alphabetic: ' .icotCOXWM',
      numeric: ' 1234567890',
      math: ' .-+×÷=≠<>≤≥∞∑∏√∫',
      emoji: ' ·•○◎●◐◑◒◓◔◕◖◗',
      custom: ' .:+*#@',
    })
    expect(MATRIX_RAIN_DEFAULT_CUSTOM_CHARS).toBe(
      'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789',
    )
  })

  it('uses typed custom characters and Studio standard fallback for an empty custom field', () => {
    expect(resolveMatrixRainCharacterSet('custom', '字💧')).toBe('字💧')
    expect(resolveMatrixRainCharacterSet('custom', '')).toBe(
      MATRIX_RAIN_CHARACTER_SETS.standard,
    )
    expect(resolveMatrixRainCharacterSet('emoji')).toBe(
      MATRIX_RAIN_CHARACTER_SETS.emoji,
    )
  })

  it('creates an effect-local glyph atlas with complete sampling metadata', () => {
    const atlas = createMatrixRainGlyphAtlas('binary')

    expect(atlas.characters).toBe(' 01')
    expect(atlas.count).toBe(3)
    expect(atlas.scale).toBe(1)
    expect(atlas.columns).toBe(16)
    expect(atlas.rows).toBe(1)
    expect(atlas.characterSize.toArray()).toEqual([20, 32])
    expect(atlas.size.toArray()).toEqual([320, 32])
    expect(atlas.texture).toBeInstanceOf(DataTexture)
    expect(atlas.texture.magFilter).toBe(LinearFilter)
    expect(atlas.texture.minFilter).toBe(LinearFilter)
    expect(atlas.texture.wrapS).toBe(ClampToEdgeWrapping)
    expect(atlas.texture.wrapT).toBe(ClampToEdgeWrapping)
  })

  it('preserves Studio JavaScript UTF-16 indexing for non-BMP custom glyphs', () => {
    const atlas = createMatrixRainGlyphAtlas('custom', '💧字')

    expect(atlas.count).toBe(3)
    expect(atlas.columns).toBe(16)
    expect(atlas.rows).toBe(1)
  })

  it('draws the browser atlas with Studio canvas dimensions and typography', () => {
    const assignments: Record<string, string>[] = []
    const fillRect = vi.fn()
    const fillText = vi.fn()
    const context = {
      fillRect,
      fillText,
      get fillStyle() {
        return assignments.at(-1)?.fillStyle ?? ''
      },
      set fillStyle(value: string) {
        assignments.push({ fillStyle: value })
      },
      font: '',
      textBaseline: '',
      textRendering: '',
    }
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => context),
    }
    vi.stubGlobal('document', {
      createElement: vi.fn(() => canvas),
    })

    try {
      createMatrixRainGlyphAtlas('binary')

      expect(canvas.width).toBe(320)
      expect(canvas.height).toBe(32)
      expect(assignments).toEqual([
        { fillStyle: '#000000' },
        { fillStyle: '#FFFFFF' },
      ])
      expect(fillRect).toHaveBeenCalledWith(0, 0, 320, 32)
      expect(context.font).toBe(
        'bold 32px "JetBrains Mono", "SF Mono", "Fira Code", "Courier New", monospace',
      )
      expect(context.textBaseline).toBe('top')
      expect(context.textRendering).toBe('geometricPrecision')
      expect(fillText.mock.calls).toEqual([
        [' ', 0, 0],
        ['0', 20, 0],
        ['1', 40, 0],
      ])
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('disposes the atlas texture exactly once per explicit disposal', () => {
    const atlas = createMatrixRainGlyphAtlas('standard')
    const dispose = vi.spyOn(atlas.texture, 'dispose')

    disposeMatrixRainGlyphAtlas(atlas)

    expect(dispose).toHaveBeenCalledOnce()
  })
})
