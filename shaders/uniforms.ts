import { Vector3 } from 'three'

import type {
  SelectShaderParam,
  ShaderParamValue,
  ShaderParamValues,
  ShaderPreset,
  ShaderUniformValue,
  ShaderUniforms,
} from './types'
import { isHexColor, validateShaderPreset } from './validation'

export function hexToVector3(hex: string) {
  if (!isHexColor(hex)) {
    throw new Error(`Expected a six-digit hex color, received "${hex}".`)
  }

  const value = Number.parseInt(hex.slice(1), 16)
  const red = (value >> 16) & 255
  const green = (value >> 8) & 255
  const blue = value & 255

  return new Vector3(red / 255, green / 255, blue / 255)
}

export function createDefaultParams(preset: ShaderPreset): ShaderParamValues {
  const defaults: ShaderParamValues = {}

  for (const param of preset.params) {
    defaults[param.id] = param.default
  }

  return defaults
}

export function createUniformsFromParams(
  preset: ShaderPreset,
  params: Partial<Record<string, unknown>>,
): ShaderUniforms {
  validateShaderPreset(preset)

  const uniforms: ShaderUniforms = {}

  for (const param of preset.params) {
    uniforms[param.uniformName] = {
      value: createUniformValue(param, params[param.id]),
    }
  }

  return uniforms
}

export function sanitizeParamsForPreset(
  preset: ShaderPreset,
  params: Partial<Record<string, unknown>>,
): ShaderParamValues {
  const sanitizedParams: ShaderParamValues = {}

  for (const param of preset.params) {
    sanitizedParams[param.id] = sanitizeParamValue(param, params[param.id])
  }

  return sanitizedParams
}

function sanitizeParamValue(
  param: ShaderPreset['params'][number],
  value: unknown,
): ShaderParamValue {
  switch (param.type) {
    case 'number':
      return sanitizeNumberParam(param, value)
    case 'color':
      return typeof value === 'string' && isHexColor(value) ? value : param.default
    case 'boolean':
      return typeof value === 'boolean' ? value : param.default
    case 'select':
      return getSanitizedSelectOption(param, value).id
  }
}

function createUniformValue(
  param: ShaderPreset['params'][number],
  value: unknown,
): ShaderUniformValue {
  switch (param.type) {
    case 'number':
      return sanitizeNumberParam(param, value)
    case 'color':
      return hexToVector3(
        typeof value === 'string' && isHexColor(value) ? value : param.default,
      )
    case 'boolean':
      return value === true ? 1 : 0
    case 'select':
      return getSanitizedSelectOption(param, value).value
  }
}

function sanitizeNumberParam(
  param: Extract<ShaderPreset['params'][number], { type: 'number' }>,
  value: unknown,
) {
  return typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= param.min &&
    value <= param.max
    ? value
    : param.default
}

function getSanitizedSelectOption(param: SelectShaderParam, value: unknown) {
  if (typeof value === 'string') {
    const option = findSelectOption(param, value)

    if (option) {
      return option
    }
  }

  const defaultOption = findSelectOption(param, param.default)

  if (!defaultOption) {
    throw new Error(
      `Shader param "${param.id}" has unknown select default "${param.default}".`,
    )
  }

  return defaultOption
}

function findSelectOption(param: SelectShaderParam, selectedId: string) {
  const option = param.options.find(({ id }) => id === selectedId)

  return option
}
