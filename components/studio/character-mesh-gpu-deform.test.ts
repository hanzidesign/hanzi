import { MeshStandardMaterial, ShaderMaterial } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_CHARACTER_MESH_DEFORM } from './character-mesh-deform'
import {
  attachCharacterMeshGpuDeform,
  createCharacterMeshNoiseTexture,
  evaluateCharacterMeshGpuDeform,
} from './character-mesh-gpu-deform'

function deformWithGpuSettings() {
  return {
    ...DEFAULT_CHARACTER_MESH_DEFORM,
    wave: {
      ...DEFAULT_CHARACTER_MESH_DEFORM.wave,
      enabled: true,
      amplitude: 0.6,
      speed: 4,
      phase: 90,
      direction: 'radial' as const,
      waveform: 'triangle' as const,
    },
    surfaceNoise: {
      ...DEFAULT_CHARACTER_MESH_DEFORM.surfaceNoise,
      enabled: true,
      amount: 1.2,
      speed: 5,
      scale: 7,
      direction: 'normal' as const,
    },
  }
}

describe('character mesh GPU deform', () => {
  it('creates deterministic tileable grayscale noise textures', () => {
    const first = createCharacterMeshNoiseTexture(DEFAULT_CHARACTER_MESH_DEFORM.surfaceNoise)
    const second = createCharacterMeshNoiseTexture(DEFAULT_CHARACTER_MESH_DEFORM.surfaceNoise)
    const firstData = first.image.data as Uint8Array
    const secondData = second.image.data as Uint8Array

    expect(Array.from(firstData)).toEqual(Array.from(secondData))
    expect(first.wrapS).toBe(second.wrapS)
    expect(first.wrapT).toBe(second.wrapT)
    expect(firstData[0]).toBe(firstData[1])
    expect(firstData[1]).toBe(firstData[2])
    first.dispose()
    second.dispose()
  })

  it('updates every live Wave and Noise uniform without replacing the material', () => {
    const material = new ShaderMaterial({
      vertexShader: 'void main() { gl_Position = vec4(position, 1.0); }',
      fragmentShader: 'void main() { gl_FragColor = vec4(1.0); }',
    })
    const originalVertexShader = material.vertexShader
    const binding = attachCharacterMeshGpuDeform(material, 'custom')
    const settings = deformWithGpuSettings()

    binding.update(settings, 3)
    expect(binding.uniforms.uCharacterDeformTime.value).toBe(3)
    expect(binding.uniforms.uCharacterWaveEnabled.value).toBe(1)
    expect(binding.uniforms.uCharacterWaveAmplitude.value).toBe(0.6)
    expect(binding.uniforms.uCharacterWaveSpeed.value).toBe(4)
    expect(binding.uniforms.uCharacterWaveFrequency.value).toBe(3)
    expect(binding.uniforms.uCharacterWavePhase.value).toBe(90)
    expect(binding.uniforms.uCharacterWaveDirection.value).toBe(3)
    expect(binding.uniforms.uCharacterWaveform.value).toBe(1)
    expect(binding.uniforms.uCharacterWaveOffset.value).toBe(0)
    expect(binding.uniforms.uCharacterWaveDecay.value).toBe(0)
    expect(binding.uniforms.uCharacterNoiseEnabled.value).toBe(1)
    expect(binding.uniforms.uCharacterNoiseAmount.value).toBe(1.2)
    expect(binding.uniforms.uCharacterNoiseSpeed.value).toBe(5)
    expect(binding.uniforms.uCharacterNoiseScale.value).toBe(7)
    expect(binding.uniforms.uCharacterNoiseDirection.value).toBe(2)
    expect(binding.uniforms.uCharacterNoiseOffsetX.value).toBe(0)
    expect(binding.uniforms.uCharacterNoiseOffsetY.value).toBe(0)
    expect(material.vertexShader).toContain('characterMeshGpuDeformedPosition(position)')

    binding.update(settings, 9)
    expect(binding.uniforms.uCharacterDeformTime.value).toBe(9)
    expect(material).toBe(material)
    binding.dispose()
    expect(material.vertexShader).toBe(originalVertexShader)
    expect(material.uniforms).not.toHaveProperty('uCharacterDeformTime')
    material.dispose()
  })

  it('keeps Wave time and all three Noise directions numerically explicit', () => {
    const settings = deformWithGpuSettings()
    const sample = {
      position: [0, 0, 0] as [number, number, number],
      modelPosition: [1, 0, 0] as [number, number, number],
      stableNormal: [0, 1, 0] as [number, number, number],
      noiseValue: 0.5,
    }
    const waveAtZero = evaluateCharacterMeshGpuDeform(sample, {
      ...settings,
      surfaceNoise: { ...settings.surfaceNoise, enabled: false },
    }, 0)
    const waveLater = evaluateCharacterMeshGpuDeform(sample, {
      ...settings,
      surfaceNoise: { ...settings.surfaceNoise, enabled: false },
    }, 0.5)
    expect(waveLater).not.toEqual(waveAtZero)

    const noiseOnly = {
      ...settings,
      wave: { ...settings.wave, enabled: false },
    }
    expect(evaluateCharacterMeshGpuDeform(sample, {
      ...noiseOnly,
      surfaceNoise: { ...noiseOnly.surfaceNoise, direction: 'depth' },
    }, 0)).toEqual([0, 0, 0.06])
    expect(evaluateCharacterMeshGpuDeform(sample, {
      ...noiseOnly,
      surfaceNoise: { ...noiseOnly.surfaceNoise, direction: 'radial' },
    }, 0)).toEqual([0.06, 0, 0])
    expect(evaluateCharacterMeshGpuDeform(sample, {
      ...noiseOnly,
      surfaceNoise: { ...noiseOnly.surfaceNoise, direction: 'normal' },
    }, 0)).toEqual([0, 0.06, 0])

    const combined = evaluateCharacterMeshGpuDeform(sample, settings, 0.5)
    expect(combined[1]).toBeCloseTo(0.06)
    expect(combined[2]).toBeCloseTo(waveLater[2])
  })

  it('replaces and disposes the previous noise texture only when its key changes', () => {
    const material = new ShaderMaterial({
      vertexShader: 'void main() { gl_Position = vec4(position, 1.0); }',
      fragmentShader: 'void main() { gl_FragColor = vec4(1.0); }',
    })
    const binding = attachCharacterMeshGpuDeform(material, 'custom')
    const firstTexture = binding.uniforms.uCharacterNoiseTexture.value
    const dispose = vi.spyOn(firstTexture, 'dispose')

    binding.update(deformWithGpuSettings(), 0)
    expect(dispose).not.toHaveBeenCalled()
    binding.update({
      ...deformWithGpuSettings(),
      surfaceNoise: { ...deformWithGpuSettings().surfaceNoise, seed: 12 },
    }, 0)
    expect(dispose).toHaveBeenCalledOnce()
    expect(binding.uniforms.uCharacterNoiseTexture.value).not.toBe(firstTexture)
    binding.dispose()
    material.dispose()
  })

  it('chains standard material compile and cache callbacks while injecting after begin_vertex', () => {
    const material = new MeshStandardMaterial()
    const previousCompile = vi.fn()
    material.onBeforeCompile = previousCompile
    material.customProgramCacheKey = () => 'existing-key'
    const binding = attachCharacterMeshGpuDeform(material, 'standard')
    const shader = {
      vertexShader: 'void main() {\n#include <begin_vertex>\ngl_Position = vec4(transformed, 1.0);\n}',
      uniforms: {},
    }

    material.onBeforeCompile(shader as never, {} as never)
    expect(previousCompile).toHaveBeenCalledOnce()
    expect(shader.vertexShader).toContain('#include <begin_vertex>\ntransformed = characterMeshGpuDeformedPosition(transformed);')
    expect(shader.uniforms).toHaveProperty('uCharacterDeformTime')
    expect(material.customProgramCacheKey()).toBe('existing-key|character-mesh-gpu-deform-v1')
    binding.dispose()
    expect(material.onBeforeCompile).toBe(previousCompile)
    expect(material.customProgramCacheKey()).toBe('existing-key')
    material.dispose()
  })

  it('fails loudly when a shader injection anchor is missing', () => {
    const custom = new ShaderMaterial({ vertexShader: 'void nope() {}' })
    expect(() => attachCharacterMeshGpuDeform(custom, 'custom')).toThrow(/main anchor is missing/i)

    const standard = new MeshStandardMaterial()
    const binding = attachCharacterMeshGpuDeform(standard, 'standard')
    expect(() => standard.onBeforeCompile({ vertexShader: 'void main() {}', uniforms: {} } as never, {} as never))
      .toThrow(/standard shader anchor is missing/i)
    binding.dispose()
    custom.dispose()
    standard.dispose()
  })
})
