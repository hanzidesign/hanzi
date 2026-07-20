import {
  DataTexture,
  LinearFilter,
  RGBAFormat,
  RepeatWrapping,
  ShaderMaterial,
  UnsignedByteType,
  type IUniform,
  type Material,
} from 'three'

import {
  DEFAULT_CHARACTER_MESH_DEFORM,
  type CharacterMeshDeformSettings,
} from '@/components/studio/character-mesh-deform'
import { sampleCharacterMeshSurfaceNoise } from '@/components/studio/character-mesh-geometry'

const NOISE_TEXTURE_SIZE = 64
const GPU_DEFORM_CACHE_KEY = 'character-mesh-gpu-deform-v1'

export type CharacterMeshGpuDeformUniforms = Record<string, IUniform> & {
  uCharacterDeformTime: IUniform<number>
  uCharacterWaveEnabled: IUniform<number>
  uCharacterWaveAmplitude: IUniform<number>
  uCharacterWaveSpeed: IUniform<number>
  uCharacterWaveFrequency: IUniform<number>
  uCharacterWavePhase: IUniform<number>
  uCharacterWaveDirection: IUniform<number>
  uCharacterWaveform: IUniform<number>
  uCharacterWaveOffset: IUniform<number>
  uCharacterWaveDecay: IUniform<number>
  uCharacterNoiseEnabled: IUniform<number>
  uCharacterNoiseAmount: IUniform<number>
  uCharacterNoiseSpeed: IUniform<number>
  uCharacterNoiseScale: IUniform<number>
  uCharacterNoiseDirection: IUniform<number>
  uCharacterNoiseOffsetX: IUniform<number>
  uCharacterNoiseOffsetY: IUniform<number>
  uCharacterNoiseTexture: IUniform<DataTexture>
}

export type CharacterMeshGpuDeformBinding = {
  uniforms: CharacterMeshGpuDeformUniforms
  update: (deform: CharacterMeshDeformSettings, effectiveTime: number) => void
  dispose: () => void
}

export type CharacterMeshGpuDeformSample = {
  position: [number, number, number]
  modelPosition: [number, number, number]
  stableNormal: [number, number, number]
  noiseValue: number
}

type CompilableMaterial = Material & {
  onBeforeCompile: (shader: { vertexShader: string; uniforms: Record<string, IUniform> }, renderer: unknown) => void
  customProgramCacheKey: () => string
}

const GPU_DEFORM_GLSL = `
attribute vec3 characterModelPosition;
attribute vec3 characterStableNormal;
uniform float uCharacterDeformTime;
uniform float uCharacterWaveEnabled;
uniform float uCharacterWaveAmplitude;
uniform float uCharacterWaveSpeed;
uniform float uCharacterWaveFrequency;
uniform float uCharacterWavePhase;
uniform float uCharacterWaveDirection;
uniform float uCharacterWaveform;
uniform float uCharacterWaveOffset;
uniform float uCharacterWaveDecay;
uniform float uCharacterNoiseEnabled;
uniform float uCharacterNoiseAmount;
uniform float uCharacterNoiseSpeed;
uniform float uCharacterNoiseScale;
uniform float uCharacterNoiseDirection;
uniform float uCharacterNoiseOffsetX;
uniform float uCharacterNoiseOffsetY;
uniform sampler2D uCharacterNoiseTexture;

float characterMeshSmoothstep01(float value) {
  float t = clamp(value, 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

vec3 characterMeshGpuDeformedPosition(vec3 sourcePosition) {
  vec3 result = sourcePosition;
  if (uCharacterWaveEnabled > 0.5) {
    float coordinate = characterModelPosition.y;
    if (uCharacterWaveDirection < 0.5) {
      coordinate = characterModelPosition.x;
    } else if (uCharacterWaveDirection > 1.5 && uCharacterWaveDirection < 2.5) {
      coordinate = (characterModelPosition.x + characterModelPosition.y) * 0.70710678;
    } else if (uCharacterWaveDirection > 2.5) {
      coordinate = length(characterModelPosition.xy);
    }
    float theta = 6.28318531 * uCharacterWaveFrequency * (coordinate + uCharacterWaveOffset)
      + radians(uCharacterWavePhase) + uCharacterDeformTime * uCharacterWaveSpeed;
    float sineWave = sin(theta);
    float wave = sineWave;
    if (uCharacterWaveform > 0.5 && uCharacterWaveform < 1.5) {
      wave = 0.63661977 * asin(sineWave);
    } else if (uCharacterWaveform > 1.5) {
      wave = sineWave >= 0.0 ? 1.0 : -1.0;
    }
    float edge = clamp(abs(coordinate), 0.0, 1.0);
    float envelope = (1.0 - uCharacterWaveDecay)
      + uCharacterWaveDecay * (1.0 - characterMeshSmoothstep01(edge));
    result.z += uCharacterWaveAmplitude * 0.16 * wave * envelope;
  }

  if (uCharacterNoiseEnabled > 0.5) {
    vec2 noiseCoordinate = (characterModelPosition.xy
      + vec2(uCharacterNoiseOffsetX, uCharacterNoiseOffsetY)) * uCharacterNoiseScale;
    noiseCoordinate.x += uCharacterDeformTime * uCharacterNoiseSpeed;
    float noiseValue = texture2D(uCharacterNoiseTexture, noiseCoordinate / 8.0).r * 2.0 - 1.0;
    float magnitude = uCharacterNoiseAmount * 0.1 * noiseValue;
    if (uCharacterNoiseDirection < 0.5) {
      result.z += magnitude;
    } else if (uCharacterNoiseDirection < 1.5) {
      float radialLength = length(characterModelPosition.xy);
      if (radialLength > 0.000001) {
        result.xy += characterModelPosition.xy / radialLength * magnitude;
      }
    } else {
      result += characterStableNormal * magnitude;
    }
  }
  return result;
}

`

