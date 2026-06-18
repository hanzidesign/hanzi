import { describe, expect, it } from 'vitest'
import type { StateStorage } from 'zustand/middleware'

import {
  STUDIO_STORE_STORAGE_KEY,
  createInitialStudioStoreState,
  createStudioStore,
} from './studio-store'

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

describe('Phase 5D Grainrad terminal Studio store', () => {
  it('starts with a clean ASCII-only storage key and light Studio theme', () => {
    const initial = createInitialStudioStoreState()

    expect(STUDIO_STORE_STORAGE_KEY).toBe('hanzi-studio-grainrad-ascii-v1')
    expect(initial.grainradEffect.controls.ascii['color-mode']).toBe('mono')
    expect(initial.view.theme).toBe('light')
    expect(initial.view.mobileTab).toBe('input')
    expect(initial.view.settingsOpen).toBe(false)
    expect(initial.view.expandedSections).toMatchObject({
      input: true,
      effects: true,
      settings: true,
      export: true,
    })
    expect(initial.export.selectedFormat).toBe('png')
  })

  it('persists only active Character, ASCII, view, mesh, renderer, and export choices', () => {
    const { storage, readPersistedState } = createMemoryStorage()
    const store = createStudioStore(storage)

    store.getState().setStudioTheme('dark')
    store.getState().setMobileTab('export')
    store.getState().setSettingsOpen(true)
    store.getState().setAsciiControl({ cellSize: 20, palette: 'noir' })
    store.getState().setMeshControl({ scale: 1.4 })
    store.getState().setExportFormat('png')

    const persisted = readPersistedState()

    expect(persisted).toMatchObject({
      character: store.getState().character,
      ascii: store.getState().ascii,
      mesh: store.getState().mesh,
      rendererMode: store.getState().rendererMode,
      view: store.getState().view,
      export: store.getState().export,
    })
    expect(persisted).not.toHaveProperty('morphStack')
    expect(persisted).not.toHaveProperty('surfaceShaders')
    expect(persisted).not.toHaveProperty('shaderLayers')
    expect(persisted).not.toHaveProperty('patternLayers')
    expect(persisted).not.toHaveProperty('postFx')
    expect(persisted).not.toHaveProperty('randomSeed')
    expect(persisted).not.toHaveProperty('runtime')
    expect(persisted).not.toHaveProperty('svgEffect')
  })

  it('sanitizes stale non-ASCII persisted state without reviving old panels', () => {
    const base = createInitialStudioStoreState()
    const staleState = {
      ...base,
      view: {
        ...base.view,
        theme: 'dark',
        mobileTab: 'shader',
        settingsOpen: 'yes',
      },
      morphStack: { layers: [{ id: 'old' }] },
      shaderLayers: { layers: [{ id: 'old' }] },
      patternLayers: [{ id: 'old' }],
      randomSeed: 99,
      postFx: { layers: [{ id: 'old' }] },
    }
    const { storage } = createMemoryStorage(JSON.stringify({ state: staleState, version: 1 }))
    const store = createStudioStore(storage)

    expect(store.getState().view.theme).toBe('dark')
    expect(store.getState().view.mobileTab).toBe('input')
    expect(store.getState().view.settingsOpen).toBe(false)
    expect(store.getState().morphStack).toEqual(base.morphStack)
    expect(store.getState().shaderLayers).toEqual(base.shaderLayers)
    expect(store.getState().patternLayers).toEqual(base.patternLayers)
    expect(store.getState().randomSeed).toBe(base.randomSeed)
    expect(store.getState().postFx).toEqual(base.postFx)
  })

  it('clamps ASCII Output Width to the visible 0-600 column range', () => {
    const { storage } = createMemoryStorage()
    const store = createStudioStore(storage)

    store.getState().setGrainradEffectControl('ascii', 'output-width', 1200)

    expect(store.getState().grainradEffect.controls.ascii['output-width']).toBe(600)

    store.getState().setGrainradEffectControl('ascii', 'output-width', -1)

    expect(store.getState().grainradEffect.controls.ascii['output-width']).toBe(0)
  })

  it('resets ASCII Color Mode back to mono', () => {
    const { storage } = createMemoryStorage()
    const store = createStudioStore(storage)

    store.getState().setGrainradEffectControl('ascii', 'color-mode', 'original')

    expect(store.getState().grainradEffect.controls.ascii['color-mode']).toBe('original')

    store.getState().resetSelectedEffectControls()

    expect(store.getState().grainradEffect.controls.ascii['color-mode']).toBe('mono')
  })

  it('migrates the old persisted ASCII Color Mode default from original to mono', () => {
    const base = createInitialStudioStoreState()
    const staleState = {
      ...base,
      grainradEffect: {
        ...base.grainradEffect,
        controls: {
          ...base.grainradEffect.controls,
          ascii: {
            ...base.grainradEffect.controls.ascii,
            'color-mode': 'original',
          },
        },
      },
    }
    const { storage } = createMemoryStorage(JSON.stringify({ state: staleState, version: 1 }))
    const store = createStudioStore(storage)

    expect(store.getState().grainradEffect.controls.ascii['color-mode']).toBe('mono')
  })
})
