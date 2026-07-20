import type { GrainradControlValue } from './grainrad-effects'
import {
  DEFAULT_PIXEL_SORT_SETTINGS,
  type PixelSortDirection,
  type PixelSortMode,
  type PixelSortTheme,
  type PixelSortSettings,
} from './pixel-sort-core'

export function readPixelSortSettings(
  controls: Readonly<Record<string, GrainradControlValue>>,
  theme: PixelSortTheme = 'light',
): PixelSortSettings {
  return {
    direction: readEnum(
      controls.direction,
      ['horizontal', 'vertical', 'diagonal', 'anti-diagonal', 'radial'],
      'horizontal',
    ),
    mode: readEnum(controls['sort-mode'], ['brightness', 'hue', 'saturation'], 'hue'),
    threshold: readNumber(controls.threshold, DEFAULT_PIXEL_SORT_SETTINGS.threshold),
    streakLength: readNumber(controls['streak-length'], DEFAULT_PIXEL_SORT_SETTINGS.streakLength),
    intensity: readNumber(controls.intensity, DEFAULT_PIXEL_SORT_SETTINGS.intensity),
    randomness: readNumber(controls.randomness, DEFAULT_PIXEL_SORT_SETTINGS.randomness),
    reverse: controls.reverse === true,
    brightness: readNumber(controls.brightness, DEFAULT_PIXEL_SORT_SETTINGS.brightness),
    contrast: readNumber(controls.contrast, DEFAULT_PIXEL_SORT_SETTINGS.contrast),
    mix: readNumber(controls.mix, DEFAULT_PIXEL_SORT_SETTINGS.mix),
    shadow: readColor(controls.shadow, theme === 'dark' ? '#1b0836' : '#35115c'),
    midtone: readColor(controls.midtone, theme === 'dark' ? '#ff5a9d' : '#c93472'),
    highlight: readColor(controls.highlight, theme === 'dark' ? '#ffe08a' : '#e6a928'),
    background: readColor(controls.background, theme === 'dark' ? '#000000' : '#ffffff'),
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

function readColor(value: GrainradControlValue | undefined, fallback: string) {
  return typeof value === 'string' && /^#[\da-f]{6}$/i.test(value) ? value : fallback
}