export function evaluateCharacterMeshGpuDeform(
  sample: CharacterMeshGpuDeformSample,
  deform: CharacterMeshDeformSettings,
  effectiveTime: number,
): [number, number, number] {
  const result: [number, number, number] = [...sample.position]
  const { wave, surfaceNoise: noise } = deform

  if (wave.enabled && wave.amplitude !== 0) {
    const [u, v] = sample.modelPosition
    const coordinate = wave.direction === 'x'
      ? u
      : wave.direction === 'y'
        ? v
        : wave.direction === 'diagonal'
          ? (u + v) / Math.sqrt(2)
          : Math.hypot(u, v)
    const theta = Math.PI * 2 * wave.frequency * (coordinate + wave.offset)
      + wave.phase * Math.PI / 180
      + effectiveTime * wave.speed
    const sine = Math.sin(theta)
    const value = wave.waveform === 'triangle'
      ? (2 / Math.PI) * Math.asin(sine)
      : wave.waveform === 'square'
        ? (sine >= 0 ? 1 : -1)
        : sine
    const edge = Math.min(1, Math.abs(coordinate))
    const envelope = (1 - wave.decay) + wave.decay * (1 - smoothstep01(edge))
    result[2] += wave.amplitude * 0.16 * value * envelope
  }

  if (noise.enabled && noise.amount !== 0) {
    const magnitude = noise.amount * 0.1 * sample.noiseValue
    if (noise.direction === 'depth') {
      result[2] += magnitude
    } else if (noise.direction === 'radial') {
      const [u, v] = sample.modelPosition
      const length = Math.hypot(u, v)
      if (length > Number.EPSILON) {
        result[0] += u / length * magnitude
        result[1] += v / length * magnitude
      }
    } else {
      result[0] += sample.stableNormal[0] * magnitude
      result[1] += sample.stableNormal[1] * magnitude
      result[2] += sample.stableNormal[2] * magnitude
    }
  }

  return result
}

