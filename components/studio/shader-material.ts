import {
  DataTexture,
  DoubleSide,
  RGBAFormat,
  ShaderMaterial,
  UnsignedByteType,
  Vector2,
  Vector3,
  Vector4,
  type IUniform,
  type Texture,
} from 'three'
import { defaultVertexShader, getDefaultShaderPreset, getShaderPresetById } from '@/shaders/registry'
import type { ShaderParamValues, ShaderPreset, ShaderUniformValue, ShaderUniforms } from '@/shaders/types'
import { createUniformsFromParams } from '@/shaders/uniforms'

type ShaderMaterialUniformOptions = {
  preset: ShaderPreset
  params: ShaderParamValues
  resolution?: Vector2
  mouse?: Vector2
  boundsMin?: Vector3
  boundsMax?: Vector3
  displacementMap?: Texture
  displacementMapTransform?: Vector4
  displacementStrength?: number
  displacementBias?: number
}

const DEFAULT_DISPLACEMENT_MAP_TRANSFORM = new Vector4(1, 1, 0, 0)

export function resolveShaderPresetForCanvas(presetId: string) {
  return getShaderPresetById(presetId) ?? getDefaultShaderPreset()
}

export function createShaderMaterialUniforms({
  preset,
  params,
  resolution = new Vector2(1, 1),
  mouse = new Vector2(0, 0),
  boundsMin = new Vector3(-1, -1, -0.5),
  boundsMax = new Vector3(1, 1, 0.5),
  displacementMap = getNeutralDisplacementTexture(),
  displacementMapTransform = DEFAULT_DISPLACEMENT_MAP_TRANSFORM,
  displacementStrength = 0,
  displacementBias = 0,
}: ShaderMaterialUniformOptions): ShaderUniforms {
  return {
    u_time: { value: 0 },
    u_mouse: { value: mouse.clone() },
    u_resolution: { value: resolution.clone() },
    u_displacementMap: { value: displacementMap },
    u_displacementMapTransform: { value: displacementMapTransform.clone() },
    u_displacementStrength: { value: displacementStrength },
    u_displacementBias: { value: displacementBias },
    u_boundsMin: { value: boundsMin.clone() },
    u_boundsMax: { value: boundsMax.clone() },
    ...createUniformsFromParams(preset, params),
  }
}

export function createShaderMaterial({
  preset,
  params,
  resolution,
  mouse,
  boundsMin,
  boundsMax,
  displacementMap,
  displacementMapTransform,
  displacementStrength,
  displacementBias,
}: ShaderMaterialUniformOptions) {
  return new ShaderMaterial({
    vertexShader: preset.vertexShader ?? defaultVertexShader,
    fragmentShader: preset.fragmentShader,
    side: DoubleSide,
    uniforms: createShaderMaterialUniforms({
      preset,
      params,
      resolution,
      mouse,
      boundsMin,
      boundsMax,
      displacementMap,
      displacementMapTransform,
      displacementStrength,
      displacementBias,
    }) as Record<string, IUniform<ShaderUniformValue>>,
  })
}

let neutralDisplacementTexture: DataTexture | null = null

function getNeutralDisplacementTexture() {
  if (!neutralDisplacementTexture) {
    neutralDisplacementTexture = new DataTexture(
      new Uint8Array([128, 128, 128, 255]),
      1,
      1,
      RGBAFormat,
      UnsignedByteType,
    )
    neutralDisplacementTexture.needsUpdate = true
  }

  return neutralDisplacementTexture
}
