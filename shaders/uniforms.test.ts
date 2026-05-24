import { Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import type { ShaderPreset } from './types'
import {
  createDefaultParams,
  createUniformsFromParams,
  hexToVector3,
  sanitizeParamsForPreset,
} from './uniforms'

const testPreset: ShaderPreset = {
  id: 'test-preset',
  name: 'Test Preset',
  category: 'Test',
  fragmentShader: 'void main() {}',
  shaderPath: 'shaders/test/fragment.glsl',
  params: [
    {
      type: 'number',
      id: 'intensity',
      uniformName: 'u_intensity',
      label: 'Intensity',
      default: 0.75,
      min: 0,
      max: 1,
      step: 0.01,
    },
    {
      type: 'color',
      id: 'tint',
      uniformName: 'u_tint',
      label: 'Tint',
      default: '#3366ff',
    },
    {
      type: 'boolean',
      id: 'invert',
      uniformName: 'u_invert',
      label: 'Invert',
      default: false,
    },
    {
      type: 'select',
      id: 'blendMode',
      uniformName: 'u_blendMode',
      label: 'Blend mode',
      default: 'screen',
      options: [
        { id: 'screen', label: 'Screen', value: 1 },
        { id: 'multiply', label: 'Multiply', value: 2 },
      ],
    },
  ],
}

describe('shader uniform helpers', () => {
  it('creates default params for number, color, boolean, and select params', () => {
    expect(createDefaultParams(testPreset)).toEqual({
      intensity: 0.75,
      tint: '#3366ff',
      invert: false,
      blendMode: 'screen',
    })
  })

  it('converts hex colors to normalized THREE.Vector3 values', () => {
    const vector = hexToVector3('#3366ff')

    expect(vector).toBeInstanceOf(Vector3)
    expect(vector.x).toBeCloseTo(0.2)
    expect(vector.y).toBeCloseTo(0.4)
    expect(vector.z).toBeCloseTo(1)
  })

  it('converts params to shader uniforms using schema-specific values', () => {
    const uniforms = createUniformsFromParams(testPreset, {
      intensity: 0.25,
      tint: '#ff8000',
      invert: true,
      blendMode: 'multiply',
    })

    expect(uniforms.u_intensity.value).toBe(0.25)
    expect(uniforms.u_invert.value).toBe(1)
    expect(uniforms.u_blendMode.value).toBe(2)

    const tint = uniforms.u_tint.value
    expect(tint).toBeInstanceOf(Vector3)
    if (tint instanceof Vector3) {
      expect(tint.x).toBeCloseTo(1)
      expect(tint.y).toBeCloseTo(128 / 255)
      expect(tint.z).toBeCloseTo(0)
    }
  })

  it('sanitizes stale persisted params back to the selected preset schema', () => {
    expect(
      sanitizeParamsForPreset(testPreset, {
        intensity: 'stale',
        tint: '#00ff00',
        invert: 'true',
        blendMode: 'unknown',
        removedParam: 999,
      }),
    ).toEqual({
      intensity: 0.75,
      tint: '#00ff00',
      invert: false,
      blendMode: 'screen',
    })
  })

  it('resets stale number params outside the preset bounds', () => {
    expect(
      sanitizeParamsForPreset(testPreset, {
        intensity: 2,
      }),
    ).toMatchObject({
      intensity: 0.75,
    })
  })
})