export function attachCharacterMeshGpuDeform(
  material: Material,
  mode: 'standard' | 'custom',
): CharacterMeshGpuDeformBinding {
  const texture = createCharacterMeshNoiseTexture(DEFAULT_CHARACTER_MESH_DEFORM.surfaceNoise)
  let textureKey = getNoiseTextureKey(DEFAULT_CHARACTER_MESH_DEFORM.surfaceNoise)
  let activeTexture = texture
  let disposed = false
  const uniforms = createUniforms(texture)
  let restoreMaterial = () => {}

  if (mode === 'custom') {
    if (!(material instanceof ShaderMaterial)) {
      throw new Error('Character GPU deform custom adapter requires ShaderMaterial.')
    }
    const originalVertexShader = material.vertexShader
    const previousUniforms = new Map(
      Object.keys(uniforms).map((name) => [name, material.uniforms[name]]),
    )
    const injectedVertexShader = injectCustomVertexShader(originalVertexShader)
    material.vertexShader = injectedVertexShader
    Object.assign(material.uniforms, uniforms)
    const restoreCacheKey = appendProgramCacheKey(material)
    restoreMaterial = () => {
      if (material.vertexShader === injectedVertexShader) {
        material.vertexShader = originalVertexShader
      }
      for (const name of Object.keys(uniforms)) {
        if (material.uniforms[name] !== uniforms[name]) continue
        const previous = previousUniforms.get(name)
        if (previous) {
          material.uniforms[name] = previous
        } else {
          delete material.uniforms[name]
        }
      }
      restoreCacheKey()
      material.needsUpdate = true
    }
    material.needsUpdate = true
  } else {
    const compilable = material as CompilableMaterial
    const previousCompile = compilable.onBeforeCompile
    const gpuCompile = function onBeforeCompile(this: CompilableMaterial, shader: { vertexShader: string; uniforms: Record<string, IUniform> }, renderer: unknown) {
      previousCompile.call(this, shader, renderer)
      shader.vertexShader = injectStandardVertexShader(shader.vertexShader)
      Object.assign(shader.uniforms, uniforms)
    }
    compilable.onBeforeCompile = gpuCompile
    const restoreCacheKey = appendProgramCacheKey(compilable)
    restoreMaterial = () => {
      if (compilable.onBeforeCompile === gpuCompile) {
        compilable.onBeforeCompile = previousCompile
      }
      restoreCacheKey()
      material.needsUpdate = true
    }
    material.needsUpdate = true
  }

  return {
    uniforms,
    update(deform, effectiveTime) {
      if (disposed) return
      const nextTextureKey = getNoiseTextureKey(deform.surfaceNoise)
      if (nextTextureKey !== textureKey) {
        const nextTexture = createCharacterMeshNoiseTexture(deform.surfaceNoise)
        activeTexture.dispose()
        activeTexture = nextTexture
        textureKey = nextTextureKey
        uniforms.uCharacterNoiseTexture.value = nextTexture
      }
      applyCharacterMeshGpuDeformUniforms(uniforms, deform, effectiveTime)
    },
    dispose() {
      if (disposed) return
      disposed = true
      restoreMaterial()
      activeTexture.dispose()
    },
  }
}

export function applyCharacterMeshGpuDeformUniforms(
  uniforms: CharacterMeshGpuDeformUniforms,
  deform: CharacterMeshDeformSettings,
  effectiveTime: number,
) {
  const wave = deform.wave
  const noise = deform.surfaceNoise
  uniforms.uCharacterDeformTime.value = Number.isFinite(effectiveTime) ? effectiveTime : 0
  uniforms.uCharacterWaveEnabled.value = wave.enabled && wave.amplitude !== 0 ? 1 : 0
  uniforms.uCharacterWaveAmplitude.value = wave.amplitude
  uniforms.uCharacterWaveSpeed.value = wave.speed
  uniforms.uCharacterWaveFrequency.value = wave.frequency
  uniforms.uCharacterWavePhase.value = wave.phase
  uniforms.uCharacterWaveDirection.value = ['x', 'y', 'diagonal', 'radial'].indexOf(wave.direction)
  uniforms.uCharacterWaveform.value = ['sine', 'triangle', 'square'].indexOf(wave.waveform)
  uniforms.uCharacterWaveOffset.value = wave.offset
  uniforms.uCharacterWaveDecay.value = wave.decay
  uniforms.uCharacterNoiseEnabled.value = noise.enabled && noise.amount !== 0 ? 1 : 0
  uniforms.uCharacterNoiseAmount.value = noise.amount
  uniforms.uCharacterNoiseSpeed.value = noise.speed
  uniforms.uCharacterNoiseScale.value = noise.scale
  uniforms.uCharacterNoiseDirection.value = ['depth', 'radial', 'normal'].indexOf(noise.direction)
  uniforms.uCharacterNoiseOffsetX.value = noise.offsetX
  uniforms.uCharacterNoiseOffsetY.value = noise.offsetY
}

