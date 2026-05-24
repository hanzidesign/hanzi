import { describe, expect, it } from 'vitest'

import type { ShaderPreset } from './types'
import { validateShaderPreset } from './validation'

const validPreset: ShaderPreset = {
  id: 'valid-preset',
  name: 'Valid Preset',
  category: 'Test',
  fragmentShader: 'void main() {}',
  shaderPath: 'shaders/valid/fragment.glsl',
  params: [
    {
      type: 'number',
      id: 'intensity',
      uniformName: 'u_intensity',
      label: 'Intensity',
      default: 1,
      min: 0,
      max: 2,
      step: 0.1,
    },
  ],
}

describe('shader preset validation', () => {
  it('allows params that do not collide with reserved uniforms', () => {
    expect(() => validateShaderPreset(validPreset)).not.toThrow()
  })

  it('rejects params whose uniformName collides with reserved globals', () => {
    const invalidPreset: ShaderPreset = {
      ...validPreset,
      params: [
        {
          type: 'number',
          id: 'time',
          uniformName: 'u_time',
          label: 'Time',
          default: 0,
          min: 0,
          max: 1,
          step: 0.01,
        },
      ],
    }

    expect(() => validateShaderPreset(invalidPreset)).toThrow(/u_time/)
  })

  it('rejects duplicate param ids before they overwrite param state', () => {
    const invalidPreset: ShaderPreset = {
      ...validPreset,
      params: [validPreset.params[0], { ...validPreset.params[0] }],
    }

    expect(() => validateShaderPreset(invalidPreset)).toThrow(/duplicate param/)
  })

  it('rejects duplicate uniform names before they overwrite uniforms', () => {
    const invalidPreset: ShaderPreset = {
      ...validPreset,
      params: [
        validPreset.params[0],
        {
          ...validPreset.params[0],
          id: 'duplicate-uniform',
        },
      ],
    }

    expect(() => validateShaderPreset(invalidPreset)).toThrow(
      /duplicate uniform/,
    )
  })

  it('rejects invalid defaults that would fail later at conversion time', () => {
    const invalidPreset: ShaderPreset = {
      ...validPreset,
      params: [
        {
          type: 'select',
          id: 'blendMode',
          uniformName: 'u_blendMode',
          label: 'Blend mode',
          default: 'missing',
          options: [{ id: 'screen', label: 'Screen', value: 1 }],
        },
      ],
    }

    expect(() => validateShaderPreset(invalidPreset)).toThrow(
      /unknown select default/,
    )
  })
})
