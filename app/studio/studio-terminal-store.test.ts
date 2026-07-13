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
  it('starts with an effect-scoped storage key and light Studio theme', () => {
    const initial = createInitialStudioStoreState()

    expect(STUDIO_STORE_STORAGE_KEY).toBe('hanzi-studio-grainrad-effects-v1')
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

  it('preserves effect-local values and resets only the selected Effect', () => {
    const { storage } = createMemoryStorage()
    const store = createStudioStore(storage)

    store.getState().setGrainradEffectControl('ascii', 'scale', 9)
    store.getState().setGrainradEffectControl('dithering', 'intensity', 1.75)
    store.getState().setGrainradEffectControl('halftone', 'spacing', 17)
    store.getState().setSelectedEffect('halftone')

    expect(store.getState().grainradEffect.controls.ascii.scale).toBe(9)
    expect(store.getState().grainradEffect.controls.dithering.intensity).toBe(1.75)
    expect(store.getState().grainradEffect.controls.halftone.spacing).toBe(17)

    store.getState().resetSelectedEffectControls()

    expect(store.getState().grainradEffect.controls.ascii.scale).toBe(9)
    expect(store.getState().grainradEffect.controls.dithering.intensity).toBe(1.75)
    expect(store.getState().grainradEffect.controls.halftone.spacing).toBe(8)
  })

  it('sanitizes persisted Halftone and shared Model controls independently', () => {
    const base = createInitialStudioStoreState()
    const persistedState = {
      ...base,
      mesh: {
        ...base.mesh,
        bevel: 2,
        twist: -900,
        taper: 3,
        bend: -400,
      },
      grainradEffect: {
        ...base.grainradEffect,
        selectedEffectId: 'halftone',
        controls: {
          ...base.grainradEffect.controls,
          halftone: {
            ...base.grainradEffect.controls.halftone,
            shape: 'hexagon',
            'dot-scale': 8,
            spacing: 0,
            angle: 180,
            invert: 'yes',
            brightness: 900,
            contrast: -900,
            'color-mode': 'cmyk',
            foreground: 'not-a-color',
            background: '#123456',
          },
        },
      },
    }
    const { storage } = createMemoryStorage(JSON.stringify({
      state: persistedState,
      version: 2,
    }))
    const store = createStudioStore(storage)

    expect(store.getState().mesh).toMatchObject({
      bevel: 0.3,
      twist: -360,
      taper: 0.8,
      bend: -120,
    })
    expect(store.getState().grainradEffect.controls.halftone).toMatchObject({
      shape: 'circle',
      'dot-scale': 2,
      spacing: 1,
      angle: 90,
      invert: false,
      brightness: 100,
      contrast: -100,
      'color-mode': 'bw',
      foreground: '#ffffff',
      background: '#123456',
    })
    expect(store.getState().grainradEffect.controls.ascii).toMatchObject({
      scale: base.grainradEffect.controls.ascii.scale,
      'color-mode': base.grainradEffect.controls.ascii['color-mode'],
    })
    expect(store.getState().grainradEffect.controls.dithering).toMatchObject({
      algorithm: base.grainradEffect.controls.dithering.algorithm,
      intensity: base.grainradEffect.controls.dithering.intensity,
    })
  })

  it('sanitizes persisted Matrix Rain controls and resets only Matrix Rain', () => {
    const base = createInitialStudioStoreState()
    const persistedState = {
      ...base,
      mesh: { ...base.mesh, twist: 45 },
      grainradEffect: {
        ...base.grainradEffect,
        selectedEffectId: 'matrix-rain',
        controls: {
          ...base.grainradEffect.controls,
          ascii: { ...base.grainradEffect.controls.ascii, scale: 9 },
          dithering: { ...base.grainradEffect.controls.dithering, intensity: 1.75 },
          halftone: { ...base.grainradEffect.controls.halftone, spacing: 17 },
          'matrix-rain': {
            ...base.grainradEffect.controls['matrix-rain'],
            'character-set': 'unknown',
            'custom-chars': '雨'.repeat(200),
            'cell-size': 99,
            spacing: -1,
            speed: 8,
            'trail-length': 1,
            direction: 'diagonal',
            glow: 8,
            'bg-opacity': -1,
            brightness: 999,
            contrast: -999,
            threshold: 1,
            'rain-color': 'green',
          },
        },
      },
    }
    const { storage } = createMemoryStorage(JSON.stringify({
      state: persistedState,
      version: 2,
    }))
    const store = createStudioStore(storage)

    expect(store.getState().grainradEffect.controls['matrix-rain']).toMatchObject({
      'character-set': 'standard',
      'cell-size': 32,
      spacing: 0,
      speed: 3,
      'trail-length': 5,
      direction: 'down',
      glow: 2,
      'bg-opacity': 0,
      brightness: 100,
      contrast: -100,
      threshold: 0.5,
      'rain-color': '#00ff00',
    })
    expect(store.getState().grainradEffect.controls['matrix-rain']['custom-chars']).toBe('雨'.repeat(128))

    store.getState().setGrainradEffectControl('matrix-rain', 'cell-size', 20)
    store.getState().resetSelectedEffectControls()

    expect(store.getState().grainradEffect.controls['matrix-rain']['cell-size']).toBe(12)
    expect(store.getState().grainradEffect.controls.ascii.scale).toBe(9)
    expect(store.getState().grainradEffect.controls.dithering.intensity).toBe(1.75)
    expect(store.getState().grainradEffect.controls.halftone.spacing).toBe(17)
    expect(store.getState().mesh.twist).toBe(45)
  })

  it('sanitizes persisted Dots controls and resets only Dots', () => {
    const base = createInitialStudioStoreState()
    const persistedState = {
      ...base,
      mesh: { ...base.mesh, bend: 35 },
      grainradEffect: {
        ...base.grainradEffect,
        selectedEffectId: 'dots',
        controls: {
          ...base.grainradEffect.controls,
          ascii: { ...base.grainradEffect.controls.ascii, scale: 9 },
          'matrix-rain': { ...base.grainradEffect.controls['matrix-rain'], speed: 2.5 },
          dots: {
            ...base.grainradEffect.controls.dots,
            shape: 'star',
            'grid-type': 'triangular',
            size: 10,
            spacing: -4,
            invert: 'yes',
            brightness: 999,
            contrast: -999,
            'color-mode': 'sepia',
            foreground: 'white',
            background: '#123456',
          },
        },
      },
    }
    const { storage } = createMemoryStorage(JSON.stringify({
      state: persistedState,
      version: 2,
    }))
    const store = createStudioStore(storage)

    expect(store.getState().grainradEffect.controls.dots).toMatchObject({
      shape: 'circle',
      'grid-type': 'square',
      size: 2,
      spacing: 0.5,
      invert: false,
      brightness: 100,
      contrast: -100,
      'color-mode': 'original',
      foreground: '#ffffff',
      background: '#123456',
    })

    store.getState().setGrainradEffectControl('dots', 'size', 1.8)
    store.getState().resetSelectedEffectControls()

    expect(store.getState().grainradEffect.controls.dots.size).toBe(1)
    expect(store.getState().grainradEffect.controls.ascii.scale).toBe(9)
    expect(store.getState().grainradEffect.controls['matrix-rain'].speed).toBe(2.5)
    expect(store.getState().mesh.bend).toBe(35)
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
