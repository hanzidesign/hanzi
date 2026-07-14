import type { GrainradControlValue } from './grainrad-effects'

export const GRAINRAD_SHARED_CONTROLLER_IDS = new Set([
  'processing-invert',
  'brightness-map',
  'edge-enhance',
  'blur',
  'quantize-colors',
  'shape-matching',
  'bloom',
  'grain-intensity',
  'grain-size',
  'grain-speed',
  'chromatic',
  'scanlines',
  'vignette',
  'crt-curve',
  'phosphor',
])

export function withoutSharedControllerValues(
  controls: Record<string, GrainradControlValue>,
) {
  return Object.fromEntries(
    Object.entries(controls).filter(([id]) => !GRAINRAD_SHARED_CONTROLLER_IDS.has(id)),
  )
}
