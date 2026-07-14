import type { GrainradControlValue } from './grainrad-effects'
import {
  DEFAULT_PIXEL_SORT_SETTINGS,
  type PixelSortDirection,
  type PixelSortMode,
  type PixelSortSettings,
} from './pixel-sort-core'

export function readPixelSortSettings(
  controls: Readonly<Record<string, GrainradControlValue>>,
): PixelSortSettings {
  return {
    direction: readEnum(controls.direction, ['horizontal', 'vertical', 'diagonal'], 'horizontal'),
    mode: readEnum(controls['sort-mode'], ['brightness', 'hue', 'saturation'], 'hue'),
    threshold: readNumber(controls.threshold, DEFAULT_PIXEL_SORT_SETTINGS.threshold),
    streakLength: readNumber(controls['streak-length'], DEFAULT_PIXEL_SORT_SETTINGS.streakLength),
    intensity: readNumber(controls.intensity, DEFAULT_PIXEL_SORT_SETTINGS.intensity),
    randomness: readNumber(controls.randomness, DEFAULT_PIXEL_SORT_SETTINGS.randomness),
    reverse: controls.reverse === true,
    brightness: readNumber(controls.brightness, DEFAULT_PIXEL_SORT_SETTINGS.brightness),
    contrast: readNumber(controls.contrast, DEFAULT_PIXEL_SORT_SETTINGS.contrast),
  }
}

function readNumber(value: GrainradControlValue | undefined, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function readEnum<T extends PixelSortDirection | PixelSortMode>(
  value: GrainradControlValue | undefined,
  options: readonly T[],
  fallback: T,
) {
  return typeof value === 'string' && options.includes(value as T) ? value as T : fallback
}

