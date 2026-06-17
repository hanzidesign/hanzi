export type MorphLayerTier = 'stable' | 'experimental'

export type MorphLayerCategory =
  | 'coordinate'
  | 'lens'
  | 'field'
  | 'slice'
  | 'pixel'
  | 'morphology'
  | 'surface-depth'
  | 'vector'
  | 'feedback'

export type MorphLayerPipelinePhase =
  | 'pre-raster'
  | 'coordinate'
  | 'mask'
  | 'surface'
  | 'post'

export type ExperimentalMorphLayerBadge = {
  label: 'Experimental'
  reason: string
  riskNote: string
}

type MorphParamBase = {
  id: string
  label: string
}

export type NumberMorphParamDefinition = MorphParamBase & {
  type: 'number'
  default: number
  min: number
  max: number
  step: number
  unit?: string
  randomize?: {
    min: number
    max: number
    step?: number
  }
}

export type BooleanMorphParamDefinition = MorphParamBase & {
  type: 'boolean'
  default: boolean
}

export type SelectMorphParamDefinition = MorphParamBase & {
  type: 'select'
  default: string
  options: Array<{
    id: string
    label: string
  }>
}

export type MorphParamDefinition =
  | NumberMorphParamDefinition
  | BooleanMorphParamDefinition
  | SelectMorphParamDefinition

export type MorphLayerDefinition = {
  id: string
  name: string
  category: MorphLayerCategory
  tier: MorphLayerTier
  pipelinePhase: MorphLayerPipelinePhase
  params: MorphParamDefinition[]
  capabilityNotes: string
  experimentalBadge?: ExperimentalMorphLayerBadge
}

export type MorphParamValue = number | string | boolean

export type MorphParamValues = Record<string, MorphParamValue>

export type MorphStackPresetLayerDraft = {
  definitionId: string
  enabled: true
  params: MorphParamValues
}

export type MorphStackPresetDraft = {
  seed: number
  layers: MorphStackPresetLayerDraft[]
}
