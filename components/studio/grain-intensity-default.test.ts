import { describe, expect, it } from 'vitest'

import { createStudioStore } from '@/app/studio/studio-store'
import {
  STUDIO_COMMON_POST_PROCESSING_GROUPS,
  createDefaultStudioEffectControls,
} from './studio-effects'
import { compileStudioEffectRuntime } from './studio-effect-runtime'

describe('Post-processing defaults', () => {
  it('uses 1 for Grain Intensity in the shared schema and every effect control set', () => {
    const grainIntensity = STUDIO_COMMON_POST_PROCESSING_GROUPS
      .flatMap((group) => group.controls)
      .find((control) => control.id === 'grain-intensity')
    const defaults = createDefaultStudioEffectControls()

    expect(grainIntensity?.defaultValue).toBe(1)
    expect(Object.values(defaults)).toHaveLength(15)

    for (const controls of Object.values(defaults)) {
      expect(controls['grain-intensity']).toBe(1)
    }
  })

  it('restores the changed Post defaults when the selected effect is reset', () => {
    const store = createStudioStore()

    store.getState().setStudioEffectControl('ascii', 'grain-intensity', 42)
    store.getState().setStudioEffectControl('ascii', 'scanline-opacity', 0.75)
    expect(store.getState().studioEffect.controls.ascii['grain-intensity']).toBe(42)
    expect(store.getState().studioEffect.controls.ascii['scanline-opacity']).toBe(0.75)

    store.getState().resetSelectedEffectControls()
    expect(store.getState().studioEffect.controls.ascii['grain-intensity']).toBe(1)
    expect(store.getState().studioEffect.controls.ascii['scanline-opacity']).toBe(0.2)
  })

  it('compiles missing Post controls to their runtime fallbacks', () => {
    const runtime = compileStudioEffectRuntime({
      selectedEffectId: 'ascii',
      controls: {},
    })

    expect(runtime.postValues[1]).toBe(0.01)
    expect(runtime.postValues[14]).toBe(5)
    expect(runtime.postValues[15]).toBe(0.2)
    expect(runtime.postValues[19]).toBe(0.1)
  })
})
