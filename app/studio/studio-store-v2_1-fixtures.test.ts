import { describe, expect, it } from 'vitest'
import type { StateStorage } from 'zustand/middleware'

import {
  createInitialStudioStoreState,
  createStudioStore,
  MAX_PATTERN_LAYERS,
  STUDIO_STORE_STORAGE_KEY,
} from './studio-store'
import { DEFAULT_RANDOM_MORPH_LAYER_COUNT, randomizeMorphStackPreset } from '@/morph/randomize'

function createMemoryStorage(initialValue?: string) {
  const values = new Map<string, string>()

  if (initialValue) {
    values.set(STUDIO_STORE_STORAGE_KEY, initialValue)
  }

  const storage: StateStorage = {
    getItem: (name) => values.get(name) ?? null,
    setItem: (name, value) => {
      values.set(name, value)
    },
    removeItem: (name) => {
      values.delete(name)
    },
  }

  return {
    storage,
    readPersistedState: () => {
      const value = values.get(STUDIO_STORE_STORAGE_KEY)
      return value ? JSON.parse(value).state : null
    },
  }
}

describe('studio store v2.1 Character Surface fixtures', () => {
  it('starts from the Phase 3 storage key and v2.1 active panels', () => {
    const initial = createInitialStudioStoreState()

    expect(STUDIO_STORE_STORAGE_KEY).toBe('hanzi-studio-character-surface-v2_1_phase3')
    expect(initial.view.activePanel).toBe('character')
    expect(initial.morphStack.layers).toHaveLength(DEFAULT_RANDOM_MORPH_LAYER_COUNT)
    expect(initial.randomSeed).toBe(0)
    expect(initial.rendererMode).toBe('webgl')
    expect(initial.surfaceShaders.foreground.stylePresetId).toBe('solid')
    expect(initial.surfaceShaders.background.stylePresetId).toBe('solid')
  })

  it('keeps background Surface Shader styling solid even when stale state asks for gradients', () => {
    const { storage } = createMemoryStorage()
    const store = createStudioStore(storage)

    store.getState().setSurfaceShaderLayer('background', {
      stylePresetId: 'soft-gradient',
    })
    store.getState().setSurfaceShaderLayer('foreground', {
      stylePresetId: 'soft-gradient',
    })

    expect(store.getState().surfaceShaders.background.stylePresetId).toBe('solid')
    expect(store.getState().surfaceShaders.foreground.stylePresetId).toBe('gradient')
  })

  it('sanitizes foreground gradient stops and rejects background gradient style', () => {
    const { storage } = createMemoryStorage()
    const store = createStudioStore(storage)

    store.getState().setSurfaceShaderLayer('foreground', {
      stylePresetId: 'gradient',
      params: {
        gradientType: 'radial',
        gradientAngle: 405,
        gradientStops: [
          { color: '#ffffff', position: 1.3, opacity: 0.5 },
          { color: 'bad', position: 0.5 },
          { color: '#000000', position: -0.5 },
        ],
        opacity: 0.7,
      },
    })
    store.getState().setSurfaceShaderLayer('background', {
      stylePresetId: 'gradient',
      params: {
        opacity: 0.4,
        gradientStops: [
          { color: '#ff0000', position: 0 },
          { color: '#0000ff', position: 1 },
        ],
      },
    })

    expect(store.getState().surfaceShaders.foreground).toMatchObject({
      stylePresetId: 'gradient',
      params: {
        gradientStops: [
          { color: '#000000', position: 0 },
          { color: '#ffffff', position: 1, opacity: 0.5 },
        ],
        gradientType: 'radial',
        gradientAngle: 45,
        opacity: 0.7,
      },
    })
    expect(store.getState().surfaceShaders.background).toMatchObject({
      stylePresetId: 'solid',
      params: {
        opacity: 0.4,
      },
    })
  })

  it('persists Morph Stack, shader layers, pattern metadata, random seed, renderer mode, and active panel', () => {
    const { storage, readPersistedState } = createMemoryStorage()
    const store = createStudioStore(storage)

    store.getState().setActivePanel('morph')
    store.getState().setRendererMode('webgpu-experimental')
    store.getState().setSurfaceShaderLayer('foreground', {
      color: '#112233',
      params: {
        gradientType: 'linear',
        gradientAngle: 315,
        opacity: 0.6,
      },
      locked: true,
    })
    store.getState().addPatternLayer({
      source: { type: 'built-in', patternUrl: '/images/patterns/003.jpg' },
      target: 'morph-stack',
      locked: true,
    })
    store.getState().randomizeMorphPreset({ seed: 88 })

    const persisted = readPersistedState()

    expect(persisted.morphStack.layers.length).toBeGreaterThan(0)
    expect(persisted.surfaceShaders.foreground).toMatchObject({
      color: '#112233',
      params: {
        gradientType: 'linear',
        gradientAngle: 315,
        opacity: 0.6,
      },
      locked: true,
    })
    expect(persisted.patternLayers).toEqual([
      expect.objectContaining({
        source: { type: 'built-in', patternUrl: '/images/patterns/003.jpg' },
        target: 'morph-stack',
        locked: true,
      }),
    ])
    expect(persisted.randomSeed).toBe(88)
    expect(persisted.rendererMode).toBe('webgpu-experimental')
    expect(persisted.view.activePanel).toBe('morph')
    expect(persisted).not.toHaveProperty('runtime')
    expect(persisted).not.toHaveProperty('mesh')
    expect(persisted).not.toHaveProperty('displacement')
    expect(persisted).not.toHaveProperty('svgEffect')
  })

  it('preserves locked Morph layer slots during randomization', () => {
    const { storage } = createMemoryStorage()
    const store = createStudioStore(storage)
    const lockedLayer = {
      ...store.getState().morphStack.layers[1],
      params: { custom: 1 },
      enabled: false,
      collapsed: true,
      locked: true,
    }

    store
      .getState()
      .replaceMorphStackLayers([
        store.getState().morphStack.layers[0],
        lockedLayer,
        store.getState().morphStack.layers[2],
      ])
    store.getState().randomizeMorphPreset({ seed: 22 })

    expect(store.getState().morphStack.layers[1]).toEqual(lockedLayer)
  })

  it('reproduces unlocked Morph Stack slots from the same seed', () => {
    const { storage } = createMemoryStorage()
    const store = createStudioStore(storage)

    store.getState().randomizeMorphPreset({ seed: 41 })
    const first = store.getState().morphStack.layers
    store.getState().randomizeMorphPreset({ seed: 41 })
    const second = store.getState().morphStack.layers

    expect(second).toEqual(first)
  })

  it('updates unlocked shader and existing unlocked Pattern Layers without adding or removing patterns', () => {
    const { storage } = createMemoryStorage()
    const store = createStudioStore(storage)

    store.getState().setSurfaceShaderLayer('foreground', {
      color: '#010101',
      locked: true,
    })
    store.getState().setSurfaceShaderLayer('background', {
      color: '#020202',
      locked: false,
    })
    store.getState().addPatternLayer({
      source: { type: 'built-in', patternUrl: '/images/patterns/001.jpg' },
      target: 'foreground-shader',
      locked: false,
    })
    store.getState().addPatternLayer({
      source: { type: 'built-in', patternUrl: '/images/patterns/002.jpg' },
      target: 'background-shader',
      locked: true,
    })

    const before = store.getState().patternLayers
    store.getState().randomizeMorphPreset({ seed: 101 })

    expect(store.getState().surfaceShaders.foreground.color).toBe('#010101')
    expect(store.getState().surfaceShaders.background.color).not.toBe('#020202')
    expect(store.getState().patternLayers).toHaveLength(before.length)
    expect(store.getState().patternLayers[1]).toEqual(before[1])
  })

  it('caps Pattern Layers and never persists local file data urls', () => {
    const { storage, readPersistedState } = createMemoryStorage()
    const store = createStudioStore(storage)

    for (let index = 0; index < MAX_PATTERN_LAYERS + 2; index += 1) {
      store.getState().addPatternLayer({
        source: { type: 'local-file', fileName: `pattern-${index}.png` },
        target: 'foreground-shader',
      })
    }
    store.getState().setUploadedPatternLayerData('pattern-layer-1', 'data:image/png;base64,raw')

    expect(store.getState().patternLayers).toHaveLength(MAX_PATTERN_LAYERS)
    expect(JSON.stringify(readPersistedState())).not.toContain('base64')
  })

  it('uses Phase 2 randomization as the default Morph Stack draft source', () => {
    const initial = createInitialStudioStoreState()
    const draft = randomizeMorphStackPreset({ seed: 0 })

    expect(initial.morphStack.layers.map((layer) => layer.definitionId)).toEqual(
      draft.layers.map((layer) => layer.definitionId)
    )
  })
})
