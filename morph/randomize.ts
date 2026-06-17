import {
  getMorphLayerDefinitionsByTier,
  morphLayerDefinitions,
} from './catalogue'
import type {
  MorphLayerDefinition,
  MorphParamDefinition,
  MorphParamValue,
  MorphStackPresetDraft,
} from './types'

export const DEFAULT_RANDOM_MORPH_LAYER_COUNT = 3

type RandomizeMorphStackPresetOptions = {
  seed: number
  layerCount?: number
  includeExperimental?: boolean
}

export function normalizeMorphSeed(seed: number) {
  return Number.isFinite(seed) ? Math.trunc(seed) >>> 0 : 0
}

export function randomizeMorphStackPreset({
  seed,
  layerCount = DEFAULT_RANDOM_MORPH_LAYER_COUNT,
  includeExperimental = false,
}: RandomizeMorphStackPresetOptions): MorphStackPresetDraft {
  const normalizedSeed = normalizeMorphSeed(seed)
  const random = createSeededRandom(normalizedSeed)
  const pool = includeExperimental
    ? [...morphLayerDefinitions]
    : getMorphLayerDefinitionsByTier('stable')
  const selectedDefinitions = shuffleMorphLayerDefinitions(pool, random).slice(
    0,
    sanitizeLayerCount(layerCount, pool.length),
  )

  return {
    seed: normalizedSeed,
    layers: selectedDefinitions.map((definition) => ({
      definitionId: definition.id,
      enabled: true,
      params: randomizeMorphParams(definition, random),
    })),
  }
}

function randomizeMorphParams(
  definition: MorphLayerDefinition,
  random: () => number,
) {
  const params: Record<string, MorphParamValue> = {}

  for (const param of definition.params) {
    params[param.id] = randomizeMorphParamValue(param, random)
  }

  return params
}

function randomizeMorphParamValue(
  param: MorphParamDefinition,
  random: () => number,
): MorphParamValue {
  switch (param.type) {
    case 'number': {
      const min = param.randomize?.min ?? param.min
      const max = param.randomize?.max ?? param.max
      const step = param.randomize?.step ?? param.step
      const steps = Math.max(0, Math.round((max - min) / step))
      const value = min + Math.floor(random() * (steps + 1)) * step

      return clampNumber(roundNumber(value), min, max)
    }
    case 'boolean':
      return random() >= 0.5
    case 'select': {
      const index = Math.floor(random() * param.options.length)

      return param.options[index]?.id ?? param.default
    }
  }
}

function shuffleMorphLayerDefinitions(
  definitions: readonly MorphLayerDefinition[],
  random: () => number,
) {
  const shuffled = [...definitions]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = shuffled[index]
    shuffled[index] = shuffled[swapIndex]
    shuffled[swapIndex] = current
  }

  return shuffled
}

function sanitizeLayerCount(layerCount: number, maxLayerCount: number) {
  if (!Number.isFinite(layerCount)) {
    return DEFAULT_RANDOM_MORPH_LAYER_COUNT
  }

  return Math.max(0, Math.min(maxLayerCount, Math.floor(layerCount)))
}

function createSeededRandom(seed: number) {
  let state = seed || 0x6d2b79f5

  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0

    return state / 0x100000000
  }
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function roundNumber(value: number) {
  return Number(value.toFixed(6))
}
