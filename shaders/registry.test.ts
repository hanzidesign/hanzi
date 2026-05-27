import { describe, expect, it } from 'vitest'

import {
  defaultVertexShader,
  getDefaultShaderPreset,
  getShaderPresetById,
  shaderPresets,
} from './registry'
import { createDefaultParams, createUniformsFromParams } from './uniforms'
import { RESERVED_UNIFORM_NAMES, validateShaderPreset } from './validation'

describe('shader preset registry', () => {
  it('registers the three Phase 1 built-in shader presets', () => {
    expect(shaderPresets.map((preset) => preset.id)).toEqual([
      'flowing-noise',
      'kaleidoscope-noise',
      'grid-pulse',
    ])
  })

  it('validates every built-in preset and keeps fragment shaders in real GLSL files', () => {
    for (const preset of shaderPresets) {
      expect(() => validateShaderPreset(preset)).not.toThrow()
      expect(preset.fragmentShader.trim()).toContain('void main')
      expect(preset.shaderPath).toBe(
        `shaders/presets/${preset.id}/fragment.glsl`,
      )
      expect(preset.vertexShader).toBeUndefined()
      expect(preset.usesDisplacementMap).toBe(false)
      expect(preset.fragmentShader).not.toContain('u_displacementMap')
    }
  })

  it('keeps preset ids unique', () => {
    const ids = shaderPresets.map((preset) => preset.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('uses display-ready free-string categories', () => {
    for (const preset of shaderPresets) {
      expect(preset.category).toBe(preset.category.trim())
      expect(preset.category).not.toContain('-')
      expect(preset.category.length).toBeGreaterThan(0)
    }
  })

  it('gives every preset enough params for the dynamic shader panel', () => {
    for (const preset of shaderPresets) {
      expect(preset.params.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('creates complete default params and uniforms for every preset', () => {
    for (const preset of shaderPresets) {
      const params = createDefaultParams(preset)
      const uniforms = createUniformsFromParams(preset, params)

      expect(Object.keys(params)).toEqual(
        preset.params.map((param) => param.id),
      )
      expect(Object.keys(uniforms)).toEqual(
        preset.params.map((param) => param.uniformName),
      )
    }
  })

  it('keeps preset params away from reserved global uniforms', () => {
    for (const preset of shaderPresets) {
      for (const param of preset.params) {
        expect(RESERVED_UNIFORM_NAMES.has(param.uniformName)).toBe(false)
      }
    }
  })

  it('finds presets by id and returns undefined for stale ids', () => {
    expect(getShaderPresetById('kaleidoscope-noise')?.name).toBe(
      'Kaleidoscope Noise',
    )
    expect(getShaderPresetById('removed-preset')).toBeUndefined()
  })

  it('uses Flowing Noise as the default shader preset fallback', () => {
    expect(getDefaultShaderPreset().id).toBe('flowing-noise')
  })

  it('exposes the shared default vertex shader contract', () => {
    expect(defaultVertexShader).toContain('varying vec2 v_uv')
    expect(defaultVertexShader).toContain('u_boundsMin')
    expect(defaultVertexShader).toContain('u_boundsMax')
    expect(defaultVertexShader).toContain('u_displacementMap')
    expect(defaultVertexShader).toContain('u_displacementMapTransform')
    expect(defaultVertexShader).toContain('u_displacementStrength')
    expect(defaultVertexShader).toContain('u_displacementBias')
    expect(defaultVertexShader).toContain('dot(displacementSample.rgb')
    expect(defaultVertexShader).toContain('mix(0.5, displacementLuminance')
    expect(defaultVertexShader).toContain('displacementHeight - 0.5')
  })
})
