import { DoubleSide, Vector2, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import {
  createShaderMaterial,
  createShaderMaterialUniforms,
  resolveShaderPresetForCanvas,
} from './shader-material'
import { createDefaultParams } from '@/shaders/uniforms'
import { getDefaultShaderPreset, getShaderPresetById } from '@/shaders/registry'

describe('shader material helpers', () => {
  it('combines common uniforms with selected preset param uniforms', () => {
    const preset = getShaderPresetById('grid-pulse')

    if (!preset) {
      throw new Error('Expected grid-pulse preset')
    }

    const uniforms = createShaderMaterialUniforms({
      preset,
      params: {
        ...createDefaultParams(preset),
        density: 24,
        invertGrid: true,
      },
    })

    expect(uniforms.u_time.value).toBe(0)
    expect(uniforms.u_mouse.value).toBeInstanceOf(Vector2)
    expect(uniforms.u_resolution.value).toBeInstanceOf(Vector2)
    expect(uniforms.u_boundsMin.value).toBeInstanceOf(Vector3)
    expect(uniforms.u_boundsMax.value).toBeInstanceOf(Vector3)
    expect(uniforms.u_displacementStrength.value).toBe(0)
    expect(uniforms.u_displacementBias.value).toBe(0)
    expect(uniforms.u_density.value).toBe(24)
    expect(uniforms.u_invertGrid.value).toBe(1)
  })

  it('uses provided canvas, bounds, pointer, and displacement values', () => {
    const preset = getDefaultShaderPreset()
    const uniforms = createShaderMaterialUniforms({
      preset,
      params: createDefaultParams(preset),
      resolution: new Vector2(640, 480),
      mouse: new Vector2(0.25, 0.75),
      boundsMin: new Vector3(-2, -1, -0.5),
      boundsMax: new Vector3(2, 1, 0.5),
      displacementStrength: 0.3,
      displacementBias: -0.1,
    })

    expect(uniforms.u_resolution.value).toEqual(new Vector2(640, 480))
    expect(uniforms.u_mouse.value).toEqual(new Vector2(0.25, 0.75))
    expect(uniforms.u_boundsMin.value).toEqual(new Vector3(-2, -1, -0.5))
    expect(uniforms.u_boundsMax.value).toEqual(new Vector3(2, 1, 0.5))
    expect(uniforms.u_displacementStrength.value).toBe(0.3)
    expect(uniforms.u_displacementBias.value).toBe(-0.1)
  })

  it('falls back to the default shader preset for stale canvas preset ids', () => {
    expect(resolveShaderPresetForCanvas('removed-preset')).toBe(
      getDefaultShaderPreset(),
    )
  })

  it('renders the shared shader material on front, back, and side faces', () => {
    const preset = getDefaultShaderPreset()
    const material = createShaderMaterial({
      preset,
      params: createDefaultParams(preset),
    })

    expect(material.side).toBe(DoubleSide)

    material.dispose()
  })
})
