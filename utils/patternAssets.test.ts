import { describe, expect, it } from 'vitest'

import {
  DEFAULT_PATTERN_ASSET_URL,
  builtInPatternAssets,
  getPatternAssetByUrl,
  isBuiltInPatternUrl,
  sanitizePatternUrl,
} from './patternAssets'

describe('pattern assets', () => {
  it('lists the built-in displacement maps in url order', () => {
    expect(builtInPatternAssets).toHaveLength(97)
    expect(builtInPatternAssets[0]).toMatchObject({
      index: 0,
      url: '/images/patterns/000.jpg',
    })
    expect(builtInPatternAssets[96]).toMatchObject({
      index: 96,
      url: '/images/patterns/096.jpg',
    })
  })

  it('validates and sanitizes persisted built-in pattern urls', () => {
    expect(isBuiltInPatternUrl('/images/patterns/012.jpg')).toBe(true)
    expect(getPatternAssetByUrl('/images/patterns/012.jpg')?.index).toBe(12)
    expect(sanitizePatternUrl('/images/patterns/012.jpg')).toBe(
      '/images/patterns/012.jpg',
    )
    expect(sanitizePatternUrl('/images/patterns/999.jpg')).toBe(
      DEFAULT_PATTERN_ASSET_URL,
    )
    expect(sanitizePatternUrl('data:image/png;base64,upload')).toBe(
      DEFAULT_PATTERN_ASSET_URL,
    )
  })
})
