import type { IUniform, Texture, Vector2, Vector3, Vector4 } from 'three'

export type ShaderPreset = {
  id: string
  name: string
  category: string
  fragmentShader: string
  vertexShader?: string
  shaderPath: string
  usesDisplacementMap?: boolean
  params: ShaderParam[]
}

type ShaderParamBase = {
  id: string
  uniformName: string
  label: string
}

export type NumberShaderParam = ShaderParamBase & {
  type: 'number'
  default: number
  min: number
  max: number
  step: number
  unit?: string
}

export type ColorShaderParam = ShaderParamBase & {
  type: 'color'
  default: string
}

export type BooleanShaderParam = ShaderParamBase & {
  type: 'boolean'
  default: boolean
}

export type SelectShaderParam = ShaderParamBase & {
  type: 'select'
  default: string
  options: Array<{
    id: string
    label: string
    value: number
  }>
}

export type ShaderParam =
  | NumberShaderParam
  | ColorShaderParam
  | BooleanShaderParam
  | SelectShaderParam

export type ShaderParamValue = number | string | boolean

export type ShaderParamValues = Record<string, ShaderParamValue>

export type ShaderUniformValue = number | Texture | Vector2 | Vector3 | Vector4

export type ShaderUniforms = Record<string, IUniform<ShaderUniformValue>>
