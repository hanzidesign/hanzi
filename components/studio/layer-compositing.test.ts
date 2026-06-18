import { describe, expect, it } from 'vitest'

import {
  ACTIVE_LAYER_CAPS,
  clampLayerIntensity,
  compileLayerRenderPlan,
  isLayerBlendMode,
  sanitizeLayerBlendMode,
} from './layer-compositing'

describe('layer compositing contract', () => {
  it('clamps layer intensity to the shared zero-to-one range', () => {
    expect(clampLayerIntensity(-0.2)).toBe(0)
    expect(clampLayerIntensity(0.45)).toBe(0.45)
    expect(clampLayerIntensity(2)).toBe(1)
    expect(clampLayerIntensity(Number.NaN, 0.7)).toBe(0.7)
  })

  it('accepts only supported blend modes and falls back to normal', () => {
    expect(isLayerBlendMode('overlay')).toBe(true)
    expect(isLayerBlendMode('screen')).toBe(true)
    expect(isLayerBlendMode('erase')).toBe(false)
    expect(sanitizeLayerBlendMode('multiply')).toBe('multiply')
    expect(sanitizeLayerBlendMode('unknown')).toBe('normal')
  })

  it('declares stable active layer caps for each stack family', () => {
    expect(ACTIVE_LAYER_CAPS).toEqual({
      morph: 8,
      surfaceShader: 8,
      pattern: 3,
      postSurface: 3,
    })
  })

  it('compiles enabled layers by fixed render phase while preserving order inside each phase', () => {
    const plan = compileLayerRenderPlan([
      { id: 'shader-1', family: 'surfaceShader', phase: 'surface', enabled: true, intensity: 1 },
      { id: 'coord-1', family: 'morph', phase: 'coordinate', enabled: true, intensity: 0.5 },
      { id: 'off', family: 'pattern', phase: 'pattern', enabled: false, intensity: 1 },
      { id: 'mask-1', family: 'morph', phase: 'mask', enabled: true, intensity: 1 },
      { id: 'coord-2', family: 'morph', phase: 'coordinate', enabled: true, intensity: 0.25 },
      { id: 'post-1', family: 'postSurface', phase: 'post', enabled: true, intensity: 1 },
    ])

    expect(plan.map((layer) => layer.id)).toEqual(['coord-1', 'coord-2', 'mask-1', 'shader-1', 'post-1'])
    expect(plan.map((layer) => layer.intensity)).toEqual([0.5, 0.25, 1, 1, 1])
  })
})
