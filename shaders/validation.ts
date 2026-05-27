import type { ShaderPreset } from './types'

const HEX_COLOR_PATTERN = /^#[\da-f]{6}$/i

export const RESERVED_UNIFORMS = [
  'u_time',
  'u_mouse',
  'u_resolution',
  'u_displacementMap',
  'u_displacementMapTransform',
  'u_displacementStrength',
  'u_displacementBias',
  'u_boundsMin',
  'u_boundsMax',
] as const

export const RESERVED_UNIFORM_NAMES = new Set<string>(RESERVED_UNIFORMS)

export function isHexColor(value: string) {
  return HEX_COLOR_PATTERN.test(value)
}

export function validateShaderPreset(preset: ShaderPreset) {
  const paramIds = new Set<string>()
  const uniformNames = new Set<string>()

  for (const param of preset.params) {
    if (paramIds.has(param.id)) {
      throw new Error(
        `Shader preset "${preset.id}" contains duplicate param id "${param.id}".`,
      )
    }

    if (uniformNames.has(param.uniformName)) {
      throw new Error(
        `Shader preset "${preset.id}" contains duplicate uniform "${param.uniformName}".`,
      )
    }

    paramIds.add(param.id)
    uniformNames.add(param.uniformName)

    if (RESERVED_UNIFORM_NAMES.has(param.uniformName)) {
      throw new Error(
        `Shader preset "${preset.id}" param "${param.id}" uses reserved uniform "${param.uniformName}".`,
      )
    }

    switch (param.type) {
      case 'number':
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
            `Shader preset "${preset.id}" param "${param.id}" has invalid number bounds or default.`,
          )
        }
        break
      case 'color':
        if (!isHexColor(param.default)) {
          throw new Error(
            `Shader preset "${preset.id}" param "${param.id}" has invalid color default "${param.default}".`,
          )
        }
        break
      case 'boolean':
        break
      case 'select': {
        const optionIds = new Set<string>()

        if (param.options.length === 0) {
          throw new Error(
            `Shader preset "${preset.id}" param "${param.id}" must define select options.`,
          )
        }

        for (const option of param.options) {
          if (optionIds.has(option.id)) {
            throw new Error(
              `Shader preset "${preset.id}" param "${param.id}" contains duplicate select option "${option.id}".`,
            )
          }

          optionIds.add(option.id)
        }

        if (!optionIds.has(param.default)) {
          throw new Error(
            `Shader preset "${preset.id}" param "${param.id}" has unknown select default "${param.default}".`,
          )
        }
        break
      }
    }
  }
}
