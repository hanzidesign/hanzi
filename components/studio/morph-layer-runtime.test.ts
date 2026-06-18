import { describe, expect, it } from 'vitest'

import type { StudioMorphLayer } from '@/app/studio/studio-store'
import {
  MAX_RUNTIME_MORPH_LAYERS,
  compileMorphRuntimeLayers,
  toRuntimeMorphKindIndex,
} from './morph-layer-runtime'

function morphLayer(partial: Partial<StudioMorphLayer>): StudioMorphLayer {
  return {
    id: partial.id ?? 'morph-layer-test',
    definitionId: partial.definitionId ?? 'sine-bend',
    params: partial.params ?? {},
    enabled: partial.enabled ?? true,
    intensity: partial.intensity ?? 1,
    collapsed: partial.collapsed ?? false,
    locked: partial.locked ?? false,
  }
}

describe('morph layer runtime compiler', () => {
  it('maps stable Morph Layer ids to shader kind indexes', () => {
    expect(toRuntimeMorphKindIndex('sine-bend')).toBe(1)
    expect(toRuntimeMorphKindIndex('swirl-well')).toBe(2)
    expect(toRuntimeMorphKindIndex('curl-flow')).toBe(3)
    expect(toRuntimeMorphKindIndex('band-slice')).toBe(4)
    expect(toRuntimeMorphKindIndex('pixelate-grid')).toBe(5)
    expect(toRuntimeMorphKindIndex('ink-compression')).toBe(6)
    expect(toRuntimeMorphKindIndex('surface-depth')).toBe(7)
    expect(toRuntimeMorphKindIndex('feedback-advection')).toBe(0)
  })

  it('compiles enabled stable Morph layers into fixed-cap shader uniforms', () => {
    const compiled = compileMorphRuntimeLayers([
      morphLayer({
        id: 'off',
        definitionId: 'sine-bend',
        enabled: false,
      }),
      morphLayer({
        id: 'sine',
        definitionId: 'sine-bend',
        intensity: 0.6,
        params: {
          amplitude: 0.2,
          frequency: 3,
          phase: 0.25,
        },
      }),
      morphLayer({
        id: 'band',
        definitionId: 'band-slice',
        intensity: 1.4,
        params: {
          strength: 0.3,
          bands: 12,
          axis: 'vertical',
        },
      }),
      morphLayer({
        id: 'experimental',
        definitionId: 'feedback-advection',
      }),
    ])

    expect(compiled.count).toBe(2)
    expect(compiled.kinds.slice(0, 3)).toEqual([1, 4, 0])
    expect(compiled.intensities.slice(0, 3)).toEqual([0.6, 1, 0])
    expect(compiled.params[0]).toEqual([0.2, 3, 0.25, 0])
    expect(compiled.params[1]).toEqual([0.3, 12, 1, 0])
    expect(compiled.kinds).toHaveLength(MAX_RUNTIME_MORPH_LAYERS)
    expect(compiled.params).toHaveLength(MAX_RUNTIME_MORPH_LAYERS)
  })
})
