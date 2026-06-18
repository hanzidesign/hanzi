import { describe, expect, it } from 'vitest'
import {
  SHADER_LAYER_PRIMITIVES,
  effectDefinitions,
  getDefaultRandomizableEffectDefinitions,
  getEffectDefinitionById,
  validateEffectRegistry,
} from './effect-registry'

const LOCKED_SHADER_PRIMITIVES = [
  'time',
  'mouse',
  'resolution',
  'fbm-noise',
  'palette',
  'dither',
  'scanline',
  'channel-offset',
  'uv-refraction',
  'smoke-fire-aurora',
  'raymarching',
]

describe('Phase 5B effect registry', () => {
  it('validates every effect definition against the catalogue contract', () => {
    expect(() => validateEffectRegistry(effectDefinitions)).not.toThrow()
  })

  it('locks the shared GLSL primitive set for Shader Layers', () => {
    expect(SHADER_LAYER_PRIMITIVES).toEqual(LOCKED_SHADER_PRIMITIVES)

    const shaderEffects = effectDefinitions.filter((effect) =>
      ['foreground-shader', 'background-shader'].includes(effect.stage),
    )

    expect(shaderEffects.length).toBeGreaterThan(0)

    for (const effect of shaderEffects) {
      expect(effect.requiredPrimitives.length).toBeGreaterThan(0)
      expect(effect.requiredPrimitives.every((primitive) => LOCKED_SHADER_PRIMITIVES.includes(primitive))).toBe(
        true,
      )
    }
  })

  it('declares the required Phase 5B shader-first candidate effects', () => {
    expectCandidate('fluid-chrome', {
      tier: 'experimental',
      visibility: 'visible',
      defaultRandomize: false,
    })
    expectCandidate('frosted-fluted-glass', {
      tier: 'experimental',
      visibility: 'visible',
      defaultRandomize: false,
    })
    expectCandidate('watercolor-paper', {
      tier: 'stable',
      visibility: 'visible',
      defaultRandomize: true,
    })
    expectCandidate('holofoil', {
      tier: 'experimental',
      visibility: 'visible',
      defaultRandomize: false,
    })
    expectCandidate('damaged-sensor', {
      tier: 'stable',
      visibility: 'visible',
      defaultRandomize: true,
    })
    expectCandidate('dithered-reveal', {
      tier: 'stable',
      visibility: 'visible',
      defaultRandomize: true,
    })
    expectCandidate('raymarched-interior', {
      tier: 'experimental',
      visibility: 'visible',
      defaultRandomize: false,
    })
    expectCandidate('shadergpt-sketch', {
      tier: 'experimental',
      visibility: 'development-only',
      defaultRandomize: false,
    })
  })

  it('requires component graph metadata for visible Shader, Pattern, and Post effects', () => {
    const graphEffects = effectDefinitions.filter(
      (effect) =>
        effect.visibility === 'visible' &&
        ['foreground-shader', 'background-shader', 'pattern-modulation', 'post-surface'].includes(effect.stage),
    )

    expect(graphEffects.length).toBeGreaterThan(0)

    for (const effect of graphEffects) {
      expect(effect.componentGraph).toBeDefined()
      expect(effect.componentGraph?.blendModes.length).toBeGreaterThan(0)
      expect(effect.componentGraph?.maskModes).toContain('none')
      expect(effect.componentGraph?.dynamicPropDrivers).toContain('static')
      expect(typeof effect.componentGraph?.supportsCustomSvgSdf).toBe('boolean')
    }
  })

  it('keeps all visible effects backed by UI params and defaults', () => {
    const visibleEffects = effectDefinitions.filter((effect) => effect.visibility === 'visible')

    for (const effect of visibleEffects) {
      expect(effect.params.length).toBeGreaterThan(0)

      for (const param of effect.params) {
        expect(Object.hasOwn(effect.defaults, param.id)).toBe(true)
      }
    }
  })

  it('excludes experimental and development-only effects from default randomization', () => {
    const defaultRandomizableIds = getDefaultRandomizableEffectDefinitions().map((effect) => effect.id)

    expect(defaultRandomizableIds.length).toBeGreaterThan(0)

    for (const effect of effectDefinitions) {
      if (effect.tier === 'experimental' || effect.visibility === 'development-only') {
        expect(defaultRandomizableIds).not.toContain(effect.id)
      }
    }
  })
})

function expectCandidate(
  effectId: string,
  expected: {
    tier: 'stable' | 'experimental'
    visibility: 'visible' | 'development-only'
    defaultRandomize: boolean
  },
) {
  const effect = getEffectDefinitionById(effectId)

  expect(effect).toBeDefined()
  expect(effect?.tier).toBe(expected.tier)
  expect(effect?.visibility).toBe(expected.visibility)
  expect(effect?.randomize.defaultEnabled).toBe(expected.defaultRandomize)
}
