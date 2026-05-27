export type BuiltInPatternAsset = {
  index: number
  url: string
}

const PATTERN_ASSET_COUNT = 97

export const builtInPatternAssets: readonly BuiltInPatternAsset[] = Array.from(
  { length: PATTERN_ASSET_COUNT },
  (_, index) => ({
    index,
    url: toPatternUrl(index),
  }),
)

export const DEFAULT_PATTERN_ASSET_URL = builtInPatternAssets[0].url

const builtInPatternUrls = new Set(
  builtInPatternAssets.map((asset) => asset.url),
)

export function toPatternUrl(seed: number) {
  const normalizedSeed = Math.min(
    PATTERN_ASSET_COUNT - 1,
    Math.max(0, Math.trunc(seed)),
  )

  return `/images/patterns/${String(normalizedSeed).padStart(3, '0')}.jpg`
}

export function isBuiltInPatternUrl(value: string) {
  return builtInPatternUrls.has(value)
}

export function getPatternAssetByUrl(url: string) {
  return builtInPatternAssets.find((asset) => asset.url === url)
}

export function sanitizePatternUrl(
  value: unknown,
  fallback = DEFAULT_PATTERN_ASSET_URL,
) {
  if (typeof value === 'string' && isBuiltInPatternUrl(value)) {
    return value
  }

  return isBuiltInPatternUrl(fallback) ? fallback : DEFAULT_PATTERN_ASSET_URL
}
