import type { StudioControlValue } from './studio-effects'

export function readStudioNumber(
  value: StudioControlValue | undefined,
  fallback: number,
) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function readStudioString(
  value: StudioControlValue | undefined,
  fallback: string,
) {
  return typeof value === 'string' ? value : fallback
}

export function readStudioBoolean(value: StudioControlValue | undefined) {
  return value === true ? 1 : 0
}

export function readStudioEnum<T extends Record<string, number>>(
  value: StudioControlValue | undefined,
  values: T,
  fallback: keyof T,
) {
  return typeof value === 'string' && value in values
    ? values[value as keyof T]
    : values[fallback]
}
