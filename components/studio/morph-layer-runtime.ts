import type { StudioMorphLayer } from '@/app/studio/studio-store'
import { clampLayerIntensity } from '@/components/studio/layer-compositing'

export const MAX_RUNTIME_MORPH_LAYERS = 8

type RuntimeMorphLayer = {
  kind: number
  intensity: number
  params: [number, number, number, number]
}

export function toRuntimeMorphKindIndex(definitionId: string) {
  switch (definitionId) {
    case 'sine-bend':
      return 1
    case 'swirl-well':
      return 2
    case 'curl-flow':
      return 3
    case 'band-slice':
      return 4
    case 'pixelate-grid':
      return 5
    case 'ink-compression':
      return 6
    case 'surface-depth':
      return 7
    default:
      return 0
  }
}

export function compileMorphRuntimeLayers(layers: StudioMorphLayer[] = []) {
  const runtimeLayers = layers
    .map(toRuntimeMorphLayer)
    .filter((layer): layer is RuntimeMorphLayer => Boolean(layer))
    .slice(0, MAX_RUNTIME_MORPH_LAYERS)

  const kinds = runtimeLayers.map((layer) => layer.kind)
  const intensities = runtimeLayers.map((layer) => layer.intensity)
  const params = runtimeLayers.map((layer) => layer.params)

  while (kinds.length < MAX_RUNTIME_MORPH_LAYERS) {
    kinds.push(0)
  }

  while (intensities.length < MAX_RUNTIME_MORPH_LAYERS) {
    intensities.push(0)
  }

  while (params.length < MAX_RUNTIME_MORPH_LAYERS) {
    params.push([0, 0, 0, 0])
  }

  return {
    count: runtimeLayers.length,
    kinds,
    intensities,
    params,
  }
}

function toRuntimeMorphLayer(layer: StudioMorphLayer): RuntimeMorphLayer | null {
  const kind = toRuntimeMorphKindIndex(layer.definitionId)
  const intensity = clampLayerIntensity(layer.intensity)

  if (!layer.enabled || kind === 0 || intensity <= 0) {
    return null
  }

  return {
    kind,
    intensity,
    params: readRuntimeMorphParams(layer),
  }
}

function readRuntimeMorphParams(layer: StudioMorphLayer): [number, number, number, number] {
  switch (layer.definitionId) {
    case 'sine-bend':
      return [
        readNumber(layer.params.amplitude),
        readNumber(layer.params.frequency),
        readNumber(layer.params.phase),
        0,
      ]
    case 'swirl-well':
      return [
        readNumber(layer.params.strength),
        readNumber(layer.params.radius),
        readNumber(layer.params.centerX),
        readNumber(layer.params.centerY),
      ]
    case 'curl-flow':
      return [
        readNumber(layer.params.strength),
        readNumber(layer.params.scale),
        readNumber(layer.params.flow),
        0,
      ]
    case 'band-slice':
      return [
        readNumber(layer.params.strength),
        readNumber(layer.params.bands),
        layer.params.axis === 'vertical' ? 1 : 0,
        0,
      ]
    case 'pixelate-grid':
      return [readNumber(layer.params.cellSize), readNumber(layer.params.mix), 0, 0]
    case 'ink-compression':
      return [readNumber(layer.params.amount), readNumber(layer.params.softness), 0, 0]
    case 'surface-depth':
      return [
        readNumber(layer.params.depth),
        readNumber(layer.params.lightAngle),
        readNumber(layer.params.specular),
        0,
      ]
    default:
      return [0, 0, 0, 0]
  }
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}
