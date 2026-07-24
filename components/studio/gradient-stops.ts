import { isSixDigitHexColor } from '@/utils/colorValidation'

export type GradientColorStop = {
  color: string
  position: number
  opacity?: number
}

export type GradientType = 'linear' | 'radial'

export type GradientSettings = {
  gradientType: GradientType
  gradientAngle: number
}

const RGB_COLOR_PATTERN = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/i

export const DEFAULT_GRADIENT_STOPS: GradientColorStop[] = [
  { color: '#000000', position: 0 },
  { color: '#ffffff', position: 1 },
]
export const DEFAULT_GRADIENT_SETTINGS: GradientSettings = {
  gradientType: 'linear',
  gradientAngle: 90,
}

export function normalizeGradientStops(value: unknown): GradientColorStop[] {
  if (!Array.isArray(value)) {
    return DEFAULT_GRADIENT_STOPS
  }

  const stops = value
    .filter(isGradientStopLike)
    .map((stop) => ({
      color: stop.color.toLowerCase(),
      position: clamp01(stop.position),
      ...(readGradientStopOpacity(stop) < 1 ? { opacity: readGradientStopOpacity(stop) } : {}),
    }))
    .sort((first, second) => first.position - second.position)
    .slice(0, 6)

  return stops.length >= 2 ? stops : DEFAULT_GRADIENT_STOPS
}

export function createGradientCss(
  fallbackColor: string,
  gradientStops: GradientColorStop[],
  settings: Partial<GradientSettings> = DEFAULT_GRADIENT_SETTINGS
) {
  if (gradientStops.length < 2) {
    return fallbackColor
  }

  const gradientType = readGradientType(settings.gradientType, DEFAULT_GRADIENT_SETTINGS.gradientType)
  const gradientAngle = readGradientAngle(settings.gradientAngle, DEFAULT_GRADIENT_SETTINGS.gradientAngle)
  const descriptor = gradientType === 'radial' ? 'circle' : `${gradientAngle}deg`
  const cssType = gradientType === 'radial' ? 'radial-gradient' : 'linear-gradient'

  return `${cssType}(${descriptor}, ${gradientStops
    .map((stop) => `${createColorCss(stop.color, readGradientStopOpacity(stop))} ${Math.round(stop.position * 100)}%`)
    .join(', ')})`
}

export function createColorCss(color: string, opacity = 1) {
  const safeOpacity = clamp01(opacity)

  if (safeOpacity >= 1) {
    return color
  }

  if (!isSixDigitHexColor(color)) {
    return color
  }

  const [r, g, b] = hexToRgbChannels(color)

  return `rgba(${r}, ${g}, ${b}, ${roundOpacity(safeOpacity)})`
}

export function readStopInsertionPosition(clientX: number, bounds: Pick<DOMRect, 'left' | 'width'>) {
  if (bounds.width <= 0) {
    return 0
  }

  return clamp01((clientX - bounds.left) / bounds.width)
}

export function parseGradientCssStops(value: string): GradientColorStop[] {
  const colorStopList = value.match(/\((.*)\)/)?.[1]

  if (!colorStopList) {
    return DEFAULT_GRADIENT_STOPS
  }

  const stops = splitGradientParts(colorStopList)
    .slice(1)
    .map((part): GradientColorStop | null => {
      const trimmedPart = part.trim()
      const positionMatch = trimmedPart.match(/\s(\d+(?:\.\d+)?)%\s*$/)

      if (!positionMatch) {
        return null
      }

      const colorValue = trimmedPart.slice(0, positionMatch.index).trim()
      const color = parseCssColorToHex(colorValue, '')

      if (!color) {
        return null
      }

      return {
        color,
        position: Number(positionMatch[1]) / 100,
        ...(parseCssColorOpacity(colorValue, 1) < 1 ? { opacity: parseCssColorOpacity(colorValue, 1) } : {}),
      }
    })
    .filter((stop): stop is GradientColorStop => Boolean(stop))

  return normalizeGradientStops(stops)
}

export function parseGradientCssSettings(value: string): GradientSettings {
  const colorStopList = value.match(/\((.*)\)/)?.[1]

  if (!colorStopList) {
    return DEFAULT_GRADIENT_SETTINGS
  }

  const [descriptor = ''] = splitGradientParts(colorStopList)
  const gradientType: GradientType = value.startsWith('radial-gradient') ? 'radial' : 'linear'
  const angleMatch = descriptor.match(/(-?\d+(?:\.\d+)?)deg/i)

  return {
    gradientType,
    gradientAngle: readGradientAngle(
      angleMatch ? Number(angleMatch[1]) : DEFAULT_GRADIENT_SETTINGS.gradientAngle,
      DEFAULT_GRADIENT_SETTINGS.gradientAngle
    ),
  }
}

export function parseCssColorToHex(value: string, fallback: string) {
  if (isSixDigitHexColor(value)) {
    return value.toLowerCase()
  }

  const match = value.match(RGB_COLOR_PATTERN)

  if (!match) {
    return fallback
  }

  return `#${[match[1], match[2], match[3]]
    .map((channel) =>
      Math.max(0, Math.min(255, Number(channel)))
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`
}

export function parseCssColorOpacity(value: string, fallback = 1) {
  const match = value.match(RGB_COLOR_PATTERN)

  if (!match || match[4] === undefined) {
    return fallback
  }

  return clamp01(Number(match[4]))
}

export function readGradientStopOpacity(stop: Pick<GradientColorStop, 'opacity'>) {
  return clamp01(typeof stop.opacity === 'number' ? stop.opacity : 1)
}

export function readGradientType(value: unknown, fallback: GradientType = 'linear'): GradientType {
  return value === 'linear' || value === 'radial' ? value : fallback
}

export function readGradientAngle(value: unknown, fallback = DEFAULT_GRADIENT_SETTINGS.gradientAngle) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }

  const normalized = value % 360

  return normalized < 0 ? normalized + 360 : normalized
}

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && isSixDigitHexColor(value)
}

function splitGradientParts(value: string) {
  const parts: string[] = []
  let depth = 0
  let current = ''

  for (const char of value) {
    if (char === '(') {
      depth += 1
    }

    if (char === ')') {
      depth -= 1
    }

    if (char === ',' && depth === 0) {
      parts.push(current)
      current = ''
      continue
    }

    current += char
  }

  if (current) {
    parts.push(current)
  }

  return parts
}

function isGradientStopLike(value: unknown): value is GradientColorStop {
  if (!isRecord(value)) {
    return false
  }

  return (
    isHexColor(value.color) &&
    typeof value.position === 'number' &&
    (value.opacity === undefined || typeof value.opacity === 'number')
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.min(1, value))
}

function hexToRgbChannels(color: string) {
  const hex = color.replace('#', '')

  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ]
}

function roundOpacity(value: number) {
  return Math.round(value * 1000) / 1000
}