export function createCharacterMeshNoiseTexture(
  noise: CharacterMeshDeformSettings['surfaceNoise'],
) {
  const data = new Uint8Array(NOISE_TEXTURE_SIZE * NOISE_TEXTURE_SIZE * 4)
  for (let y = 0; y < NOISE_TEXTURE_SIZE; y += 1) {
    for (let x = 0; x < NOISE_TEXTURE_SIZE; x += 1) {
      const value = sampleCharacterMeshSurfaceNoise(
        x / NOISE_TEXTURE_SIZE * 8,
        y / NOISE_TEXTURE_SIZE * 8,
        noise.seed,
        noise.detail,
        noise.roughness,
        noise.contrast,
      )
      const byte = Math.round((value * 0.5 + 0.5) * 255)
      const offset = (y * NOISE_TEXTURE_SIZE + x) * 4
      data[offset] = byte
      data[offset + 1] = byte
      data[offset + 2] = byte
      data[offset + 3] = 255
    }
  }
  const texture = new DataTexture(data, NOISE_TEXTURE_SIZE, NOISE_TEXTURE_SIZE, RGBAFormat, UnsignedByteType)
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.magFilter = LinearFilter
  texture.minFilter = LinearFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return texture
}

function createUniforms(texture: DataTexture): CharacterMeshGpuDeformUniforms {
  return {
    uCharacterDeformTime: { value: 0 },
    uCharacterWaveEnabled: { value: 0 },
    uCharacterWaveAmplitude: { value: 0 },
    uCharacterWaveSpeed: { value: 2 },
    uCharacterWaveFrequency: { value: 3 },
    uCharacterWavePhase: { value: 0 },
    uCharacterWaveDirection: { value: 1 },
    uCharacterWaveform: { value: 0 },
    uCharacterWaveOffset: { value: 0 },
    uCharacterWaveDecay: { value: 0 },
    uCharacterNoiseEnabled: { value: 0 },
    uCharacterNoiseAmount: { value: 0 },
    uCharacterNoiseSpeed: { value: 2 },
    uCharacterNoiseScale: { value: 10 },
    uCharacterNoiseDirection: { value: 0 },
    uCharacterNoiseOffsetX: { value: 0 },
    uCharacterNoiseOffsetY: { value: 0 },
    uCharacterNoiseTexture: { value: texture },
  }
}

function getNoiseTextureKey(noise: CharacterMeshDeformSettings['surfaceNoise']) {
  return `${noise.seed}:${noise.detail}:${noise.roughness}:${noise.contrast}`
}

function injectStandardVertexShader(source: string) {
  const anchor = '#include <begin_vertex>'
  if (!source.includes(anchor)) {
    throw new Error('Character GPU deform standard shader anchor is missing.')
  }
  return `${GPU_DEFORM_GLSL}\n${source.replace(anchor, `${anchor}\ntransformed = characterMeshGpuDeformedPosition(transformed);`)}`
}

function injectCustomVertexShader(source: string) {
  const mainAnchor = 'void main() {'
  const mainIndex = source.indexOf(mainAnchor)
  if (mainIndex < 0) {
    throw new Error('Character GPU deform custom shader main anchor is missing.')
  }
  const bodyStart = mainIndex + mainAnchor.length
  const prefix = source.slice(0, bodyStart)
  const body = source.slice(bodyStart)
  if (!/\bposition\b/.test(body)) {
    throw new Error('Character GPU deform custom shader position anchor is missing.')
  }
  const replacedBody = body.replace(/\bposition\b/g, 'characterMeshGpuPosition')
  return `${GPU_DEFORM_GLSL}\n${prefix}\n  vec3 characterMeshGpuPosition = characterMeshGpuDeformedPosition(position);${replacedBody}`
}

function appendProgramCacheKey(material: Material & { customProgramCacheKey: () => string }) {
  const previousCacheKey = material.customProgramCacheKey
  const gpuCacheKey = () => `${previousCacheKey.call(material)}|${GPU_DEFORM_CACHE_KEY}`
  material.customProgramCacheKey = gpuCacheKey
  return () => {
    if (material.customProgramCacheKey === gpuCacheKey) {
      material.customProgramCacheKey = previousCacheKey
    }
  }
}

function smoothstep01(value: number) {
  const t = Math.min(1, Math.max(0, value))
  return t * t * (3 - 2 * t)
}
