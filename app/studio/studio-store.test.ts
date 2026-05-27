import { describe, expect, it } from 'vitest'
import type { StateStorage } from 'zustand/middleware'

import {
  createInitialStudioStoreState,
  createStudioStore,
  STUDIO_STORE_STORAGE_KEY,
} from './studio-store'
import { createDefaultParams } from '@/shaders/uniforms'
import { getDefaultShaderPreset, getShaderPresetById } from '@/shaders/registry'

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
      autoRotate: false,
    })
    expect(state.displacement.patternUrl).toBe('/images/patterns/000.jpg')
    expect(state.displacement.subdivisionLevel).toBe(0)
    expect(state.view.activePanel).toBe('character')
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
      scale: 1.6,
      autoRotate: true,
    })
    store.getState().setDisplacementControl({ strength: 0.35 })
    store.getState().setBackgroundColor('#202020')
    store.getState().resetMeshControls()

    expect(store.getState().mesh).toEqual(initial.mesh)
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

  it('sanitizes stale persisted shader params without wiping other editor work', () => {
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
    const gridPreset = getShaderPresetById('grid-pulse')

    if (!gridPreset) {
      throw new Error('Expected grid-pulse preset')
    }

    expect(store.getState().character).toEqual({
      country: 'jp',
      year: '2024',
      isTc: true,
    })
    expect(store.getState().mesh.scale).toBe(1.7)
    expect(store.getState().displacement).toMatchObject({
      patternUrl: '/images/patterns/012.jpg',
      strength: 0.4,
      subdivisionLevel: 2,
    })
    expect(store.getState().shader).toEqual({
      selectedPresetId: 'grid-pulse',
      currentParams: {
        ...createDefaultParams(gridPreset),
        pulseSpeed: 2,
      },
    })
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
    expect(store.getState().mesh.autoRotate).toBe(true)
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

    expect(persisted).not.toHaveProperty('svgData')
    expect(persisted).not.toHaveProperty('ptnData')
    expect(persisted).not.toHaveProperty('runtime')
    expect(JSON.stringify(persisted)).not.toContain('large-upload')
    expect(persisted.displacement.patternUrl).toBe('/images/patterns/012.jpg')
    expect(persisted.view.backgroundColor).toBe('#101010')
  })

  it('sanitizes invalid persisted displacement controls', () => {
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

    expect(store.getState().displacement).toEqual({
      patternUrl: '/images/patterns/000.jpg',
      strength: initial.displacement.strength,
      bias: 0.5,
      subdivisionLevel: 2,
    })
  })
})
