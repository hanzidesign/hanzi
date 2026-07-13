import { describe, expect, it } from 'vitest'
import type { StateStorage } from 'zustand/middleware'

import {
  createInitialStudioStoreState,
  createStudioStore,
  STUDIO_STORE_STORAGE_KEY,
} from './studio-store'
import { createDefaultParams } from '@/shaders/uniforms'
import { getDefaultShaderPreset, getShaderPresetById } from '@/shaders/registry'

const OLD_STUDIO_STORE_STORAGE_KEY = 'hanzi-studio-shader-editor-v1'

function createMemoryStorage(
  initialValue?: string,
  key = STUDIO_STORE_STORAGE_KEY,
) {
  const values = new Map<string, string>()

  if (initialValue) {
    values.set(key, initialValue)
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
    readPersistedState: (name = STUDIO_STORE_STORAGE_KEY) => {
      const value = values.get(name)
      return value ? JSON.parse(value).state : null
    },
  }
}

describe('studio store', () => {
  it('starts with serializable Character Editor defaults', () => {
    const { storage } = createMemoryStorage()
    const store = createStudioStore(storage)
    const state = store.getState()

    expect(state.character).toEqual({
      country: 'int',
      year: '2023',
      isTc: true,
    })
    expect(state.shader).toEqual({
      selectedPresetId: getDefaultShaderPreset().id,
      currentParams: createDefaultParams(getDefaultShaderPreset()),
    })
    expect(state.mesh).toMatchObject({
      extrusionDepth: expect.any(Number),
      thickness: expect.any(Number),
      autoRotate: true,
    })
    expect(state.displacement.patternUrl).toBe('/images/patterns/000.jpg')
    expect(state.displacement.subdivisionLevel).toBe(0)
    expect(state.view.activePanel).toBe('character')
  })

  it('uses a clean Grainrad ASCII storage key without reading old mesh or displacement state', () => {
    const initial = createInitialStudioStoreState()
    const oldState = {
      ...initial,
      character: { country: 'jp', year: '2024', isTc: true },
      mesh: { ...initial.mesh, scale: 1.7 },
      displacement: {
        ...initial.displacement,
        patternUrl: '/images/patterns/012.jpg',
        strength: 0.4,
      },
    }
    const { storage } = createMemoryStorage(
      JSON.stringify({ state: oldState, version: 1 }),
      OLD_STUDIO_STORE_STORAGE_KEY,
    )
    const store = createStudioStore(storage)

    expect(STUDIO_STORE_STORAGE_KEY).toBe('hanzi-studio-grainrad-effects-v1')
    expect(store.getState().character).toEqual(initial.character)
    expect(store.getState().mesh).toEqual(initial.mesh)
    expect(store.getState().displacement).toEqual(initial.displacement)
  })

  it('switches shader presets by resetting only shader params', () => {
    const { storage } = createMemoryStorage()
    const store = createStudioStore(storage)
    const kaleidoscopePreset = getShaderPresetById('kaleidoscope-noise')

    if (!kaleidoscopePreset) {
      throw new Error('Expected kaleidoscope-noise preset')
    }

    store.getState().setCharacter('jp', '2024', true)
    store.getState().setMeshControl({ scale: 1.4 })
    store.getState().setDisplacementControl({ strength: 0.25 })
    store.getState().setSelectedPreset(kaleidoscopePreset.id)

    expect(store.getState().character).toEqual({
      country: 'jp',
      year: '2024',
      isTc: true,
    })
    expect(store.getState().mesh.scale).toBe(1.4)
    expect(store.getState().displacement.strength).toBe(0.25)
    expect(store.getState().shader).toEqual({
      selectedPresetId: kaleidoscopePreset.id,
      currentParams: createDefaultParams(kaleidoscopePreset),
    })
  })

  it('allows the active control panel to collapse', () => {
    const { storage, readPersistedState } = createMemoryStorage()
    const store = createStudioStore(storage)

    store.getState().setActivePanel('shader')
    store.getState().setActivePanel(null)

    expect(store.getState().view.activePanel).toBeNull()
    expect(store.getState().svgEffect.panel).toBeNull()
    expect(readPersistedState().view.activePanel).toBeNull()
  })

  it('resets only mesh controls without changing shader, displacement, or view state', () => {
    const { storage } = createMemoryStorage()
    const store = createStudioStore(storage)
    const initial = store.getState()

    store.getState().setMeshControl({
      extrusionDepth: 0.4,
      thickness: 0.18,
      bevel: 0.08,
      twist: 90,
      taper: 0.6,
      bend: -45,
      scale: 1.6,
      autoRotate: true,
    })
    store.getState().setDisplacementControl({ strength: 0.35 })
    store.getState().setBackgroundColor('#202020')
    store.getState().resetMeshControls()

    expect(store.getState().mesh).toEqual(initial.mesh)
    expect(store.getState().mesh).toMatchObject({
      extrusionDepth: 0.18,
      thickness: 0,
      bevel: 0,
      twist: 0,
      taper: 0,
      bend: 0,
    })
    expect(store.getState().displacement.strength).toBe(0.35)
    expect(store.getState().view.backgroundColor).toBe('#202020')
    expect(store.getState().shader).toEqual(initial.shader)
  })

  it('keeps uploaded displacement image data in runtime state only', () => {
    const { storage, readPersistedState } = createMemoryStorage()
    const store = createStudioStore(storage)

    store
      .getState()
      .setUploadedDisplacementImageData('data:image/png;base64,upload')

    expect(store.getState().runtime.uploadedDisplacementImageData).toBe(
      'data:image/png;base64,upload',
    )
    expect(readPersistedState().runtime).toBeUndefined()
    expect(JSON.stringify(readPersistedState())).not.toContain('upload')
  })

  it('keeps loaded character SVG text in runtime state only', () => {
    const { storage, readPersistedState } = createMemoryStorage()
    const store = createStudioStore(storage)

    store.getState().setCharacterSvgLoading('/chars/tc/int/2023.svg')
    store
      .getState()
      .setCharacterSvgData('/chars/tc/int/2023.svg', '<svg>loaded</svg>')

    expect(store.getState().runtime.svgCharacterUrl).toBe(
      '/chars/tc/int/2023.svg',
    )
    expect(store.getState().runtime.svgData).toBe('<svg>loaded</svg>')
    expect(readPersistedState().runtime).toBeUndefined()
    expect(JSON.stringify(readPersistedState())).not.toContain('loaded')
  })

  it('clears stale loaded SVG runtime data when a new character starts loading', () => {
    const { storage } = createMemoryStorage()
    const store = createStudioStore(storage)

    store.getState().setCharacterSvgLoading('/chars/tc/int/2023.svg')
    store
      .getState()
      .setCharacterSvgData('/chars/tc/int/2023.svg', '<svg>old</svg>')
    store.getState().setCharacterSvgLoading('/chars/tc/jp/2024.svg')

    expect(store.getState().runtime.svgCharacterUrl).toBe(
      '/chars/tc/jp/2024.svg',
    )
    expect(store.getState().runtime.svgData).toBe('')
    expect(store.getState().runtime.svgLoadError).toBeNull()
  })

  it('ignores stale persisted shader params while preserving active mesh choices', () => {
    const initial = createInitialStudioStoreState()
    const staleState = {
      ...initial,
      character: { country: 'jp', year: '2024', isTc: true },
      shader: {
        selectedPresetId: 'grid-pulse',
        currentParams: {
          density: 'stale',
          pulseSpeed: 2,
          removedParam: 999,
        },
      },
      mesh: { ...initial.mesh, scale: 1.7 },
      displacement: {
        ...initial.displacement,
        patternUrl: '/images/patterns/012.jpg',
        strength: 0.4,
        subdivisionLevel: 2,
      },
    }
    const { storage } = createMemoryStorage(
      JSON.stringify({ state: staleState, version: 1 }),
    )
    const store = createStudioStore(storage)

    expect(store.getState().character).toEqual({
      country: 'jp',
      year: '2024',
      isTc: true,
    })
    expect(store.getState().mesh).toEqual({
      ...initial.mesh,
      scale: 1.7,
    })
    expect(store.getState().displacement).toEqual(initial.displacement)
    expect(store.getState().shader).toEqual(initial.shader)
  })

  it('falls back only shader state when the persisted preset id is missing', () => {
    const initial = createInitialStudioStoreState()
    const staleState = {
      ...initial,
      character: { country: 'tw', year: '2024', isTc: true },
      shader: {
        selectedPresetId: 'removed-preset',
        currentParams: { removed: 1 },
      },
      mesh: { ...initial.mesh, autoRotate: true },
    }
    const { storage } = createMemoryStorage(
      JSON.stringify({ state: staleState, version: 1 }),
    )
    const store = createStudioStore(storage)

    expect(store.getState().character).toEqual({
      country: 'tw',
      year: '2024',
      isTc: true,
    })
    expect(store.getState().mesh).toEqual(initial.mesh)
    expect(store.getState().shader).toEqual({
      selectedPresetId: getDefaultShaderPreset().id,
      currentParams: createDefaultParams(getDefaultShaderPreset()),
    })
  })

  it('persists compact editor choices and excludes loaded SVG or uploaded pattern data', () => {
    const { storage, readPersistedState } = createMemoryStorage()
    const store = createStudioStore(storage)

    store.getState().setSvgData('<svg>large loaded svg</svg>')
    store.getState().setPatternData('data:image/png;base64,large-upload')
    store.getState().setPatternSeed(12)
    store.getState().setBackgroundColor('#101010')

    const persisted = readPersistedState()

    expect(persisted).toHaveProperty('mesh')
    expect(persisted).not.toHaveProperty('displacement')
    expect(persisted).not.toHaveProperty('shader')
    expect(persisted).not.toHaveProperty('morphStack')
    expect(persisted).not.toHaveProperty('surfaceShaders')
    expect(persisted).not.toHaveProperty('shaderLayers')
    expect(persisted).not.toHaveProperty('patternLayers')
    expect(persisted).not.toHaveProperty('postFx')
    expect(persisted).not.toHaveProperty('randomSeed')
    expect(persisted).not.toHaveProperty('svgEffect')
    expect(persisted).not.toHaveProperty('runtime')
    expect(JSON.stringify(persisted)).not.toContain('large-upload')
    expect(persisted.view.backgroundColor).toBe('#101010')
  })

  it('clears session-only uploaded Pattern Layer data when removing the layer', () => {
    const { storage } = createMemoryStorage()
    const store = createStudioStore(storage)
    const layerId = store.getState().patternLayers[0]?.id

    expect(layerId).toBeDefined()

    store.getState().setUploadedPatternLayerData(layerId!, 'data:image/png;base64,large-upload')

    expect(store.getState().runtime.uploadedPatternLayerDataById).toHaveProperty(layerId!, 'data:image/png;base64,large-upload')

    store.getState().removePatternLayer(layerId!)

    expect(store.getState().patternLayers.some((layer) => layer.id === layerId)).toBe(false)
    expect(store.getState().runtime.uploadedPatternLayerDataById).not.toHaveProperty(layerId!)
  })

  it('ignores persisted displacement controls', () => {
    const initial = createInitialStudioStoreState()
    const staleState = {
      ...initial,
      displacement: {
        patternUrl: '/images/patterns/999.jpg',
        strength: 'strong',
        bias: 99,
        subdivisionLevel: 4.8,
      },
    }
    const { storage } = createMemoryStorage(
      JSON.stringify({ state: staleState, version: 1 }),
    )
    const store = createStudioStore(storage)

    expect(store.getState().displacement).toEqual(initial.displacement)
  })

  it('stores stackable Shader Layer rows with lock, order, params, and target', () => {
    const { storage, readPersistedState } = createMemoryStorage()
    const store = createStudioStore(storage)

    expect(store.getState().shaderLayers.layers[0]).toMatchObject({
      target: 'foreground-shader',
      effectId: 'ink-graphite',
      enabled: true,
      intensity: expect.any(Number),
      blendMode: 'normal',
      locked: false,
    })

    store.getState().addShaderLayer({
      target: 'background-shader',
      effectId: 'watercolor-paper',
      intensity: 0.42,
    })

    const addedLayer = store.getState().shaderLayers.layers.at(-1)
    expect(addedLayer).toMatchObject({
      id: 'shader-layer-3',
      target: 'background-shader',
      effectId: 'watercolor-paper',
      intensity: 0.42,
      enabled: true,
      blendMode: 'normal',
    })

    if (!addedLayer) {
      throw new Error('Expected added Shader Layer')
    }

    store.getState().updateShaderLayer(addedLayer.id, {
      params: {
        wash: 0.25,
        grain: 0.4,
      },
    })
    store.getState().setShaderLayerLocked(addedLayer.id, true)
    store.getState().reorderShaderLayer(2, 0)

    expect(store.getState().shaderLayers.layers[0]).toMatchObject({
      id: addedLayer.id,
      locked: true,
      params: {
        wash: 0.25,
        grain: 0.4,
      },
    })
    expect(readPersistedState()).not.toHaveProperty('shaderLayers')
  })
})
