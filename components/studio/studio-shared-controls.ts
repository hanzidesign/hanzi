import type { StudioControlValue } from './studio-effects'

export const STUDIO_SHARED_CONTROLLER_IDS = new Set([
  'processing-invert',
  'brightness-map',
  'edge-enhance',
  'blur',
  'quantize-colors',
  'shape-matching',
  'bloom',
  'bloom-threshold',
  'bloom-soft-threshold',
  'bloom-intensity',
  'bloom-radius',
  'grain',
  'grain-mode',
  'grain-intensity',
  'grain-size',
  'grain-speed',
  'chromatic',
  'chromatic-offset',
  'scanlines',
  'scanline-opacity',
  'scanline-spacing',
  'scanline-offset',
  'scanline-speed',
  'scanline-direction',
  'vignette',
  'vignette-intensity',
  'vignette-radius',
  'crt-curve',
  'crt-amount',
  'phosphor',
  'phosphor-color',
  'phosphor-custom-color',
])

export function withoutSharedControllerValues(
  controls: Record<string, StudioControlValue>,
) {
  return Object.fromEntries(
    Object.entries(controls).filter(([id]) => !STUDIO_SHARED_CONTROLLER_IDS.has(id)),
  )
}
