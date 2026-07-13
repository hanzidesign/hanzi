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

describe('studio store Phase 5D Grainrad ASCII fixtures', () => {
  it('starts from the Phase 5D storage key, light theme, and ASCII terminal defaults', () => {
    const initial = createInitialStudioStoreState()

    expect(STUDIO_STORE_STORAGE_KEY).toBe('hanzi-studio-grainrad-effects-v1')
    expect(initial.view.activePanel).toBe('character')
    expect(initial.view.theme).toBe('light')
    expect(initial.view.mobileTab).toBe('input')
    expect(initial.view.settingsOpen).toBe(false)
    expect(initial.export.selectedFormat).toBe('png')
    expect(initial.ascii.palette).toBe('custom')
    expect(initial.morphStack.layers).toHaveLength(DEFAULT_RANDOM_MORPH_LAYER_COUNT)
    expect(initial.morphStack.layers.every((layer) => layer.intensity > 0.7)).toBe(true)
    expect(initial.randomSeed).toBe(0)
    expect(initial.rendererMode).toBe('webgl')
    expect(initial.surfaceShaders.foreground.stylePresetId).toBe('depth-lit')
    expect(initial.surfaceShaders.foreground.color).toBe('#080706')
    expect(initial.surfaceShaders.foreground.params.opacity).toBe(0.96)
    expect(initial.surfaceShaders.background.stylePresetId).toBe('solid')
    expect(initial.surfaceShaders.background.color).toBe('#ebe7dc')
    expect(initial.patternLayers).toEqual([
      expect.objectContaining({
        source: { type: 'built-in', patternUrl: '/images/patterns/033.jpg' },
        target: 'background-shader',
        intensity: 0.36,
        blendMode: 'multiply',
      }),
      expect.objectContaining({
        source: { type: 'built-in', patternUrl: '/images/patterns/087.jpg' },
        target: 'foreground-shader',
        intensity: 0.62,
        blendMode: 'soft-light',
      }),
      expect.objectContaining({
        source: { type: 'built-in', patternUrl: '/images/patterns/014.jpg' },
        target: 'morph-stack',
        intensity: 0.7,
        blendMode: 'normal',
      }),
    ])
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

  it('persists only active terminal choices while keeping legacy surfaces runtime-only', () => {
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
    store.getState().updatePatternLayer('pattern-layer-3', {
      source: { type: 'built-in', patternUrl: '/images/patterns/003.jpg' },
      target: 'morph-stack',
      locked: true,
      enabled: false,
      intensity: 0.42,
      blendMode: 'overlay',
    })
    store.getState().randomizeMorphPreset({ seed: 88 })

    const persisted = readPersistedState()

    expect(persisted).toMatchObject({
      character: store.getState().character,
      ascii: store.getState().ascii,
      mesh: store.getState().mesh,
      rendererMode: 'webgpu-experimental',
      view: store.getState().view,
      export: store.getState().export,
    })
    expect(persisted.rendererMode).toBe('webgpu-experimental')
    expect(persisted.view.activePanel).toBe('morph')
    expect(persisted).not.toHaveProperty('morphStack')
    expect(persisted).not.toHaveProperty('surfaceShaders')
    expect(persisted).not.toHaveProperty('shaderLayers')
    expect(persisted).not.toHaveProperty('patternLayers')
    expect(persisted).not.toHaveProperty('randomSeed')
    expect(persisted).not.toHaveProperty('postFx')
    expect(persisted).not.toHaveProperty('runtime')
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
      intensity: 0.31,
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

  it('ignores stale persisted Morph and Pattern layer fields under the terminal storage key', () => {
    const initial = createInitialStudioStoreState()
    const staleState = {
      ...initial,
      morphStack: {
        layers: [
          {
            ...initial.morphStack.layers[0],
            intensity: 1.8,
          },
          {
            ...initial.morphStack.layers[1],
            intensity: -0.2,
          },
        ],
      },
      patternLayers: [
        {
          id: 'pattern-layer-custom',
          source: { type: 'built-in', patternUrl: '/images/patterns/001.jpg' },
          target: 'foreground-shader',
          enabled: false,
          intensity: 2,
          blendMode: 'screen',
          locked: false,
        },
        {
          id: 'pattern-layer-fallback',
          source: { type: 'built-in', patternUrl: '/images/patterns/002.jpg' },
          target: 'background-shader',
          enabled: 'bad',
          intensity: Number.NaN,
          blendMode: 'erase',
          locked: false,
        },
      ],
    }
    const { storage } = createMemoryStorage(JSON.stringify({ state: staleState, version: 1 }))
    const store = createStudioStore(storage)

    expect(store.getState().morphStack).toEqual(initial.morphStack)
    expect(store.getState().patternLayers).toEqual(initial.patternLayers)
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
    store.getState().updatePatternLayer('pattern-layer-2', {
      locked: true,
    })

    const before = store.getState().patternLayers
    store.getState().randomizeMorphPreset({ seed: 101 })

    expect(store.getState().surfaceShaders.foreground.color).toBe('#010101')
    expect(store.getState().surfaceShaders.background.color).not.toBe('#020202')
    expect(store.getState().patternLayers).toHaveLength(before.length)
    expect(store.getState().patternLayers[1]).toEqual(before[1])
    expect(store.getState().patternLayers[0].intensity).not.toBe(before[0].intensity)
  })

  it('creates a complete Pattern Layer art stack when randomizing from an empty Pattern Layer state', () => {
    const { storage } = createMemoryStorage()
    const store = createStudioStore(storage)

    store.getState().randomizeMorphPreset({
      seed: 404,
      families: {
        morph: false,
        shaders: false,
        patterns: true,
      },
    })

    expect(store.getState().patternLayers).toHaveLength(MAX_PATTERN_LAYERS)
    expect(store.getState().patternLayers.map((layer) => layer.target)).toEqual([
      'background-shader',
      'foreground-shader',
      'morph-stack',
    ])
    expect(store.getState().patternLayers.every((layer) => layer.enabled)).toBe(true)
    expect(store.getState().patternLayers.every((layer) => layer.intensity > 0.25)).toBe(true)
  })

  it('randomizes only selected effect families when family options are provided', () => {
    const { storage } = createMemoryStorage()
    const store = createStudioStore(storage)

    store.getState().addPatternLayer({
      source: { type: 'built-in', patternUrl: '/images/patterns/001.jpg' },
      target: 'foreground-shader',
      intensity: 0.2,
    })

    const initialMorphLayers = store.getState().morphStack.layers
    const initialShaders = store.getState().surfaceShaders
    const initialPatternLayers = store.getState().patternLayers

    store.getState().randomizeMorphPreset({
      seed: 202,
      families: {
        morph: false,
        shaders: true,
        patterns: false,
      },
    })

    expect(store.getState().morphStack.layers).toEqual(initialMorphLayers)
    expect(store.getState().surfaceShaders).not.toEqual(initialShaders)
    expect(store.getState().patternLayers).toEqual(initialPatternLayers)

    store.getState().randomizeMorphPreset({
      seed: 203,
      families: {
        morph: false,
        shaders: false,
        patterns: true,
      },
    })

    expect(store.getState().morphStack.layers).toEqual(initialMorphLayers)
    expect(store.getState().patternLayers).not.toEqual(initialPatternLayers)
  })

  it('reorders Pattern Layers without changing layer payloads', () => {
    const { storage } = createMemoryStorage()
    const store = createStudioStore(storage)

    store.getState().addPatternLayer({
      source: { type: 'built-in', patternUrl: '/images/patterns/001.jpg' },
      target: 'foreground-shader',
    })
    store.getState().addPatternLayer({
      source: { type: 'built-in', patternUrl: '/images/patterns/002.jpg' },
      target: 'background-shader',
    })
    store.getState().addPatternLayer({
      source: { type: 'built-in', patternUrl: '/images/patterns/003.jpg' },
      target: 'morph-stack',
    })
    const before = store.getState().patternLayers

    store.getState().reorderPatternLayer(2, 0)

    expect(store.getState().patternLayers).toEqual([before[2], before[0], before[1]])

    store.getState().reorderPatternLayer(-1, 1)
    store.getState().reorderPatternLayer(0, 3)

    expect(store.getState().patternLayers).toEqual([before[2], before[0], before[1]])
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
