import type {
  MorphLayerDefinition,
  MorphParamDefinition,
  MorphParamValue,
  MorphParamValues,
} from './types'

export function createDefaultMorphParams(
  definition: MorphLayerDefinition,
): MorphParamValues {
  const defaults: MorphParamValues = {}

  for (const param of definition.params) {
    defaults[param.id] = param.default
  }

  return defaults
}

export function sanitizeMorphParams(
  definition: MorphLayerDefinition,
  params: Partial<Record<string, unknown>>,
): MorphParamValues {
  const sanitizedParams: MorphParamValues = {}

  for (const param of definition.params) {
    sanitizedParams[param.id] = sanitizeMorphParamValue(param, params[param.id])
  }

  return sanitizedParams
}

function sanitizeMorphParamValue(
  param: MorphParamDefinition,
  value: unknown,
): MorphParamValue {
  switch (param.type) {
    case 'number':
      return typeof value === 'number' &&
        Number.isFinite(value) &&
        value >= param.min &&
        value <= param.max
        ? value
        : param.default
    case 'boolean':
      return typeof value === 'boolean' ? value : param.default
    case 'select':
      return typeof value === 'string' &&
        param.options.some((option) => option.id === value)
        ? value
        : param.default
  }
}
