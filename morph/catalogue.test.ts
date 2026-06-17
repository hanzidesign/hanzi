import { describe, expect, it } from 'vitest'

import {
  EXPERIMENTAL_MORPH_LAYER_IDS,
  STABLE_MORPH_LAYER_IDS,
  getMorphLayerDefinitionById,
  morphLayerDefinitions,
  validateMorphLayerDefinition,
} from './catalogue'
import { createDefaultMorphParams } from './params'

describe('Morph Layer Catalogue', () => {
  it('registers the Phase 2 Stable first set in the locked order', () => {
    expect(STABLE_MORPH_LAYER_IDS).toEqual([
      'sine-bend',
      'swirl-well',
      'curl-flow',
      'band-slice',
      'pixelate-grid',
      'ink-compression',
      'surface-depth',
    ])
  })

  it('registers only Morph Layer experimental entries and keeps WebGPU out', () => {
    expect(EXPERIMENTAL_MORPH_LAYER_IDS).toEqual([
      'vector-pre-morph',
      'pixel-sort-heavy',
      'feedback-advection',
    ])
    expect(getMorphLayerDefinitionById('webgpu-renderer')).toBeUndefined()
  })

  it('keeps ids unique and every definition valid', () => {
    const ids = morphLayerDefinitions.map((definition) => definition.id)

    expect(new Set(ids).size).toBe(ids.length)

    for (const definition of morphLayerDefinitions) {
      expect(() => validateMorphLayerDefinition(definition)).not.toThrow()
    }
  })

  it('maps the first Stable set across broad non-fluid categories', () => {
    expect(
      Object.fromEntries(
        STABLE_MORPH_LAYER_IDS.map((id) => [
          id,
          getMorphLayerDefinitionById(id)?.category,
        ]),
      ),
    ).toEqual({
      'sine-bend': 'coordinate',
      'swirl-well': 'lens',
      'curl-flow': 'field',
      'band-slice': 'slice',
      'pixelate-grid': 'pixel',
      'ink-compression': 'morphology',
      'surface-depth': 'surface-depth',
    })
  })

  it('requires Experimental layers to expose badge metadata', () => {
    for (const definition of morphLayerDefinitions) {
      if (definition.tier === 'experimental') {
        expect(definition.experimentalBadge?.label).toBe('Experimental')
        expect(definition.experimentalBadge?.reason.length).toBeGreaterThan(0)
        expect(definition.experimentalBadge?.riskNote.length).toBeGreaterThan(0)
      }
    }
  })

  it('creates complete default params without using shader uniform names', () => {
    for (const definition of morphLayerDefinitions) {
      const defaults = createDefaultMorphParams(definition)

      expect(Object.keys(defaults)).toEqual(
        definition.params.map((param) => param.id),
      )
      expect(JSON.stringify(definition.params)).not.toContain('uniformName')
    }
  })

  it('rejects invalid number params before UI or randomization can use them', () => {
    const definition = getMorphLayerDefinitionById('sine-bend')

    if (!definition) {
      throw new Error('Expected sine-bend definition')
    }

    expect(() =>
      validateMorphLayerDefinition({
        ...definition,
        params: [
          {
            type: 'number',
            id: 'bad',
            label: 'Bad',
            default: 2,
            min: 0,
            max: 1,
            step: 0.1,
            randomize: { min: 0, max: 1 },
          },
        ],
      }),
    ).toThrow(/invalid number bounds/)
  })
})
