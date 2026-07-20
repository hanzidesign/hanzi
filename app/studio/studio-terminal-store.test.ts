import { describe, expect, it } from 'vitest'
import type { StateStorage } from 'zustand/middleware'
import {
  GRAINRAD_EFFECTS,
  isGrainradThemeColorControl,
} from '@/components/studio/grainrad-effects'

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
  it('keeps all 36 Effect color settings independent across dark and light themes', () => {
    const { storage } = createMemoryStorage()
    const store = createStudioStore(storage)
    const colorControls = GRAINRAD_EFFECTS.flatMap((effect) =>
      effect.settingGroups.flatMap((group) =>
        group.controls
          .filter(isGrainradThemeColorControl)
          .map((control) => ({ effectId: effect.id, control })),
      ),
    )
    const lightColors = new Map<string, string>()
    const darkColors = new Map<string, string>()

    expect(colorControls).toHaveLength(36)

    colorControls.forEach(({ effectId, control }, index) => {
      const value = control.kind === 'select'
        ? '2'
        : control.kind === 'text'
          ? '#101010,#555555,#aaaaaa,#f4f1e8'
          : `#${(index + 1).toString(16).padStart(6, '0')}`
      lightColors.set(`${effectId}.${control.id}`, value)
      store.getState().setGrainradEffectControl(effectId, control.id, value)
    })

    store.getState().toggleStudioTheme()

    colorControls.forEach(({ effectId, control }) => {
      expect(store.getState().grainradEffect.controls[effectId][control.id]).toBe(
        control.defaultValueByTheme.light,
      )
    })

    colorControls.forEach(({ effectId, control }, index) => {
      const value = control.kind === 'select'
        ? '1'
        : control.kind === 'text'
          ? '#f4f1e8,#aaaaaa,#555555,#101010'
          : `#${(index + 101).toString(16).padStart(6, '0')}`
      darkColors.set(`${effectId}.${control.id}`, value)
      store.getState().setGrainradEffectControl(effectId, control.id, value)
    })

    store.getState().toggleStudioTheme()

    colorControls.forEach(({ effectId, control }) => {
      expect(store.getState().grainradEffect.controls[effectId][control.id]).toBe(
        lightColors.get(`${effectId}.${control.id}`),
      )
    })

    store.getState().toggleStudioTheme()

    colorControls.forEach(({ effectId, control }) => {
      expect(store.getState().grainradEffect.controls[effectId][control.id]).toBe(
        darkColors.get(`${effectId}.${control.id}`),
      )
    })
  })

  it('switches the complete active control set and preserves independent theme edits', () => {
    const { storage } = createMemoryStorage()
    const store = createStudioStore(storage)

    store.getState().setGrainradEffectControl('ascii', 'foreground', '#123456')
    store.getState().setGrainradEffectControl('ascii', 'scale', 9)
    store.getState().toggleStudioTheme()

    expect(store.getState().view.theme).toBe('light')
    expect(store.getState().grainradEffect.controls.ascii).toMatchObject({
      foreground: '#101010',
      background: '#f4f1e8',
      scale: 4.3,
    })
    expect(store.getState().ascii).toMatchObject({
      foregroundColor: '#101010',
      backgroundColor: '#f4f1e8',
    })

    store.getState().setGrainradEffectControl('ascii', 'foreground', '#abcdef')
    store.getState().setGrainradEffectControl('ascii', 'background', '#010203')
    store.getState().setGrainradEffectControl('ascii', 'scale', 7)
    store.getState().toggleStudioTheme()

    expect(store.getState().view.theme).toBe('dark')
    expect(store.getState().grainradEffect.controls.ascii).toMatchObject({
      foreground: '#123456',
      background: '#101010',
      scale: 9,
    })

    store.getState().toggleStudioTheme()

    expect(store.getState().grainradEffect.controls.ascii).toMatchObject({
      foreground: '#abcdef',
      background: '#010203',
      scale: 7,
    })
  })

  it('stores every Effect control per theme and resets only the active theme', () => {
    const store = createStudioStore()

    for (const effect of GRAINRAD_EFFECTS) {
      expect(Object.keys(store.getState().grainradEffect.controlsByTheme.light[effect.id]).sort())
        .toEqual(Object.keys(store.getState().grainradEffect.controls[effect.id]).sort())
      expect(Object.keys(store.getState().grainradEffect.controlsByTheme.dark[effect.id]).sort())
        .toEqual(Object.keys(store.getState().grainradEffect.controls[effect.id]).sort())
    }

    store.getState().setSelectedEffect('crosshatch')
    store.getState().setGrainradEffectControl('crosshatch', 'density', 8)
    store.getState().setGrainradEffectControl('crosshatch', 'line-width', 0.2)
    store.getState().setGrainradEffectControl('crosshatch', 'brightness', -20)
    store.getState().toggleStudioTheme()

    expect(store.getState().grainradEffect.controls.crosshatch).toMatchObject({
      density: 6,
      'line-width': 0.08,
      brightness: -15,
    })

    store.getState().setGrainradEffectControl('crosshatch', 'density', 10)
    store.getState().setGrainradEffectControl('crosshatch', 'line-width', 0.1)
    store.getState().setGrainradEffectControl('crosshatch', 'brightness', -30)
    store.getState().toggleStudioTheme()

    expect(store.getState().grainradEffect.controls.crosshatch).toMatchObject({
      density: 8,
      'line-width': 0.2,
      brightness: -20,
    })

    store.getState().resetSelectedEffectControls()
    expect(store.getState().grainradEffect.controls.crosshatch).toMatchObject({
      density: 6,
      'line-width': 0.08,
      brightness: -4,
    })

    store.getState().toggleStudioTheme()
    expect(store.getState().grainradEffect.controls.crosshatch).toMatchObject({
      density: 10,
      'line-width': 0.1,
      brightness: -30,
    })
  })

  it('resets only the active theme colors for the selected Effect', () => {
    const { storage } = createMemoryStorage()
    const store = createStudioStore(storage)

    store.getState().setGrainradEffectControl('ascii', 'foreground', '#123456')
    store.getState().toggleStudioTheme()
    store.getState().setGrainradEffectControl('ascii', 'foreground', '#abcdef')
    store.getState().resetSelectedEffectControls()

    expect(store.getState().grainradEffect.controls.ascii.foreground).toBe('#101010')

    store.getState().toggleStudioTheme()

    expect(store.getState().grainradEffect.controls.ascii.foreground).toBe('#123456')
  })

  it('persists both theme color sets and restores the active set after reload', () => {
    const { storage } = createMemoryStorage()
    const store = createStudioStore(storage)

    store.getState().setGrainradEffectControl('crosshatch', 'line-color', '#112233')
    store.getState().toggleStudioTheme()
    store.getState().setGrainradEffectControl('crosshatch', 'line-color', '#ddeeff')

    const reloadedStore = createStudioStore(storage)

    expect(reloadedStore.getState().view.theme).toBe('light')
    expect(reloadedStore.getState().grainradEffect.controls.crosshatch['line-color']).toBe('#ddeeff')

    reloadedStore.getState().toggleStudioTheme()

    expect(reloadedStore.getState().grainradEffect.controls.crosshatch['line-color']).toBe('#112233')
  })

  it('migrates legacy colors into the active theme without overwriting the other defaults', () => {
    const base = createInitialStudioStoreState()
    const legacyState = {
      ...base,
      view: { ...base.view, theme: 'dark' },
      ascii: {
        ...base.ascii,
        foregroundColor: '#abcdef',
        backgroundColor: '#010203',
      },
      grainradEffect: {
        selectedEffectId: 'ascii',
        controls: base.grainradEffect.controls,
      },
    }
    const { storage } = createMemoryStorage(JSON.stringify({ state: legacyState, version: 2 }))
    const store = createStudioStore(storage)

    expect(store.getState().grainradEffect.controls.ascii).toMatchObject({
      foreground: '#abcdef',
      background: '#010203',
    })

    store.getState().toggleStudioTheme()

    expect(store.getState().grainradEffect.controls.ascii).toMatchObject({
      foreground: '#101010',
      background: '#f4f1e8',
    })
  })

  it('migrates corrected Matrix, Blockify, and Noise Field roles from version 3', () => {
    const base = createInitialStudioStoreState()
    const legacyMatrixControls = Object.fromEntries(
      Object.entries(base.grainradEffect.controls['matrix-rain'])
        .filter(([controlId]) => controlId !== 'foreground'),
    )
    const legacyBlockifyControls = Object.fromEntries(
      Object.entries(base.grainradEffect.controls.blockify)
        .filter(([controlId]) => controlId !== 'foreground' && controlId !== 'background'),
    )
    const makeLegacyThemeColors = (theme: 'light' | 'dark') => {
      const themeColors = base.grainradEffect.controlsByTheme[theme]
      const matrixRain = Object.fromEntries(
        Object.entries(themeColors['matrix-rain'])
          .filter(([controlId]) => controlId !== 'foreground'),
      )
      const blockify = Object.fromEntries(
        Object.entries(themeColors.blockify)
          .filter(([controlId]) => controlId !== 'foreground' && controlId !== 'background'),
      )

      return {
        ...themeColors,
        'matrix-rain': {
          ...matrixRain,
          'model-color': theme === 'light' ? '#111111' : '#222222',
        },
        blockify: {
          ...blockify,
          'border-color': theme === 'light' ? '#333333' : '#444444',
        },
      }
    }
    const legacyState = {
      ...base,
      grainradEffect: {
        ...base.grainradEffect,
        controls: {
          ...base.grainradEffect.controls,
          'matrix-rain': { ...legacyMatrixControls, 'model-color': '#222222' },
          blockify: { ...legacyBlockifyControls, 'border-color': '#444444' },
          'noise-field': {
            ...base.grainradEffect.controls['noise-field'],
            'distort-only': false,
          },
        },
        colorControlsByTheme: {
          light: makeLegacyThemeColors('light'),
          dark: makeLegacyThemeColors('dark'),
        },
      },
    }
    const { storage } = createMemoryStorage(JSON.stringify({ state: legacyState, version: 3 }))
    const store = createStudioStore(storage)

    expect(store.getState().grainradEffect.controls['matrix-rain'].foreground).toBe('#222222')
    expect(store.getState().grainradEffect.controls.blockify.foreground).toBe('#444444')
    expect(store.getState().grainradEffect.controls.blockify.background).toBe('#101010')
    expect(store.getState().grainradEffect.controls['noise-field']['distort-only']).toBe(true)

    store.getState().toggleStudioTheme()
    expect(store.getState().grainradEffect.controls['matrix-rain'].foreground).toBe('#111111')
    expect(store.getState().grainradEffect.controls.blockify.foreground).toBe('#333333')
    expect(store.getState().grainradEffect.controls.blockify.background).toBe('#f4f1e8')
  })

  it('migrates the former Matrix Brightness Map default to the neutral value', () => {
    const base = createInitialStudioStoreState()
    const persistedState = {
      ...base,
      grainradEffect: {
        ...base.grainradEffect,
        controls: {
          ...base.grainradEffect.controls,
          'matrix-rain': {
            ...base.grainradEffect.controls['matrix-rain'],
            'brightness-map': 3,
          },
        },
      },
    }
    const { storage } = createMemoryStorage(JSON.stringify({ state: persistedState, version: 4 }))
    const store = createStudioStore(storage)

    expect(store.getState().grainradEffect.controls['matrix-rain']['brightness-map']).toBe(1)
  })

  it('migrates the former Light Matrix color and Rain Opacity defaults', () => {
    const base = createInitialStudioStoreState()
    const persistedState = {
      ...base,
      view: { ...base.view, theme: 'light' },
      grainradEffect: {
        ...base.grainradEffect,
        controls: {
          ...base.grainradEffect.controls,
          'matrix-rain': {
            ...base.grainradEffect.controls['matrix-rain'],
            foreground: '#101010',
            'bg-opacity': 0.3,
          },
        },
        colorControlsByTheme: {
          ...base.grainradEffect.controlsByTheme,
          light: {
            ...base.grainradEffect.controlsByTheme.light,
            'matrix-rain': {
              ...base.grainradEffect.controlsByTheme.light['matrix-rain'],
              foreground: '#101010',
            },
          },
        },
      },
    }
    const { storage } = createMemoryStorage(JSON.stringify({ state: persistedState, version: 5 }))
    const store = createStudioStore(storage)

    expect(store.getState().grainradEffect.controls['matrix-rain']).toMatchObject({
      foreground: '#10da14',
      'bg-opacity': 0.5,
    })
    expect(store.getState().grainradEffect.controlsByTheme.light['matrix-rain'].foreground)
      .toBe('#10da14')
  })

  it('migrates former Matrix theme defaults without replacing custom colors', () => {
    const base = createInitialStudioStoreState()
    const persistedState = {
      ...base,
      grainradEffect: {
        ...base.grainradEffect,
        controlsByTheme: {
          light: {
            ...base.grainradEffect.controlsByTheme.light,
            'matrix-rain': {
              ...base.grainradEffect.controlsByTheme.light['matrix-rain'],
              foreground: '#15c15d',
              'rain-color': '#007a33',
            },
          },
          dark: {
            ...base.grainradEffect.controlsByTheme.dark,
            'matrix-rain': {
              ...base.grainradEffect.controlsByTheme.dark['matrix-rain'],
              foreground: '#f4f1e8',
            },
          },
        },
      },
    }
    const { storage } = createMemoryStorage(JSON.stringify({ state: persistedState, version: 7 }))
    const store = createStudioStore(storage)

    expect(store.getState().grainradEffect.controlsByTheme.light['matrix-rain']).toMatchObject({
      foreground: '#10da14',
      'rain-color': '#24ee20',
    })
    expect(store.getState().grainradEffect.controlsByTheme.dark['matrix-rain']).toMatchObject({
      foreground: '#36d00b',
      'rain-color': '#00ff00',
    })

    const customState = {
      ...persistedState,
      grainradEffect: {
        ...persistedState.grainradEffect,
        controlsByTheme: {
          light: {
            ...persistedState.grainradEffect.controlsByTheme.light,
            'matrix-rain': {
              ...persistedState.grainradEffect.controlsByTheme.light['matrix-rain'],
              foreground: '#123456',
              'rain-color': '#234567',
            },
          },
          dark: {
            ...persistedState.grainradEffect.controlsByTheme.dark,
            'matrix-rain': {
              ...persistedState.grainradEffect.controlsByTheme.dark['matrix-rain'],
              foreground: '#345678',
            },
          },
        },
      },
    }
    const { storage: customStorage } = createMemoryStorage(JSON.stringify({ state: customState, version: 7 }))
    const customStore = createStudioStore(customStorage)

    expect(customStore.getState().grainradEffect.controlsByTheme.light['matrix-rain']).toMatchObject({
      foreground: '#123456',
      'rain-color': '#234567',
    })
    expect(customStore.getState().grainradEffect.controlsByTheme.dark['matrix-rain'].foreground)
      .toBe('#345678')
  })

  it('migrates legacy single-set controls into only the active theme', () => {
    const base = createInitialStudioStoreState()
    const { controlsByTheme, ...legacyGrainradEffect } = base.grainradEffect
    expect(controlsByTheme).toBeDefined()
    const legacyColors = (theme: 'light' | 'dark') => Object.fromEntries(
      GRAINRAD_EFFECTS.map((effect) => {
        const colorIds = effect.settingGroups
          .flatMap((group) => group.controls)
          .filter(isGrainradThemeColorControl)
          .map((control) => control.id)
        return [effect.id, Object.fromEntries(
          colorIds.map((controlId) => [
            controlId,
            base.grainradEffect.controlsByTheme[theme][effect.id][controlId],
          ]),
        )]
      }),
    )
    const persistedState = {
      ...base,
      view: { ...base.view, theme: 'dark' as const },
      grainradEffect: {
        ...legacyGrainradEffect,
        controls: {
          ...legacyGrainradEffect.controls,
          crosshatch: {
            ...legacyGrainradEffect.controls.crosshatch,
            density: 9,
            'line-width': 0.15,
            brightness: 0,
          },
        },
        colorControlsByTheme: {
          light: legacyColors('light'),
          dark: legacyColors('dark'),
        },
      },
    }
    const { storage } = createMemoryStorage(JSON.stringify({ state: persistedState, version: 6 }))
    const store = createStudioStore(storage)

    expect(store.getState().grainradEffect.controls.crosshatch).toMatchObject({
      density: 9,
      'line-width': 0.08,
      brightness: -4,
    })

    store.getState().toggleStudioTheme()
    expect(store.getState().grainradEffect.controls.crosshatch).toMatchObject({
      density: 6,
      'line-width': 0.08,
      brightness: -15,
    })
  })

  it('uses the current Matrix visibility defaults through Light theme and Reset', () => {
    const store = createStudioStore()

    store.getState().setSelectedEffect('matrix-rain')
    store.getState().toggleStudioTheme()

    expect(store.getState().grainradEffect.controls['matrix-rain']).toMatchObject({
      foreground: '#10da14',
      'rain-color': '#24ee20',
      'bg-opacity': 0.5,
    })

    store.getState().setGrainradEffectControl('matrix-rain', 'foreground', '#123456')
    store.getState().setGrainradEffectControl('matrix-rain', 'bg-opacity', 0.2)
    store.getState().resetSelectedEffectControls()

    expect(store.getState().grainradEffect.controls['matrix-rain']).toMatchObject({
      foreground: '#10da14',
      'rain-color': '#24ee20',
      'bg-opacity': 0.5,
    })
  })

  it('starts with an effect-scoped storage key and dark Studio theme', () => {
    const initial = createInitialStudioStoreState()

    expect(STUDIO_STORE_STORAGE_KEY).toBe('hanzi-studio-grainrad-effects-v1')
    expect(initial.grainradEffect.controls.ascii['color-mode']).toBe('mono')
    expect(initial.view.theme).toBe('dark')
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
    store.getState().setExportFormat('apng')

    const persisted = readPersistedState()

    expect(persisted).toMatchObject({
      character: store.getState().character,
      ascii: store.getState().ascii,
      mesh: store.getState().mesh,
      rendererMode: store.getState().rendererMode,
      view: store.getState().view,
      export: store.getState().export,
    })
    expect(persisted.export).toMatchObject({ selectedFormat: 'apng' })
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
      bend: -360,
    })
    expect(store.getState().grainradEffect.controls.halftone).toMatchObject({
      shape: 'circle',
      'dot-scale': 2,
      spacing: 1,
      angle: 90,
      invert: false,
      brightness: 100,
      contrast: -100,
      'color-mode': 'mono',
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
      glow: 4,
      'bg-opacity': 0,
      brightness: 100,
      contrast: -100,
      threshold: 0.5,
      'rain-color': '#00ff00',
      background: '#000000',
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
      'color-mode': 'mono',
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

  it('sanitizes persisted Contour controls and resets only Contour', () => {
    const base = createInitialStudioStoreState()
    const persistedState = {
      ...base,
      mesh: { ...base.mesh, twist: 55 },
      grainradEffect: {
        ...base.grainradEffect,
        selectedEffectId: 'contour',
        controls: {
          ...base.grainradEffect.controls,
          ascii: { ...base.grainradEffect.controls.ascii, scale: 9 },
          dots: { ...base.grainradEffect.controls.dots, size: 1.8 },
          contour: {
            ...base.grainradEffect.controls.contour,
            'fill-mode': 'edges',
            levels: 99,
            'line-thickness': -4,
            invert: 'yes',
            brightness: 999,
            contrast: -999,
            'color-mode': 'mono',
            'line-color': 'black',
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

    expect(store.getState().grainradEffect.controls.contour).toMatchObject({
      'fill-mode': 'filled',
      levels: 20,
      'line-thickness': 0.5,
      invert: false,
      brightness: 100,
      contrast: -100,
      'color-mode': 'mono',
      'line-color': '#ffffff',
      background: '#123456',
    })

    store.getState().setGrainradEffectControl('contour', 'levels', 12)
    store.getState().resetSelectedEffectControls()

    expect(store.getState().grainradEffect.controls.contour).toMatchObject({
      'fill-mode': 'filled',
      levels: 8,
      'line-thickness': 1,
      invert: false,
      brightness: 0,
      contrast: 0,
      'color-mode': 'mono',
      'line-color': '#ffffff',
      background: '#000000',
    })
    expect(store.getState().grainradEffect.controls.ascii.scale).toBe(9)
    expect(store.getState().grainradEffect.controls.dots.size).toBe(1.8)
    expect(store.getState().mesh.twist).toBe(55)
  })

  it('sanitizes persisted Pixel Sort controls and resets only Pixel Sort', () => {
    const base = createInitialStudioStoreState()
    const persistedState = {
      ...base,
      mesh: { ...base.mesh, twist: 65 },
      grainradEffect: {
        ...base.grainradEffect,
        selectedEffectId: 'pixel-sort',
        controls: {
          ...base.grainradEffect.controls,
          ascii: { ...base.grainradEffect.controls.ascii, scale: 9 },
          contour: { ...base.grainradEffect.controls.contour, levels: 12 },
          'pixel-sort': {
            ...base.grainradEffect.controls['pixel-sort'],
            direction: 'radial',
            'sort-mode': 'black',
            threshold: 9,
            'streak-length': -1,
            intensity: 9,
            randomness: -4,
            reverse: 'yes',
            brightness: 999,
            contrast: -999,
          },
        },
      },
    }
    const { storage } = createMemoryStorage(JSON.stringify({
      state: persistedState,
      version: 2,
    }))
    const store = createStudioStore(storage)

    expect(store.getState().grainradEffect.controls['pixel-sort']).toMatchObject({
      direction: 'horizontal',
      'sort-mode': 'hue',
      threshold: 0.5,
      'streak-length': 10,
      intensity: 1,
      randomness: 0,
      reverse: false,
      brightness: 100,
      contrast: -100,
    })

    store.getState().setGrainradEffectControl('pixel-sort', 'direction', 'diagonal')
    store.getState().resetSelectedEffectControls()

    expect(store.getState().grainradEffect.controls['pixel-sort']).toMatchObject({
      direction: 'horizontal',
      'sort-mode': 'hue',
      threshold: 0.25,
      'streak-length': 100,
      intensity: 0.8,
      randomness: 0.3,
      reverse: false,
      brightness: 0,
      contrast: 0,
    })
    expect(store.getState().grainradEffect.controls.ascii.scale).toBe(9)
    expect(store.getState().grainradEffect.controls.contour.levels).toBe(12)
    expect(store.getState().mesh.twist).toBe(65)
  })

  it('sanitizes persisted Blockify controls and resets only Blockify', () => {
    const base = createInitialStudioStoreState()
    const persistedState = {
      ...base,
      mesh: { ...base.mesh, bend: 45 },
      grainradEffect: {
        ...base.grainradEffect,
        selectedEffectId: 'blockify',
        controls: {
          ...base.grainradEffect.controls,
          ascii: { ...base.grainradEffect.controls.ascii, scale: 9 },
          'pixel-sort': { ...base.grainradEffect.controls['pixel-sort'], threshold: 0.4 },
          blockify: {
            ...base.grainradEffect.controls.blockify,
            style: 'tiles',
            'block-size': 99,
            'border-width': -4,
            brightness: 999,
            contrast: -999,
            'color-mode': 'mono',
            'border-color': 'black',
          },
        },
      },
    }
    const { storage } = createMemoryStorage(JSON.stringify({
      state: persistedState,
      version: 2,
    }))
    const store = createStudioStore(storage)

    expect(store.getState().grainradEffect.controls.blockify).toMatchObject({
      style: 'full',
      'block-size': 20,
      'border-width': 0,
      brightness: 100,
      contrast: -100,
      'color-mode': 'mono',
      foreground: '#f4f1e8',
      background: '#101010',
    })

    store.getState().setGrainradEffectControl('blockify', 'style', 'outline')
    store.getState().resetSelectedEffectControls()

    expect(store.getState().grainradEffect.controls.blockify).toMatchObject({
      style: 'full',
      'block-size': 8,
      'border-width': 1,
      brightness: 0,
      contrast: 0,
      'color-mode': 'mono',
      foreground: '#f4f1e8',
      background: '#101010',
    })
    expect(store.getState().grainradEffect.controls.ascii.scale).toBe(9)
    expect(store.getState().grainradEffect.controls['pixel-sort'].threshold).toBe(0.4)
    expect(store.getState().mesh.bend).toBe(45)
  })

  it('sanitizes persisted Threshold controls and resets only Threshold', () => {
    const base = createInitialStudioStoreState()
    const persistedState = {
      ...base,
      mesh: { ...base.mesh, taper: 0.4 },
      grainradEffect: {
        ...base.grainradEffect,
        selectedEffectId: 'threshold',
        controls: {
          ...base.grainradEffect.controls,
          ascii: { ...base.grainradEffect.controls.ascii, scale: 9 },
          blockify: { ...base.grainradEffect.controls.blockify, 'block-size': 16 },
          threshold: {
            ...base.grainradEffect.controls.threshold,
            levels: 99,
            'threshold-point': -1,
            dither: 'yes',
            invert: 'yes',
            brightness: 999,
            contrast: -999,
            'color-mode': 'mono',
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

    expect(store.getState().grainradEffect.controls.threshold).toMatchObject({
      levels: 8,
      'threshold-point': 0.1,
      dither: false,
      invert: false,
      brightness: 100,
      contrast: -100,
      'color-mode': 'mono',
      foreground: '#ffffff',
      background: '#123456',
    })

    store.getState().setGrainradEffectControl('threshold', 'levels', 6)
    store.getState().resetSelectedEffectControls()

    expect(store.getState().grainradEffect.controls.threshold).toMatchObject({
      levels: 2,
      'threshold-point': 0.5,
      dither: false,
      invert: false,
      brightness: 0,
      contrast: 0,
      'color-mode': 'mono',
      foreground: '#ffffff',
      background: '#000000',
    })
    expect(store.getState().grainradEffect.controls.ascii.scale).toBe(9)
    expect(store.getState().grainradEffect.controls.blockify['block-size']).toBe(16)
    expect(store.getState().mesh.taper).toBe(0.4)
  })

  it('sanitizes persisted Edge Detection controls and resets only Edge Detection', () => {
    const base = createInitialStudioStoreState()
    const persistedState = {
      ...base,
      mesh: { ...base.mesh, bevel: 0.08 },
      grainradEffect: {
        ...base.grainradEffect,
        selectedEffectId: 'edge-detection',
        controls: {
          ...base.grainradEffect.controls,
          ascii: { ...base.grainradEffect.controls.ascii, scale: 9 },
          threshold: { ...base.grainradEffect.controls.threshold, levels: 6 },
          'edge-detection': {
            ...base.grainradEffect.controls['edge-detection'],
            algorithm: 'canny',
            threshold: 9,
            'line-width': -2,
            invert: 'yes',
            brightness: 999,
            contrast: -999,
            'color-mode': 'mono',
            'edge-color': 'white',
            background: '#123456',
          },
        },
      },
    }
    const { storage } = createMemoryStorage(JSON.stringify({ state: persistedState, version: 2 }))
    const store = createStudioStore(storage)

    expect(store.getState().grainradEffect.controls['edge-detection']).toMatchObject({
      algorithm: 'sobel',
      threshold: 0.8,
      'line-width': 0.5,
      invert: false,
      brightness: 100,
      contrast: -100,
      'color-mode': 'mono',
      'edge-color': '#ffffff',
      background: '#123456',
    })

    store.getState().setGrainradEffectControl('edge-detection', 'algorithm', 'laplacian')
    store.getState().resetSelectedEffectControls()

    expect(store.getState().grainradEffect.controls['edge-detection']).toMatchObject({
      algorithm: 'sobel',
      threshold: 0.3,
      'line-width': 1,
      invert: false,
      brightness: 0,
      contrast: 0,
      'color-mode': 'mono',
      'edge-color': '#ffffff',
      background: '#000000',
    })
    expect(store.getState().grainradEffect.controls.ascii.scale).toBe(9)
    expect(store.getState().grainradEffect.controls.threshold.levels).toBe(6)
    expect(store.getState().mesh.bevel).toBe(0.08)
  })

  it('keeps Crosshatch width in physical units while clamping invalid values and resetting only Crosshatch', () => {
    const base = createInitialStudioStoreState()
    const persistedState = {
      ...base,
      mesh: { ...base.mesh, thickness: 0.12 },
      grainradEffect: {
        ...base.grainradEffect,
        selectedEffectId: 'crosshatch',
        controls: {
          ...base.grainradEffect.controls,
          threshold: { ...base.grainradEffect.controls.threshold, levels: 6 },
          crosshatch: {
            ...base.grainradEffect.controls.crosshatch,
            density: 99,
            layers: -2,
            angle: 999,
            'line-width': 0.15,
            randomness: 9,
            invert: 'yes',
            brightness: 999,
            contrast: -999,
            'line-color': 'black',
            background: '#123456',
          },
        },
      },
    }
    const { storage } = createMemoryStorage(JSON.stringify({ state: persistedState, version: 2 }))
    const store = createStudioStore(storage)

    expect(store.getState().grainradEffect.controls.crosshatch).toMatchObject({
      density: 12,
      layers: 1,
      angle: 90,
      'line-width': 0.08,
      randomness: 1,
      invert: false,
      brightness: 100,
      contrast: -100,
      'line-color': '#ffffff',
      background: '#123456',
    })

    store.getState().setGrainradEffectControl('crosshatch', 'line-width', 0.2)
    expect(store.getState().grainradEffect.controls.crosshatch['line-width']).toBe(0.2)
    store.getState().resetSelectedEffectControls()

    expect(store.getState().grainradEffect.controls.crosshatch).toMatchObject({
      density: 6,
      layers: 3,
      angle: 45,
      'line-width': 0.08,
      randomness: 0,
      invert: false,
      brightness: -4,
      contrast: 0,
      'line-color': '#ffffff',
      background: '#000000',
    })
    expect(store.getState().grainradEffect.controls.threshold.levels).toBe(6)
    expect(store.getState().mesh.thickness).toBe(0.12)
  })

  it('preserves Wave Lines production thickness 0.4 while sanitizing and resetting only Wave Lines', () => {
    const base = createInitialStudioStoreState()
    const persistedState = {
      ...base,
      mesh: { ...base.mesh, bend: 0.2 },
      grainradEffect: {
        ...base.grainradEffect,
        selectedEffectId: 'wave-lines' as const,
        controls: {
          ...base.grainradEffect.controls,
          threshold: { ...base.grainradEffect.controls.threshold, levels: 6 },
          'wave-lines': {
            ...base.grainradEffect.controls['wave-lines'],
            'line-count': 999,
            amplitude: -9,
            frequency: 99,
            'line-thickness': 0.4,
            direction: 'diagonal',
            animate: 'yes',
            brightness: 999,
            contrast: -999,
            'color-mode': 'custom',
            'line-color': 'white',
            background: '#123456',
          },
        },
      },
    }
    const { storage } = createMemoryStorage(JSON.stringify({ state: persistedState, version: 2 }))
    const store = createStudioStore(storage)

    expect(store.getState().grainradEffect.controls['wave-lines']).toMatchObject({
      'line-count': 150,
      amplitude: 5,
      frequency: 3,
      'line-thickness': 0.4,
      direction: 'horizontal',
      animate: true,
      brightness: 100,
      contrast: -100,
      'color-mode': 'mono',
      'line-color': '#ffffff',
      background: '#123456',
    })

    store.getState().setGrainradEffectControl('wave-lines', 'line-thickness', 0.45)
    expect(store.getState().grainradEffect.controls['wave-lines']['line-thickness']).toBe(0.5)
    store.getState().resetSelectedEffectControls()

    expect(store.getState().grainradEffect.controls['wave-lines']).toMatchObject({
      'line-count': 50,
      amplitude: 20,
      frequency: 1,
      'line-thickness': 0.4,
      direction: 'horizontal',
      animate: true,
      brightness: 0,
      contrast: 0,
      'color-mode': 'mono',
      'line-color': '#ffffff',
      background: '#000000',
    })
    expect(store.getState().grainradEffect.controls.threshold.levels).toBe(6)
    expect(store.getState().mesh.bend).toBe(0.2)
  })

  it('sanitizes persisted Noise Field controls and resets only Noise Field', () => {
    const base = createInitialStudioStoreState()
    const persistedState = {
      ...base,
      mesh: { ...base.mesh, twist: 0.2 },
      grainradEffect: {
        ...base.grainradEffect,
        selectedEffectId: 'noise-field' as const,
        controls: {
          ...base.grainradEffect.controls,
          threshold: { ...base.grainradEffect.controls.threshold, levels: 6 },
          'noise-field': {
            ...base.grainradEffect.controls['noise-field'],
            'noise-type': 'cellular',
            scale: 999,
            intensity: -5,
            octaves: 99,
            speed: -1,
            animate: 'yes',
            'distort-only': true,
            brightness: 999,
            contrast: -999,
          },
        },
      },
    }
    const { storage } = createMemoryStorage(JSON.stringify({ state: persistedState, version: 2 }))
    const store = createStudioStore(storage)

    expect(store.getState().grainradEffect.controls['noise-field']).toMatchObject({
      'noise-type': 'perlin', scale: 100, intensity: 0.5, octaves: 8, speed: 0.1,
      animate: true, 'distort-only': true, brightness: 100, contrast: -100,
    })

    store.getState().setGrainradEffectControl('noise-field', 'noise-type', 'simplex')
    store.getState().resetSelectedEffectControls()

    expect(store.getState().grainradEffect.controls['noise-field']).toMatchObject({
      'noise-type': 'perlin', scale: 50, intensity: 1, octaves: 4, speed: 1,
      animate: true, 'distort-only': true, brightness: 0, contrast: 0,
    })
    expect(store.getState().grainradEffect.controls.threshold.levels).toBe(6)
    expect(store.getState().mesh.twist).toBe(0.2)
  })

  it('sanitizes persisted Voronoi controls and resets only Voronoi', () => {
    const base = createInitialStudioStoreState()
    const persistedState = {
      ...base,
      mesh: { ...base.mesh, taper: 0.2 },
      grainradEffect: {
        ...base.grainradEffect,
        selectedEffectId: 'voronoi' as const,
        controls: {
          ...base.grainradEffect.controls,
          threshold: { ...base.grainradEffect.controls.threshold, levels: 6 },
          voronoi: {
            ...base.grainradEffect.controls.voronoi,
            'cell-size': 999,
            'edge-width': -1,
            'edge-color': 'black',
            'fill-canvas': 'yes',
            randomize: 9,
            brightness: 999,
            contrast: -999,
          },
        },
      },
    }
    const { storage } = createMemoryStorage(JSON.stringify({ state: persistedState, version: 2 }))
    const store = createStudioStore(storage)

    expect(store.getState().grainradEffect.controls.voronoi).toMatchObject({
      'cell-size': 100, 'edge-width': 0, 'edge-color': '#f4f1e8', 'fill-canvas': false,
      randomize: 1, brightness: 100, contrast: -100,
    })

    store.getState().setGrainradEffectControl('voronoi', 'edge-color', '#123456')
    store.getState().setGrainradEffectControl('voronoi', 'fill-canvas', true)
    store.getState().resetSelectedEffectControls()

    expect(store.getState().grainradEffect.controls.voronoi).toMatchObject({
      'cell-size': 30, 'edge-width': 0.3, 'edge-color': '#f4f1e8', 'fill-canvas': false,
      randomize: 0.8, brightness: 0, contrast: 0,
    })
    expect(store.getState().grainradEffect.controls.threshold.levels).toBe(6)
    expect(store.getState().mesh.taper).toBe(0.2)
  })

  it('keeps numeric VHS Scanlines independent from boolean Post Scanlines across persistence and reset', () => {
    const base = createInitialStudioStoreState()
    const persistedState = {
      ...base,
      mesh: { ...base.mesh, bevel: 0.08 },
      grainradEffect: {
        ...base.grainradEffect,
        selectedEffectId: 'vhs' as const,
        controls: {
          ...base.grainradEffect.controls,
          threshold: { ...base.grainradEffect.controls.threshold, levels: 6 },
          vhs: {
            ...base.grainradEffect.controls.vhs,
            distortion: 99,
            noise: -1,
            'color-bleed': 2,
            'vhs-scanlines': 0.65,
            'tracking-error': -1,
            brightness: 999,
            contrast: -999,
            scanlines: true,
          },
        },
      },
    }
    const { storage } = createMemoryStorage(JSON.stringify({ state: persistedState, version: 2 }))
    const store = createStudioStore(storage)

    expect(store.getState().grainradEffect.controls.vhs).toMatchObject({
      distortion: 1,
      noise: 0,
      'color-bleed': 1,
      'vhs-scanlines': 0.65,
      'tracking-error': 0,
      brightness: 100,
      contrast: -100,
      scanlines: true,
    })

    store.getState().setGrainradEffectControl('vhs', 'vhs-scanlines', 0.45)
    store.getState().setGrainradEffectControl('vhs', 'scanlines', false)
    expect(store.getState().grainradEffect.controls.vhs['vhs-scanlines']).toBe(0.45)
    expect(store.getState().grainradEffect.controls.vhs.scanlines).toBe(false)
    store.getState().resetSelectedEffectControls()

    expect(store.getState().grainradEffect.controls.vhs).toMatchObject({
      distortion: 0.5,
      noise: 0.3,
      'color-bleed': 0.5,
      'vhs-scanlines': 0.3,
      'tracking-error': 0.2,
      brightness: 0,
      contrast: 0,
      scanlines: false,
    })
    expect(store.getState().grainradEffect.controls.threshold.levels).toBe(6)
    expect(store.getState().mesh.bevel).toBe(0.08)
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
