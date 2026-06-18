import { describe, expect, it } from 'vitest'

import { buildCoherentRandomizePreset, RANDOMIZE_PRESET_IDS } from './randomize-presets'

describe('coherent randomize presets', () => {
  it('builds deterministic preset stacks for the same seed and preset id', () => {
    const first = buildCoherentRandomizePreset({ seed: 42, presetId: 'chrome-glass' })
    const second = buildCoherentRandomizePreset({ seed: 42, presetId: 'chrome-glass' })

    expect(first).toEqual(second)
    expect(first.shaderLayers.some((layer) => layer.effectId === 'fluid-chrome')).toBe(true)
    expect(first.animation.speed).toBeGreaterThanOrEqual(0)
  })

  it('covers the locked Phase 5B art preset names', () => {
    expect(RANDOMIZE_PRESET_IDS).toEqual([
      'graphite-relief',
      'wet-ink-bloom',
      'carved-lacquer',
      'digital-slice',
      'oxidized-metal',
      'chrome-glass',
      'watercolor-paper',
    ])
  })
})
