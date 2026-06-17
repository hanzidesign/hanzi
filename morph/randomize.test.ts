import { describe, expect, it } from 'vitest'

import {
  EXPERIMENTAL_MORPH_LAYER_IDS,
  getMorphLayerDefinitionById,
} from './catalogue'
import {
  DEFAULT_RANDOM_MORPH_LAYER_COUNT,
  normalizeMorphSeed,
  randomizeMorphStackPreset,
} from './randomize'

const experimentalMorphLayerIds: ReadonlyArray<string> =
  EXPERIMENTAL_MORPH_LAYER_IDS

describe('Morph Stack preset randomization', () => {
  it('normalizes numeric seeds to unsigned 32-bit values', () => {
    expect(normalizeMorphSeed(-1)).toBe(4294967295)
    expect(normalizeMorphSeed(1.9)).toBe(1)
    expect(normalizeMorphSeed(Number.NaN)).toBe(0)
  })

  it('returns the same preset draft for the same seed', () => {
    expect(randomizeMorphStackPreset({ seed: 42 })).toEqual(
      randomizeMorphStackPreset({ seed: 42 }),
    )
  })

  it('defaults to a three-layer Stable-only Morph Stack preset draft', () => {
    const preset = randomizeMorphStackPreset({ seed: 12 })

    expect(preset.seed).toBe(12)
    expect(preset.layers).toHaveLength(DEFAULT_RANDOM_MORPH_LAYER_COUNT)

    for (const layer of preset.layers) {
      expect(layer.enabled).toBe(true)
      expect(getMorphLayerDefinitionById(layer.definitionId)?.tier).toBe(
        'stable',
      )
    }
  })

  it('can include Experimental Morph Layers only when explicitly opted in', () => {
    const stablePreset = randomizeMorphStackPreset({
      seed: 7,
      layerCount: 10,
    })
    const experimentalPreset = randomizeMorphStackPreset({
      seed: 7,
      layerCount: 10,
      includeExperimental: true,
    })

    expect(
      stablePreset.layers.some((layer) =>
        experimentalMorphLayerIds.includes(layer.definitionId),
      ),
    ).toBe(false)
    expect(
      experimentalPreset.layers.some((layer) =>
        experimentalMorphLayerIds.includes(layer.definitionId),
      ),
    ).toBe(true)
  })

  it('uses param randomization bounds instead of mutating catalogue defaults', () => {
    const preset = randomizeMorphStackPreset({
      seed: 19,
      layerCount: 7,
    })

    for (const layer of preset.layers) {
      const definition = getMorphLayerDefinitionById(layer.definitionId)

      if (!definition) {
        throw new Error(`Missing definition ${layer.definitionId}`)
      }

      for (const param of definition.params) {
        const value = layer.params[param.id]

        if (param.type === 'number') {
          const min = param.randomize?.min ?? param.min
          const max = param.randomize?.max ?? param.max

          expect(typeof value).toBe('number')
          expect(value).toBeGreaterThanOrEqual(min)
          expect(value).toBeLessThanOrEqual(max)
        }
      }
    }
  })
})
