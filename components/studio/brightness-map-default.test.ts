import { describe, expect, it } from 'vitest'

import { createStudioStore } from '@/app/studio/studio-store'
import {
  GRAINRAD_COMMON_PROCESSING_GROUPS,
  createDefaultGrainradEffectControls,
  getGrainradProcessingGroups,
} from './grainrad-effects'
import { compileGrainradEffectRuntime } from './grainrad-effect-runtime'

function brightnessMapControl(groups = GRAINRAD_COMMON_PROCESSING_GROUPS) {
  return groups
    .flatMap((group) => group.controls)
    .find((control) => control.id === 'brightness-map')
}

describe('Brightness Map defaults', () => {
  it('uses the neutral default and the Matrix Rain-specific maximum contract', () => {
    expect(brightnessMapControl()).toMatchObject({
      defaultValue: 1,
      min: 0,
      max: 4,
    })
    expect(brightnessMapControl(getGrainradProcessingGroups('matrix-rain'))).toMatchObject({
      defaultValue: 1,
      min: 0,
      max: 6,
    })
  })

  it('uses the neutral Matrix Rain default in initial controls, Reset, and compiler fallback', () => {
    const defaults = createDefaultGrainradEffectControls()
    const store = createStudioStore()

    expect(defaults.ascii['brightness-map']).toBe(1)
    expect(defaults['matrix-rain']['brightness-map']).toBe(1)
    expect(store.getState().grainradEffect.controls['matrix-rain']['brightness-map']).toBe(1)

    store.getState().setSelectedEffect('matrix-rain')
    store.getState().setGrainradEffectControl('matrix-rain', 'brightness-map', 6)
    store.getState().resetSelectedEffectControls()

    expect(store.getState().grainradEffect.controls['matrix-rain']['brightness-map']).toBe(1)
    expect(compileGrainradEffectRuntime({
      selectedEffectId: 'matrix-rain',
      controls: {},
    }).processingValues[1]).toBe(1)
  })
})
