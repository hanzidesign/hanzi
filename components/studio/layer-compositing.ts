export const LAYER_BLEND_MODES = ['normal', 'multiply', 'screen', 'overlay', 'soft-light'] as const

export type LayerBlendMode = (typeof LAYER_BLEND_MODES)[number]

export type LayerFamily = 'morph' | 'surfaceShader' | 'pattern' | 'postSurface'

export type LayerRenderPhase = 'pre-raster' | 'coordinate' | 'mask' | 'surface' | 'pattern' | 'post'

export type LayerRenderPlanInput = {
  id: string
  family: LayerFamily
  phase: LayerRenderPhase
  enabled: boolean
  intensity: number
}

export type LayerRenderPlanItem = LayerRenderPlanInput & {
  intensity: number
}

export const ACTIVE_LAYER_CAPS: Record<LayerFamily, number> = {
  morph: 8,
  surfaceShader: 8,
  pattern: 3,
  postSurface: 3,
}

const PHASE_ORDER: Record<LayerRenderPhase, number> = {
  'pre-raster': 0,
  coordinate: 1,
  mask: 2,
  surface: 3,
  pattern: 4,
  post: 5,
}

export function clampLayerIntensity(value: unknown, fallback = 1) {
  const number = typeof value === 'number' && Number.isFinite(value) ? value : fallback

  return Math.min(1, Math.max(0, number))
}

export function isLayerBlendMode(value: unknown): value is LayerBlendMode {
  return LAYER_BLEND_MODES.includes(value as LayerBlendMode)
}

export function sanitizeLayerBlendMode(value: unknown, fallback: LayerBlendMode = 'normal') {
  return isLayerBlendMode(value) ? value : fallback
}

export function compileLayerRenderPlan(layers: LayerRenderPlanInput[]) {
  return layers
    .map((layer, index) => ({
      ...layer,
      intensity: clampLayerIntensity(layer.intensity),
      sourceIndex: index,
    }))
    .filter((layer) => layer.enabled && layer.intensity > 0)
    .sort((a, b) => PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase] || a.sourceIndex - b.sourceIndex)
    .map((layer) => ({
      id: layer.id,
      family: layer.family,
      phase: layer.phase,
      enabled: layer.enabled,
      intensity: layer.intensity,
    }) satisfies LayerRenderPlanItem)
}
