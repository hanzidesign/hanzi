import { describe, expect, it } from 'vitest'

import {
  DEFAULT_CHARACTER_MESH_DEFORM,
  resetCharacterMeshDeformFeature,
  sanitizeCharacterMeshDeformSettings,
} from './character-mesh-deform'

describe('character mesh deform domain', () => {
  it('publishes the complete controller defaults', () => {
    expect(DEFAULT_CHARACTER_MESH_DEFORM).toEqual({
      bulgePinch: {
        enabled: false,
        amount: 0.5,
        radius: 2,
        falloff: 0.5,
        centerX: 0,
        centerY: 0,
        axis: 'radial',
        profile: 'smooth',
      },
      squashStretch: {
        enabled: false,
        amount: 0,
        axis: 'y',
        pivot: 0,
        preserveVolume: true,
        secondaryScale: 1,
        falloff: 0,
      },
      wave: {
        enabled: false,
        amplitude: 0.2,
        speed: 2,
        frequency: 3,
        phase: 0,
        direction: 'y',
        waveform: 'sine',
        offset: 0,
        decay: 0,
      },
      surfaceNoise: {
        enabled: false,
        amount: 0.5,
        speed: 2,
        scale: 10,
        seed: 0,
        detail: 1,
        roughness: 0.5,
        direction: 'depth',
        contrast: 1,
        offsetX: 0,
        offsetY: 0,
      },
      inflate: {
        enabled: false,
        amount: 0.5,
        balance: 0.5,
        radius: 1,
        falloff: 0.5,
        centerX: 0,
        centerY: 0,
        uniform: true,
        deflate: false,
      },
      curl: {
        enabled: false,
        angle: 0,
        axis: 'x',
        tightness: 1,
        pivot: 0,
        offset: 0,
        turns: 0,
        falloff: 0,
        clamp: false,
      },
    })
  })

  it('clamps values, rejects invalid enums and preserves booleans', () => {
    const sanitized = sanitizeCharacterMeshDeformSettings({
      bulgePinch: { enabled: 'yes', amount: 99, radius: 99, falloff: 4, axis: 'bad', profile: 'bad' },
      squashStretch: { amount: -9, axis: 'bad', pivot: 9, preserveVolume: 0, secondaryScale: 9, falloff: -1 },
      wave: { amount: 2, speed: 99, frequency: 100, phase: -1000, direction: 'bad', waveform: 'bad', offset: 9, decay: -1 },
      surfaceNoise: { enabled: true, amount: 9, speed: 99, scale: 100, seed: 10000.7, detail: 8.3, roughness: -1, direction: 'bad', contrast: 4, offsetX: -8, offsetY: 8 },
      inflate: { enabled: true, amount: 99, balance: -1, radius: 0, falloff: 3, centerX: -4, centerY: 4, uniform: 'yes', deflate: true },
      curl: { amount: -1000, axis: 'bad', tightness: 0, pivot: 5, offset: -5, turns: 8.8, falloff: 3, clamp: 'no' },
    })

    expect(sanitized.bulgePinch).toEqual({ ...DEFAULT_CHARACTER_MESH_DEFORM.bulgePinch, amount: 10, radius: 5, falloff: 1 })
    expect(sanitizeCharacterMeshDeformSettings({ bulgePinch: { amount: -99 } }).bulgePinch.amount).toBe(-10)
    expect(sanitizeCharacterMeshDeformSettings({ bulgePinch: { radius: -1 } }).bulgePinch.radius).toBe(0.05)
    expect(sanitized.squashStretch).toEqual({ ...DEFAULT_CHARACTER_MESH_DEFORM.squashStretch, amount: -1, pivot: 1, secondaryScale: 3 })
    expect(sanitized.wave).toEqual({ ...DEFAULT_CHARACTER_MESH_DEFORM.wave, amplitude: 1, speed: 20, frequency: 12, phase: -360, offset: 1 })
    expect(sanitizeCharacterMeshDeformSettings({ wave: { speed: -1 } }).wave.speed).toBe(1)
    expect(sanitized.surfaceNoise).toEqual({ ...DEFAULT_CHARACTER_MESH_DEFORM.surfaceNoise, enabled: true, amount: 2, speed: 20, scale: 20, seed: 9999, detail: 5, roughness: 0, offsetX: -5, offsetY: 5, contrast: 2 })
    expect(sanitizeCharacterMeshDeformSettings({ surfaceNoise: { amount: -1 } }).surfaceNoise.amount).toBe(0)
    expect(sanitizeCharacterMeshDeformSettings({ surfaceNoise: { speed: -1 } }).surfaceNoise.speed).toBe(1)
    expect(sanitized.inflate).toEqual({ ...DEFAULT_CHARACTER_MESH_DEFORM.inflate, enabled: true, amount: 10, balance: 0, radius: 0.05, falloff: 1, centerX: -1, centerY: 1, deflate: true })
    expect(sanitized.curl).toEqual({ ...DEFAULT_CHARACTER_MESH_DEFORM.curl, angle: -360, tightness: 0.1, pivot: 1, offset: -1, turns: 5, falloff: 1 })
  })

  it('maps legacy amount fields to Wave amplitude and Curl angle', () => {
    const sanitized = sanitizeCharacterMeshDeformSettings({
      wave: { enabled: true, amount: 0.4 },
      curl: { enabled: true, amount: -90 },
    })

    expect(sanitized.wave.amplitude).toBe(0.4)
    expect(sanitized.curl.angle).toBe(-90)
  })

  it('returns complete enabled defaults for section Reset all payloads', () => {
    expect(resetCharacterMeshDeformFeature('bulgePinch')).toEqual({
      ...DEFAULT_CHARACTER_MESH_DEFORM.bulgePinch,
      enabled: true,
    })
    expect(resetCharacterMeshDeformFeature('squashStretch')).toEqual({
      ...DEFAULT_CHARACTER_MESH_DEFORM.squashStretch,
      enabled: true,
    })
    expect(resetCharacterMeshDeformFeature('wave')).toEqual({
      ...DEFAULT_CHARACTER_MESH_DEFORM.wave,
      enabled: true,
    })
    expect(resetCharacterMeshDeformFeature('surfaceNoise')).toEqual({
      ...DEFAULT_CHARACTER_MESH_DEFORM.surfaceNoise,
      enabled: true,
    })
    expect(resetCharacterMeshDeformFeature('inflate')).toEqual({
      ...DEFAULT_CHARACTER_MESH_DEFORM.inflate,
      enabled: true,
    })
    expect(resetCharacterMeshDeformFeature('curl')).toEqual({
      ...DEFAULT_CHARACTER_MESH_DEFORM.curl,
      enabled: true,
    })
  })
})
