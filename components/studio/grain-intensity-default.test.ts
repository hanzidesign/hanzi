import { describe, expect, it } from 'vitest'

import { createStudioStore } from '@/app/studio/studio-store'
import {
  GRAINRAD_COMMON_POST_PROCESSING_GROUPS,
  createDefaultGrainradEffectControls,
} from './grainrad-effects'
import { compileGrainradEffectRuntime } from './grainrad-effect-runtime'

describe('Grain Intensity default', () => {
  it('uses 5 in the shared schema and every effect control set', () => {
    const grainIntensity = GRAINRAD_COMMON_POST_PROCESSING_GROUPS
      .flatMap((group) => group.controls)
      .find((control) => control.id === 'grain-intensity')
    const defaults = createDefaultGrainradEffectControls()

    expect(grainIntensity?.defaultValue).toBe(5)
    expect(Object.values(defaults)).toHaveLength(15)

    for (const controls of Object.values(defaults)) {
      expect(controls['grain-intensity']).toBe(5)
    }
  })

  it('restores 5 when the selected effect is reset', () => {
    const store = createStudioStore()

    store.getState().setGrainradEffectControl('ascii', 'grain-intensity', 42)
    expect(store.getState().grainradEffect.controls.ascii['grain-intensity']).toBe(42)

    store.getState().resetSelectedEffectControls()
    expect(store.getState().grainradEffect.controls.ascii['grain-intensity']).toBe(5)
  })

  it('compiles a missing Grain Intensity value to 5 percent', () => {
    const runtime = compileGrainradEffectRuntime({
      selectedEffectId: 'ascii',
      controls: {},
    })

    expect(runtime.postValues[1]).toBe(0.05)
  })
})
