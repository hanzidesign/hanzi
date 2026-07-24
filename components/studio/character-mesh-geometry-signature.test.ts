import { describe, expect, it } from 'vitest'

import {
  DEFAULT_CHARACTER_MESH_DEFORM,
  type CharacterMeshDeformSettings,
} from './character-mesh-deform'
import {
  deriveCharacterMeshGeometrySignature,
  deriveCharacterMeshGeometryTopology,
} from './character-mesh-geometry-signature'

function options(deform: CharacterMeshDeformSettings = DEFAULT_CHARACTER_MESH_DEFORM) {
  return {
    extrusionDepth: 0.2,
    thickness: 0.04,
    bevel: 0.02,
    twist: 3,
    taper: 0.1,
    bend: 2,
    deform,
    displacementSubdivisionLevel: 0,
  }
}

describe('character mesh geometry signature', () => {
  it('changes when CPU geometry inputs change', () => {
    const base = deriveCharacterMeshGeometrySignature(options())
    expect(deriveCharacterMeshGeometrySignature(options({
      ...DEFAULT_CHARACTER_MESH_DEFORM,
      bulgePinch: { ...DEFAULT_CHARACTER_MESH_DEFORM.bulgePinch, enabled: true },
    }))).not.toBe(base)
    expect(deriveCharacterMeshGeometrySignature({ ...options(), bevel: 0.03 })).not.toBe(base)
  })

  it('changes at GPU activation boundaries and subdivision class boundaries', () => {
    const inactive = options()
    const waveActive = {
      ...DEFAULT_CHARACTER_MESH_DEFORM,
      wave: { ...DEFAULT_CHARACTER_MESH_DEFORM.wave, enabled: true },
    }
    const noiseActive = {
      ...DEFAULT_CHARACTER_MESH_DEFORM,
      surfaceNoise: { ...DEFAULT_CHARACTER_MESH_DEFORM.surfaceNoise, enabled: true },
    }

    expect(deriveCharacterMeshGeometryTopology(inactive)).toEqual({
      gpuDeformActive: false,
      subdivisionLevel: 2,
    })
    expect(deriveCharacterMeshGeometryTopology({ ...inactive, twist: 0, bend: 0 })).toEqual({
      gpuDeformActive: false,
      subdivisionLevel: 0,
    })
    expect(deriveCharacterMeshGeometryTopology({ ...inactive, deform: waveActive })).toEqual({
      gpuDeformActive: true,
      subdivisionLevel: 2,
    })
    expect(deriveCharacterMeshGeometryTopology({
      ...inactive,
      twist: 0,
      bend: 0,
      deform: noiseActive,
    })).toEqual({ gpuDeformActive: true, subdivisionLevel: 1 })

    const inactiveKey = deriveCharacterMeshGeometrySignature({ ...inactive, twist: 0, bend: 0 })
    const activeKey = deriveCharacterMeshGeometrySignature({
      ...inactive,
      twist: 0,
      bend: 0,
      deform: waveActive,
    })
    expect(activeKey).not.toBe(inactiveKey)
  })

  it('keeps the key stable for nonstructural Wave and Noise settings', () => {
    const wave = {
      ...DEFAULT_CHARACTER_MESH_DEFORM,
      wave: { ...DEFAULT_CHARACTER_MESH_DEFORM.wave, enabled: true },
    }
    const base = deriveCharacterMeshGeometrySignature({
      ...options(wave),
      twist: 0,
      bend: 0,
    })
    const changed = deriveCharacterMeshGeometrySignature({
      ...options({
        ...wave,
        wave: {
          ...wave.wave,
          speed: 18,
          frequency: 8,
          phase: 120,
          direction: 'radial',
          waveform: 'square',
        },
      }),
      twist: 0,
      bend: 0,
    })
    expect(changed).toBe(base)

    const noise = {
      ...DEFAULT_CHARACTER_MESH_DEFORM,
      surfaceNoise: { ...DEFAULT_CHARACTER_MESH_DEFORM.surfaceNoise, enabled: true },
    }
    const noiseBase = deriveCharacterMeshGeometrySignature({
      ...options(noise),
      twist: 0,
      bend: 0,
    })
    const noiseChanged = deriveCharacterMeshGeometrySignature({
      ...options({
        ...noise,
        surfaceNoise: {
          ...noise.surfaceNoise,
          scale: 2,
          seed: 42,
          detail: 4,
          roughness: 0.9,
          contrast: 1.8,
        },
      }),
      twist: 0,
      bend: 0,
    })
    expect(noiseChanged).toBe(noiseBase)
  })
})
