import type {
  MorphLayerCategory,
  MorphLayerDefinition,
  MorphLayerPipelinePhase,
  MorphLayerTier,
  MorphParamDefinition,
} from './types'

const MORPH_LAYER_CATEGORIES = new Set<MorphLayerCategory>([
  'coordinate',
  'lens',
  'field',
  'slice',
  'pixel',
  'morphology',
  'surface-depth',
  'vector',
  'feedback',
])

const MORPH_LAYER_TIERS = new Set<MorphLayerTier>([
  'stable',
  'experimental',
])

const MORPH_LAYER_PIPELINE_PHASES = new Set<MorphLayerPipelinePhase>([
  'pre-raster',
  'coordinate',
  'mask',
  'surface',
  'post',
])

export const STABLE_MORPH_LAYER_IDS = [
  'sine-bend',
  'swirl-well',
  'curl-flow',
  'band-slice',
  'pixelate-grid',
  'ink-compression',
  'surface-depth',
] as const

export const EXPERIMENTAL_MORPH_LAYER_IDS = [
  'vector-pre-morph',
  'pixel-sort-heavy',
  'feedback-advection',
] as const

const stableMorphLayers: MorphLayerDefinition[] = [
  {
    id: 'sine-bend',
    name: 'Sine Bend',
    category: 'coordinate',
    tier: 'stable',
    pipelinePhase: 'coordinate',
    capabilityNotes: 'Applies a deterministic sinusoidal coordinate bend.',
    params: [
      numberParam('amplitude', 'Amplitude', 0.18, 0, 0.7, 0.01, {
        min: 0.05,
        max: 0.45,
      }),
      numberParam('frequency', 'Frequency', 2.5, 0.5, 8, 0.1, {
        min: 1,
        max: 5,
      }),
      numberParam('phase', 'Phase', 0, 0, 1, 0.01, {
        min: 0,
        max: 1,
      }),
    ],
  },
  {
    id: 'swirl-well',
    name: 'Swirl Well',
    category: 'lens',
    tier: 'stable',
    pipelinePhase: 'coordinate',
    capabilityNotes: 'Creates a local twist around a center point.',
    params: [
      numberParam('strength', 'Strength', 0.35, -1, 1, 0.01, {
        min: -0.7,
        max: 0.7,
      }),
      numberParam('radius', 'Radius', 0.5, 0.1, 1.2, 0.01, {
        min: 0.25,
        max: 0.9,
      }),
      numberParam('centerX', 'Center X', 0.5, 0, 1, 0.01, {
        min: 0.25,
        max: 0.75,
      }),
      numberParam('centerY', 'Center Y', 0.5, 0, 1, 0.01, {
        min: 0.25,
        max: 0.75,
      }),
    ],
  },
  {
    id: 'curl-flow',
    name: 'Curl Flow',
    category: 'field',
    tier: 'stable',
    pipelinePhase: 'coordinate',
    capabilityNotes: 'Uses a low-cost field warp inspired by curl noise.',
    params: [
      numberParam('strength', 'Strength', 0.22, 0, 0.8, 0.01, {
        min: 0.08,
        max: 0.55,
      }),
      numberParam('scale', 'Scale', 2.5, 0.5, 8, 0.1, {
        min: 1.2,
        max: 5,
      }),
      numberParam('flow', 'Flow', 0.2, 0, 1, 0.01, {
        min: 0,
        max: 0.7,
      }),
    ],
  },
  {
    id: 'band-slice',
    name: 'Band Slice',
    category: 'slice',
    tier: 'stable',
    pipelinePhase: 'coordinate',
    capabilityNotes: 'Offsets horizontal or vertical bands without feedback.',
    params: [
      numberParam('strength', 'Strength', 0.16, 0, 0.6, 0.01, {
        min: 0.04,
        max: 0.35,
      }),
      numberParam('bands', 'Bands', 8, 2, 32, 1, {
        min: 4,
        max: 18,
        step: 1,
      }),
      selectParam('axis', 'Axis', 'horizontal', [
        ['horizontal', 'Horizontal'],
        ['vertical', 'Vertical'],
      ]),
    ],
  },
  {
    id: 'pixelate-grid',
    name: 'Pixelate Grid',
    category: 'pixel',
    tier: 'stable',
    pipelinePhase: 'post',
    capabilityNotes: 'Quantizes sampling into a stable grid structure.',
    params: [
      numberParam('cellSize', 'Cell Size', 12, 2, 48, 1, {
        min: 6,
        max: 28,
        step: 1,
      }),
      numberParam('mix', 'Mix', 0.75, 0, 1, 0.01, {
        min: 0.35,
        max: 1,
      }),
    ],
  },
  {
    id: 'ink-compression',
    name: 'Ink Compression',
    category: 'morphology',
    tier: 'stable',
    pipelinePhase: 'mask',
    capabilityNotes: 'Compresses stroke shape at the mask level.',
    params: [
      numberParam('amount', 'Amount', 0.18, -0.5, 0.5, 0.01, {
        min: -0.25,
        max: 0.35,
      }),
      numberParam('softness', 'Softness', 0.08, 0, 0.3, 0.01, {
        min: 0.02,
        max: 0.16,
      }),
    ],
  },
  {
    id: 'surface-depth',
    name: 'Surface Depth',
    category: 'surface-depth',
    tier: 'stable',
    pipelinePhase: 'surface',
    capabilityNotes: 'Adds heightfield-like lighting without extruded geometry.',
    params: [
      numberParam('depth', 'Depth', 0.35, 0, 1, 0.01, {
        min: 0.12,
        max: 0.75,
      }),
      numberParam('lightAngle', 'Light Angle', 35, 0, 360, 1, {
        min: 0,
        max: 360,
        step: 1,
      }),
      numberParam('specular', 'Specular', 0.18, 0, 1, 0.01, {
        min: 0,
        max: 0.45,
      }),
    ],
  },
]

const experimentalMorphLayers: MorphLayerDefinition[] = [
  {
    id: 'vector-pre-morph',
    name: 'Vector Pre-Morph',
    category: 'vector',
    tier: 'experimental',
    pipelinePhase: 'pre-raster',
    capabilityNotes: 'Perturbs SVG path geometry before rasterization.',
    experimentalBadge: experimentalBadge(
      'Runs before rasterization and depends on future SVG path tooling.',
      'May be rough on complex character paths.',
    ),
    params: [
      numberParam('jitter', 'Jitter', 0.08, 0, 0.4, 0.01, {
        min: 0.02,
        max: 0.2,
      }),
      numberParam('smoothing', 'Smoothing', 0.4, 0, 1, 0.01, {
        min: 0.1,
        max: 0.75,
      }),
    ],
  },
  {
    id: 'pixel-sort-heavy',
    name: 'Pixel Sort Heavy',
    category: 'pixel',
    tier: 'experimental',
    pipelinePhase: 'post',
    capabilityNotes: 'Approximates directional pixel sorting after masking.',
    experimentalBadge: experimentalBadge(
      'True long-run sorting is expensive in fragment shaders.',
      'Can be heavier and less predictable than Stable pixel layers.',
    ),
    params: [
      numberParam('threshold', 'Threshold', 0.55, 0, 1, 0.01, {
        min: 0.25,
        max: 0.8,
      }),
      numberParam('runLength', 'Run Length', 24, 2, 96, 1, {
        min: 8,
        max: 48,
        step: 1,
      }),
    ],
  },
  {
    id: 'feedback-advection',
    name: 'Feedback Advection',
    category: 'feedback',
    tier: 'experimental',
    pipelinePhase: 'post',
    capabilityNotes: 'Uses previous-frame feedback to advect the surface.',
    experimentalBadge: experimentalBadge(
      'Requires render targets and previous-frame state.',
      'Unsupported paths must fall back without blanking the Stable surface.',
    ),
    params: [
      numberParam('decay', 'Decay', 0.82, 0, 1, 0.01, {
        min: 0.55,
        max: 0.95,
      }),
      numberParam('advection', 'Advection', 0.2, 0, 0.8, 0.01, {
        min: 0.05,
        max: 0.45,
      }),
    ],
  },
]

const builtInMorphLayerDefinitions: MorphLayerDefinition[] = [
  ...stableMorphLayers,
  ...experimentalMorphLayers,
]

validateMorphLayerRegistry(builtInMorphLayerDefinitions)

export const morphLayerDefinitions: readonly MorphLayerDefinition[] =
  builtInMorphLayerDefinitions

export function getMorphLayerDefinitionById(definitionId: string) {
  return morphLayerDefinitions.find((definition) => definition.id === definitionId)
}

export function getMorphLayerDefinitionsByTier(tier: MorphLayerTier) {
  return morphLayerDefinitions.filter((definition) => definition.tier === tier)
}

export function validateMorphLayerDefinition(
  definition: MorphLayerDefinition,
) {
  if (!definition.id.trim()) {
    throw new Error('Morph Layer definition must include an id.')
  }

  if (!definition.name.trim()) {
    throw new Error(`Morph Layer "${definition.id}" must include a name.`)
  }

  if (!MORPH_LAYER_CATEGORIES.has(definition.category)) {
    throw new Error(
      `Morph Layer "${definition.id}" has invalid category "${definition.category}".`,
    )
  }

  if (!MORPH_LAYER_TIERS.has(definition.tier)) {
    throw new Error(
      `Morph Layer "${definition.id}" has invalid tier "${definition.tier}".`,
    )
  }

  if (!MORPH_LAYER_PIPELINE_PHASES.has(definition.pipelinePhase)) {
    throw new Error(
      `Morph Layer "${definition.id}" has invalid pipeline phase "${definition.pipelinePhase}".`,
    )
  }

  if (definition.tier === 'experimental') {
    if (
      definition.experimentalBadge?.label !== 'Experimental' ||
      !definition.experimentalBadge.reason.trim() ||
      !definition.experimentalBadge.riskNote.trim()
    ) {
      throw new Error(
        `Experimental Morph Layer "${definition.id}" must include badge metadata.`,
      )
    }
  }

  validateMorphParams(definition)
}

function validateMorphLayerRegistry(definitions: MorphLayerDefinition[]) {
  const ids = new Set<string>()

  for (const definition of definitions) {
    validateMorphLayerDefinition(definition)

    if (ids.has(definition.id)) {
      throw new Error(`Morph Layer registry contains duplicate id "${definition.id}".`)
    }

    ids.add(definition.id)
  }
}

function validateMorphParams(definition: MorphLayerDefinition) {
  const paramIds = new Set<string>()

  for (const param of definition.params) {
    if (paramIds.has(param.id)) {
      throw new Error(
        `Morph Layer "${definition.id}" contains duplicate param id "${param.id}".`,
      )
    }

    paramIds.add(param.id)

    if (!param.id.trim() || !param.label.trim()) {
      throw new Error(
        `Morph Layer "${definition.id}" contains a param missing id or label.`,
      )
    }

    switch (param.type) {
      case 'number':
        validateNumberParam(definition, param)
        break
      case 'boolean':
        break
      case 'select':
        validateSelectParam(definition, param)
        break
    }
  }
}

function validateNumberParam(
  definition: MorphLayerDefinition,
  param: Extract<MorphParamDefinition, { type: 'number' }>,
) {
  if (
    !Number.isFinite(param.default) ||
    !Number.isFinite(param.min) ||
    !Number.isFinite(param.max) ||
    !Number.isFinite(param.step) ||
    param.min > param.max ||
    param.step <= 0 ||
    param.default < param.min ||
    param.default > param.max
  ) {
    throw new Error(
      `Morph Layer "${definition.id}" param "${param.id}" has invalid number bounds or default.`,
    )
  }

  if (
    param.randomize &&
    (!Number.isFinite(param.randomize.min) ||
      !Number.isFinite(param.randomize.max) ||
      param.randomize.min > param.randomize.max ||
      param.randomize.min < param.min ||
      param.randomize.max > param.max ||
      (typeof param.randomize.step === 'number' && param.randomize.step <= 0))
  ) {
    throw new Error(
      `Morph Layer "${definition.id}" param "${param.id}" has invalid randomize bounds.`,
    )
  }
}

function validateSelectParam(
  definition: MorphLayerDefinition,
  param: Extract<MorphParamDefinition, { type: 'select' }>,
) {
  const optionIds = new Set<string>()

  if (param.options.length === 0) {
    throw new Error(
      `Morph Layer "${definition.id}" param "${param.id}" must define select options.`,
    )
  }

  for (const option of param.options) {
    if (optionIds.has(option.id)) {
      throw new Error(
        `Morph Layer "${definition.id}" param "${param.id}" contains duplicate select option "${option.id}".`,
      )
    }

    optionIds.add(option.id)
  }

  if (!optionIds.has(param.default)) {
    throw new Error(
      `Morph Layer "${definition.id}" param "${param.id}" has unknown select default "${param.default}".`,
    )
  }
}

function numberParam(
  id: string,
  label: string,
  defaultValue: number,
  min: number,
  max: number,
  step: number,
  randomize?: Extract<MorphParamDefinition, { type: 'number' }>['randomize'],
  unit?: string,
): Extract<MorphParamDefinition, { type: 'number' }> {
  return {
    type: 'number',
    id,
    label,
    default: defaultValue,
    min,
    max,
    step,
    randomize,
    unit,
  }
}

function selectParam(
  id: string,
  label: string,
  defaultValue: string,
  options: Array<[string, string]>,
): Extract<MorphParamDefinition, { type: 'select' }> {
  return {
    type: 'select',
    id,
    label,
    default: defaultValue,
    options: options.map(([optionId, optionLabel]) => ({
      id: optionId,
      label: optionLabel,
    })),
  }
}

function experimentalBadge(reason: string, riskNote: string) {
  return {
    label: 'Experimental',
    reason,
    riskNote,
  } as const
}
