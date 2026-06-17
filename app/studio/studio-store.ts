import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { chars, toCharUrl, type CharScript } from '@/assets/chars'
import { countries } from '@/assets/list'
import { getMorphLayerDefinitionById } from '@/morph/catalogue'
import { createDefaultMorphParams, sanitizeMorphParams } from '@/morph/params'
import { randomizeMorphStackPreset } from '@/morph/randomize'
import type { MorphParamValues, MorphStackPresetLayerDraft } from '@/morph/types'
import { getDefaultShaderPreset, getShaderPresetById } from '@/shaders/registry'
import type { ShaderParamValue, ShaderParamValues } from '@/shaders/types'
import { createDefaultParams, sanitizeParamsForPreset } from '@/shaders/uniforms'
import { DEFAULT_PATTERN_ASSET_URL, sanitizePatternUrl, toPatternUrl } from '@/utils/patternAssets'
import {
  DEFAULT_GRADIENT_SETTINGS,
  DEFAULT_GRADIENT_STOPS,
  readGradientAngle,
  readGradientType,
  normalizeGradientStops,
  type GradientType,
  type GradientColorStop,
} from '@/components/studio/gradient-stops'

export const STUDIO_STORE_STORAGE_KEY = 'hanzi-studio-character-surface-v2_1_phase3'
export const MAX_PATTERN_LAYERS = 3

const DEFAULT_COUNTRY = 'int'
const DEFAULT_YEAR = '2023'
const DEFAULT_IS_TC = true

export const DEFAULT_EFFECT_STATE = {
  seed: 0,
  distortion: 10,
  blur: 0,
  width: 0,
  x: 0,
  y: 0,
  rotation: 0,
  textColor: '#000',
  panel: '0' as string | null,
}

export const DEFAULT_VIEW_STATE = {
  activePanel: 'character' as StudioActivePanel | null,
  backgroundColor: '#fff',
}

export type StudioActivePanel = 'character' | 'morph' | 'shader' | 'pattern'

export type StudioRendererMode = 'webgl' | 'webgpu-experimental'

export type StudioMorphLayer = {
  id: string
  definitionId: string
  params: MorphParamValues
  enabled: boolean
  collapsed: boolean
  locked: boolean
}

export type StudioSurfaceShaderLayerId = 'foreground' | 'background'

export type StudioSurfaceShaderLayer = {
  color: string
  stylePresetId: string
  params: StudioSurfaceShaderParams
  locked: boolean
}

export type StudioSurfaceShaderParams = {
  gradientStops?: GradientColorStop[]
  gradientType?: GradientType
  gradientAngle?: number
  opacity?: number
} & Record<string, string | number | boolean | GradientColorStop[] | undefined>

export type StudioPatternLayerTarget = 'morph-stack' | 'foreground-shader' | 'background-shader'

export type StudioPatternLayerSource =
  | {
      type: 'built-in'
      patternUrl: string
    }
  | {
      type: 'local-file'
      fileName: string
    }

export type StudioPatternLayer = {
  id: string
  source: StudioPatternLayerSource
  target: StudioPatternLayerTarget
  locked: boolean
}

export const DEFAULT_MESH_STATE = {
  extrusionDepth: 0.18,
  thickness: 0,
  rotation: { x: 0, y: 0, z: 0 },
  scale: 1,
  position: { x: 0, y: 0 },
  autoRotate: false,
  autoRotateSpeed: 0.5,
}

export const MIN_DISPLACEMENT_BIAS = -0.5
export const MAX_DISPLACEMENT_BIAS = 0.5
export const MIN_DISPLACEMENT_SUBDIVISION_LEVEL = 0
export const MAX_DISPLACEMENT_SUBDIVISION_LEVEL = 2

export type StudioCharacterState = {
  country: string
  year: string
  isTc: boolean
}

export type StudioStoreState = {
  character: StudioCharacterState
  shader: {
    selectedPresetId: string
    currentParams: ShaderParamValues
  }
  morphStack: {
    layers: StudioMorphLayer[]
  }
  surfaceShaders: Record<StudioSurfaceShaderLayerId, StudioSurfaceShaderLayer>
  patternLayers: StudioPatternLayer[]
  randomSeed: number
  rendererMode: StudioRendererMode
  mesh: {
    extrusionDepth: number
    thickness: number
    rotation: { x: number; y: number; z: number }
    scale: number
    position: { x: number; y: number }
    autoRotate: boolean
    autoRotateSpeed: number
  }
  displacement: {
    patternUrl: string
    strength: number
    bias: number
    subdivisionLevel: number
  }
  view: {
    activePanel: StudioActivePanel | null
    backgroundColor: string
  }
  svgEffect: typeof DEFAULT_EFFECT_STATE
  runtime: {
    svgData: string
    svgCharacterUrl: string
    svgLoadError: string | null
    ptnData: string
    patternMode: 'source' | 'upload'
    uploadedDisplacementImageData: string
    uploadedPatternLayerDataById: Record<string, string>
  }
}

export type StudioStoreActions = {
  setCharacter: (country: string, year: string, isTc?: boolean) => void
  setSelectedPreset: (presetId: string) => void
  resetParamsForPreset: (presetId?: string) => void
  updateParam: (paramId: string, value: ShaderParamValue) => void
  setMeshControl: (partial: Partial<StudioStoreState['mesh']>) => void
  resetMeshControls: () => void
  setDisplacementControl: (partial: Partial<StudioStoreState['displacement']>) => void
  setUploadedDisplacementImageData: (dataUrl: string) => void
  clearUploadedDisplacementImageData: () => void
  setActivePanel: (activePanel: StudioActivePanel | null) => void
  setBackgroundColor: (backgroundColor: string) => void
  setSvgData: (svgData: string) => void
  setCharacterSvgLoading: (characterUrl: string) => void
  setCharacterSvgData: (characterUrl: string, svgData: string) => void
  setCharacterSvgError: (characterUrl: string, error: string) => void
  setPatternSeed: (seed: number) => void
  setPatternUrl: (patternUrl: string) => void
  setPatternData: (ptnData: string) => void
  setPatternDataForSource: (patternUrl: string, ptnData: string) => void
  setSvgEffectControl: (partial: Partial<typeof DEFAULT_EFFECT_STATE>) => void
  setTextColor: (textColor: string) => void
  setCompatibilityPanel: (panel: string | null) => void
  resetSvgEffect: () => void
  resetStyle: () => void
  replaceMorphStackLayers: (layers: StudioMorphLayer[]) => void
  addMorphLayer: (definitionId?: string) => void
  duplicateMorphLayer: (layerId: string) => void
  removeMorphLayer: (layerId: string) => void
  reorderMorphLayer: (fromIndex: number, toIndex: number) => void
  updateMorphLayerParam: (layerId: string, paramId: string, value: string | number | boolean) => void
  setMorphLayerLocked: (layerId: string, locked: boolean) => void
  randomizeMorphPreset: (options?: { seed?: number; includeExperimental?: boolean }) => void
  setSurfaceShaderLayer: (layerId: StudioSurfaceShaderLayerId, partial: Partial<StudioSurfaceShaderLayer>) => void
  setSurfaceShaderLayerLocked: (layerId: StudioSurfaceShaderLayerId, locked: boolean) => void
  addPatternLayer: (partial?: Partial<StudioPatternLayer>) => void
  removePatternLayer: (layerId: string) => void
  updatePatternLayer: (layerId: string, partial: Partial<StudioPatternLayer>) => void
  setPatternLayerLocked: (layerId: string, locked: boolean) => void
  setUploadedPatternLayerData: (layerId: string, dataUrl: string) => void
  setRendererMode: (rendererMode: StudioRendererMode) => void
}

export type StudioStore = StudioStoreState & StudioStoreActions

type PersistedStudioState = Pick<
  StudioStoreState,
  'character' | 'morphStack' | 'surfaceShaders' | 'patternLayers' | 'randomSeed' | 'rendererMode' | 'view'
>

export const useStudioStore = createStudioStore()

export function createStudioStore(storage?: StateStorage) {
  return create<StudioStore>()(
    persist(
      (set, get) => ({
        ...createInitialStudioStoreState(),
        setCharacter: (country, year, isTc) => {
          const nextCharacter = sanitizeCharacter(
            { country, year, isTc: isTc ?? get().character.isTc },
            get().character
          )

          set({ character: nextCharacter })
        },
        setSelectedPreset: (presetId) => {
          const preset = getShaderPresetById(presetId) ?? getDefaultShaderPreset()

          set({
            shader: {
              selectedPresetId: preset.id,
              currentParams: createDefaultParams(preset),
            },
          })
        },
        resetParamsForPreset: (presetId) => {
          const preset =
            (presetId ? getShaderPresetById(presetId) : undefined) ??
            getShaderPresetById(get().shader.selectedPresetId) ??
            getDefaultShaderPreset()

          set({
            shader: {
              selectedPresetId: preset.id,
              currentParams: createDefaultParams(preset),
            },
          })
        },
        updateParam: (paramId, value) => {
          const preset = getShaderPresetById(get().shader.selectedPresetId) ?? getDefaultShaderPreset()

          if (!preset.params.some((param) => param.id === paramId)) {
            return
          }

          set({
            shader: {
              selectedPresetId: preset.id,
              currentParams: sanitizeParamsForPreset(preset, {
                ...get().shader.currentParams,
                [paramId]: value,
              }),
            },
          })
        },
        setMeshControl: (partial) => {
          set({ mesh: { ...get().mesh, ...partial } })
        },
        resetMeshControls: () => {
          set({ mesh: createDefaultMeshState() })
        },
        setDisplacementControl: (partial) => {
          const nextDisplacement = sanitizeDisplacementState({ ...get().displacement, ...partial }, get().displacement)

          set({
            displacement: nextDisplacement,
            runtime:
              typeof partial.patternUrl === 'string'
                ? { ...get().runtime, uploadedDisplacementImageData: '' }
                : get().runtime,
          })
        },
        setUploadedDisplacementImageData: (dataUrl) => {
          set({
            runtime: {
              ...get().runtime,
              uploadedDisplacementImageData: dataUrl,
            },
          })
        },
        clearUploadedDisplacementImageData: () => {
          set({
            runtime: {
              ...get().runtime,
              uploadedDisplacementImageData: '',
            },
          })
        },
        setActivePanel: (activePanel) => {
          set({
            view: { ...get().view, activePanel },
            svgEffect: {
              ...get().svgEffect,
              panel: panelFromActivePanel(activePanel),
            },
          })
        },
        setBackgroundColor: (backgroundColor) => {
          set({ view: { ...get().view, backgroundColor } })
        },
        setSvgData: (svgData) => {
          set({ runtime: { ...get().runtime, svgData, svgLoadError: null } })
        },
        setCharacterSvgLoading: (characterUrl) => {
          set({
            runtime: {
              ...get().runtime,
              svgData: '',
              svgCharacterUrl: characterUrl,
              svgLoadError: null,
            },
          })
        },
        setCharacterSvgData: (characterUrl, svgData) => {
          const runtime = get().runtime

          if (runtime.svgCharacterUrl !== characterUrl) {
            return
          }

          set({
            runtime: {
              ...runtime,
              svgData,
              svgLoadError: null,
            },
          })
        },
        setCharacterSvgError: (characterUrl, error) => {
          const runtime = get().runtime

          if (runtime.svgCharacterUrl !== characterUrl) {
            return
          }

          set({
            runtime: {
              ...runtime,
              svgData: '',
              svgLoadError: error,
            },
          })
        },
        setPatternSeed: (seed) => {
          const patternUrl = toPatternUrl(seed)

          set({
            displacement: { ...get().displacement, patternUrl },
            svgEffect: { ...get().svgEffect, seed },
            runtime: {
              ...get().runtime,
              ptnData: '',
              patternMode: 'source',
              uploadedDisplacementImageData: '',
            },
          })
        },
        setPatternUrl: (patternUrl) => {
          if (isDataUrl(patternUrl)) {
            set({
              runtime: {
                ...get().runtime,
                ptnData: patternUrl,
                patternMode: 'upload',
              },
            })
            return
          }

          set({
            displacement: {
              ...get().displacement,
              patternUrl: sanitizePatternUrl(patternUrl, get().displacement.patternUrl),
            },
            runtime: {
              ...get().runtime,
              ptnData: '',
              patternMode: 'source',
              uploadedDisplacementImageData: '',
            },
          })
        },
        setPatternData: (ptnData) => {
          set({
            runtime: {
              ...get().runtime,
              ptnData,
              patternMode: 'upload',
            },
          })
        },
        setPatternDataForSource: (patternUrl, ptnData) => {
          const state = get()

          if (state.runtime.patternMode !== 'source' || state.displacement.patternUrl !== patternUrl) {
            return
          }

          set({ runtime: { ...state.runtime, ptnData } })
        },
        setSvgEffectControl: (partial) => {
          set({ svgEffect: { ...get().svgEffect, ...partial } })
        },
        setTextColor: (textColor) => {
          set({ svgEffect: { ...get().svgEffect, textColor } })
        },
        setCompatibilityPanel: (panel) => {
          set({
            svgEffect: { ...get().svgEffect, panel },
            view: {
              ...get().view,
              activePanel: activePanelFromPanel(panel),
            },
          })
        },
        replaceMorphStackLayers: (layers) => {
          set({ morphStack: { layers } })
        },
        addMorphLayer: (definitionId) => {
          const state = get()
          const definition =
            (definitionId ? getMorphLayerDefinitionById(definitionId) : undefined) ?? getDefaultMorphLayerDefinition()

          set({
            morphStack: {
              layers: [
                ...state.morphStack.layers,
                createMorphLayerFromDefinition(definition.id, state.morphStack.layers.length),
              ],
            },
          })
        },
        duplicateMorphLayer: (layerId) => {
          const state = get()
          const sourceLayer = state.morphStack.layers.find((layer) => layer.id === layerId)

          if (!sourceLayer) {
            return
          }

          set({
            morphStack: {
              layers: [
                ...state.morphStack.layers,
                {
                  ...sourceLayer,
                  id: createMorphLayerId(state.morphStack.layers.length),
                  locked: false,
                },
              ],
            },
          })
        },
        removeMorphLayer: (layerId) => {
          set({
            morphStack: {
              layers: get().morphStack.layers.filter((layer) => layer.id !== layerId),
            },
          })
        },
        reorderMorphLayer: (fromIndex, toIndex) => {
          const layers = [...get().morphStack.layers]

          if (fromIndex < 0 || fromIndex >= layers.length || toIndex < 0 || toIndex >= layers.length) {
            return
          }

          const [layer] = layers.splice(fromIndex, 1)

          if (!layer) {
            return
          }

          layers.splice(toIndex, 0, layer)
          set({ morphStack: { layers } })
        },
        updateMorphLayerParam: (layerId, paramId, value) => {
          set({
            morphStack: {
              layers: get().morphStack.layers.map((layer) => {
                if (layer.id !== layerId) {
                  return layer
                }

                const definition = getMorphLayerDefinitionById(layer.definitionId)

                if (!definition) {
                  return layer
                }

                return {
                  ...layer,
                  params: sanitizeMorphParams(definition, {
                    ...layer.params,
                    [paramId]: value,
                  }),
                }
              }),
            },
          })
        },
        setMorphLayerLocked: (layerId, locked) => {
          set({
            morphStack: {
              layers: get().morphStack.layers.map((layer) => (layer.id === layerId ? { ...layer, locked } : layer)),
            },
          })
        },
        randomizeMorphPreset: (options = {}) => {
          const state = get()
          const seed = options.seed ?? state.randomSeed
          const layers = randomizeMorphLayers(state.morphStack.layers, seed, options.includeExperimental)

          set({
            randomSeed: seed,
            morphStack: { layers },
            surfaceShaders: randomizeSurfaceShaderLayers(state.surfaceShaders, seed),
            patternLayers: randomizePatternLayers(state.patternLayers, seed),
          })
        },
        setSurfaceShaderLayer: (layerId, partial) => {
          set({
            surfaceShaders: {
              ...get().surfaceShaders,
              [layerId]: {
                ...get().surfaceShaders[layerId],
                ...sanitizeSurfaceShaderLayerPartial(partial, layerId),
              },
            },
          })
        },
        setSurfaceShaderLayerLocked: (layerId, locked) => {
          set({
            surfaceShaders: {
              ...get().surfaceShaders,
              [layerId]: {
                ...get().surfaceShaders[layerId],
                locked,
              },
            },
          })
        },
        addPatternLayer: (partial = {}) => {
          const patternLayers = get().patternLayers

          if (patternLayers.length >= MAX_PATTERN_LAYERS) {
            return
          }

          set({
            patternLayers: [
              ...patternLayers,
              sanitizePatternLayer(
                {
                  id: createPatternLayerId(patternLayers.length),
                  source: { type: 'built-in', patternUrl: DEFAULT_PATTERN_ASSET_URL },
                  target: 'foreground-shader',
                  locked: false,
                  ...partial,
                },
                patternLayers.length
              ),
            ],
          })
        },
        removePatternLayer: (layerId) => {
          set({
            patternLayers: get().patternLayers.filter((layer) => layer.id !== layerId),
          })
        },
        updatePatternLayer: (layerId, partial) => {
          set({
            patternLayers: get().patternLayers.map((layer, index) =>
              layer.id === layerId ? sanitizePatternLayer({ ...layer, ...partial }, index) : layer
            ),
          })
        },
        setPatternLayerLocked: (layerId, locked) => {
          set({
            patternLayers: get().patternLayers.map((layer) => (layer.id === layerId ? { ...layer, locked } : layer)),
          })
        },
        setUploadedPatternLayerData: (layerId, dataUrl) => {
          set({
            runtime: {
              ...get().runtime,
              uploadedPatternLayerDataById: {
                ...get().runtime.uploadedPatternLayerDataById,
                [layerId]: dataUrl,
              },
            },
          })
        },
        setRendererMode: (rendererMode) => {
          set({ rendererMode })
        },
        resetSvgEffect: () => {
          set({
            svgEffect: {
              ...get().svgEffect,
              distortion: DEFAULT_EFFECT_STATE.distortion,
              blur: DEFAULT_EFFECT_STATE.blur,
              width: DEFAULT_EFFECT_STATE.width,
              x: DEFAULT_EFFECT_STATE.x,
              y: DEFAULT_EFFECT_STATE.y,
              rotation: DEFAULT_EFFECT_STATE.rotation,
            },
          })
        },
        resetStyle: () => {
          set({
            svgEffect: {
              ...get().svgEffect,
              textColor: DEFAULT_EFFECT_STATE.textColor,
            },
            view: {
              ...get().view,
              backgroundColor: DEFAULT_VIEW_STATE.backgroundColor,
            },
          })
        },
      }),
      {
        name: STUDIO_STORE_STORAGE_KEY,
        version: 1,
        storage: createJSONStorage(() => storage ?? localStorage),
        partialize: selectPersistedState,
        merge: (persistedState, currentState) => ({
          ...currentState,
          ...sanitizePersistedState(persistedState),
        }),
      }
    )
  )
}

export function createInitialStudioStoreState(): StudioStoreState {
  const defaultPreset = getDefaultShaderPreset()

  return {
    character: {
      country: DEFAULT_COUNTRY,
      year: DEFAULT_YEAR,
      isTc: DEFAULT_IS_TC,
    },
    shader: {
      selectedPresetId: defaultPreset.id,
      currentParams: createDefaultParams(defaultPreset),
    },
    morphStack: createDefaultMorphStack(0),
    surfaceShaders: createDefaultSurfaceShaders(),
    patternLayers: [],
    randomSeed: 0,
    rendererMode: 'webgl',
    mesh: createDefaultMeshState(),
    displacement: {
      patternUrl: DEFAULT_PATTERN_ASSET_URL,
      strength: 0,
      bias: 0,
      subdivisionLevel: 0,
    },
    view: DEFAULT_VIEW_STATE,
    svgEffect: DEFAULT_EFFECT_STATE,
    runtime: {
      svgData: '',
      svgCharacterUrl: '',
      svgLoadError: null,
      ptnData: '',
      patternMode: 'source',
      uploadedDisplacementImageData: '',
      uploadedPatternLayerDataById: {},
    },
  }
}

export function getCharacterDisplayState(character: StudioCharacterState) {
  const sanitizedCharacter = sanitizeCharacter(character, createInitialStudioStoreState().character)
  const script = toScript(sanitizedCharacter.isTc)
  const ch = chars[script][sanitizedCharacter.country][sanitizedCharacter.year]
  const charUrl = toCharUrl(script, sanitizedCharacter.country, sanitizedCharacter.year)

  return {
    charUrl,
    country: countries[sanitizedCharacter.country],
    year: sanitizedCharacter.year,
    ch,
    isTc: sanitizedCharacter.isTc,
  }
}

export function fallbackSvgData(url: string) {
  return `<image href="${url}" x="0" y="0" width="100%" height="100%" />`
}

function createDefaultMorphStack(seed: number): StudioStoreState['morphStack'] {
  return {
    layers: randomizeMorphStackPreset({ seed }).layers.map((layer, index) => createMorphLayerFromDraft(layer, index)),
  }
}

function createDefaultSurfaceShaders(): StudioStoreState['surfaceShaders'] {
  return {
    foreground: {
      color: '#000000',
      stylePresetId: 'solid',
      params: {
        gradientStops: DEFAULT_GRADIENT_STOPS,
        gradientType: DEFAULT_GRADIENT_SETTINGS.gradientType,
        gradientAngle: DEFAULT_GRADIENT_SETTINGS.gradientAngle,
        opacity: 1,
      },
      locked: false,
    },
    background: {
      color: '#ffffff',
      stylePresetId: 'solid',
      params: {
        opacity: 1,
      },
      locked: false,
    },
  }
}

function createMorphLayerFromDraft(
  layer: MorphStackPresetLayerDraft,
  index: number,
  id = createMorphLayerId(index)
): StudioMorphLayer {
  return {
    id,
    definitionId: layer.definitionId,
    params: layer.params,
    enabled: layer.enabled,
    collapsed: false,
    locked: false,
  }
}

function createMorphLayerFromDefinition(definitionId: string, index: number): StudioMorphLayer {
  const definition = getMorphLayerDefinitionById(definitionId) ?? getDefaultMorphLayerDefinition()

  return {
    id: createMorphLayerId(index),
    definitionId: definition.id,
    params: createDefaultMorphParams(definition),
    enabled: true,
    collapsed: false,
    locked: false,
  }
}

function getDefaultMorphLayerDefinition() {
  const definition = getMorphLayerDefinitionById('sine-bend')

  if (!definition) {
    throw new Error('Expected the sine-bend Morph Layer definition.')
  }

  return definition
}

function createMorphLayerId(index: number) {
  return `morph-layer-${index + 1}`
}

function createPatternLayerId(index: number) {
  return `pattern-layer-${index + 1}`
}

function randomizeMorphLayers(currentLayers: StudioMorphLayer[], seed: number, includeExperimental = false) {
  const layerCount = currentLayers.length > 0 ? currentLayers.length : createDefaultMorphStack(seed).layers.length
  const draft = randomizeMorphStackPreset({
    seed,
    layerCount,
    includeExperimental,
  })
  let draftIndex = 0
  const layers = currentLayers.length > 0 ? currentLayers : createDefaultMorphStack(seed).layers

  return layers.map((layer, index) => {
    if (layer.locked) {
      return layer
    }

    const draftLayer = draft.layers[draftIndex]
    draftIndex += 1

    if (!draftLayer) {
      return layer
    }

    return createMorphLayerFromDraft(draftLayer, index, layer.id)
  })
}

function randomizeSurfaceShaderLayers(surfaceShaders: StudioStoreState['surfaceShaders'], seed: number) {
  return {
    foreground: surfaceShaders.foreground.locked
      ? surfaceShaders.foreground
      : {
          ...surfaceShaders.foreground,
          color: readRandomColor(seed, 0),
        },
    background: surfaceShaders.background.locked
      ? surfaceShaders.background
      : {
          ...surfaceShaders.background,
          color: readRandomColor(seed, 1),
        },
  }
}

function randomizePatternLayers(patternLayers: StudioPatternLayer[], seed: number) {
  return patternLayers.map((layer, index) => {
    if (layer.locked) {
      return layer
    }

    return {
      ...layer,
      source: {
        type: 'built-in' as const,
        patternUrl: toPatternUrl(seed + index),
      },
    }
  })
}

function readRandomColor(seed: number, offset: number) {
  const colors = ['#111111', '#f7f7f2', '#264653', '#8f2d2d', '#2a6f62']
  const index = Math.abs(Math.trunc(seed + offset)) % colors.length

  return colors[index] ?? colors[0]
}

function selectPersistedState(state: StudioStore): PersistedStudioState {
  return {
    character: state.character,
    morphStack: state.morphStack,
    surfaceShaders: state.surfaceShaders,
    patternLayers: state.patternLayers,
    randomSeed: state.randomSeed,
    rendererMode: state.rendererMode,
    view: state.view,
  }
}

function sanitizePersistedState(value: unknown): PersistedStudioState {
  const base = createInitialStudioStoreState()
  const persisted = isRecord(value) ? value : {}
  const character = sanitizeCharacter(persisted.character, base.character)

  return {
    character,
    morphStack: sanitizeMorphStackState(persisted.morphStack, base.morphStack),
    surfaceShaders: sanitizeSurfaceShadersState(persisted.surfaceShaders, base.surfaceShaders),
    patternLayers: sanitizePatternLayersState(persisted.patternLayers, base.patternLayers),
    randomSeed: readNumber(persisted.randomSeed, base.randomSeed),
    rendererMode: sanitizeRendererMode(persisted.rendererMode, base.rendererMode),
    view: sanitizeViewState(persisted.view, base.view),
  }
}

function sanitizeCharacter(value: unknown, fallback: StudioCharacterState): StudioCharacterState {
  if (!isRecord(value) || typeof value.country !== 'string' || typeof value.year !== 'string') {
    return fallback
  }

  const isTc = typeof value.isTc === 'boolean' ? value.isTc : fallback.isTc
  const script = toScript(isTc)

  if (!chars[script][value.country]?.[value.year]) {
    return fallback
  }

  return {
    country: value.country,
    year: value.year,
    isTc,
  }
}

function sanitizeMorphStackState(
  value: unknown,
  fallback: StudioStoreState['morphStack']
): StudioStoreState['morphStack'] {
  if (!isRecord(value) || !Array.isArray(value.layers)) {
    return fallback
  }

  const layers = value.layers
    .map((layer, index) => sanitizeMorphLayer(layer, index))
    .filter((layer): layer is StudioMorphLayer => Boolean(layer))

  return {
    layers: layers.length > 0 ? layers : fallback.layers,
  }
}

function sanitizeMorphLayer(value: unknown, index: number): StudioMorphLayer | null {
  if (!isRecord(value) || typeof value.definitionId !== 'string') {
    return null
  }

  const definition = getMorphLayerDefinitionById(value.definitionId)

  if (!definition) {
    return null
  }

  return {
    id: typeof value.id === 'string' ? value.id : createMorphLayerId(index),
    definitionId: definition.id,
    params: sanitizeMorphParams(definition, readRecord(value.params)),
    enabled: typeof value.enabled === 'boolean' ? value.enabled : true,
    collapsed: typeof value.collapsed === 'boolean' ? value.collapsed : false,
    locked: typeof value.locked === 'boolean' ? value.locked : false,
  }
}

function sanitizeSurfaceShadersState(
  value: unknown,
  fallback: StudioStoreState['surfaceShaders']
): StudioStoreState['surfaceShaders'] {
  if (!isRecord(value)) {
    return fallback
  }

  return {
    foreground: sanitizeSurfaceShaderLayer(value.foreground, fallback.foreground, 'foreground'),
    background: sanitizeSurfaceShaderLayer(value.background, fallback.background, 'background'),
  }
}

function sanitizeSurfaceShaderLayer(
  value: unknown,
  fallback: StudioSurfaceShaderLayer,
  layerId?: StudioSurfaceShaderLayerId
): StudioSurfaceShaderLayer {
  if (!isRecord(value)) {
    return fallback
  }

  return {
    color: typeof value.color === 'string' ? value.color : fallback.color,
    stylePresetId: readSurfaceShaderStylePresetId(
      typeof value.stylePresetId === 'string' ? value.stylePresetId : fallback.stylePresetId,
      fallback.stylePresetId,
      layerId
    ),
    params: readSurfaceShaderParams(value.params, fallback.params, layerId),
    locked: typeof value.locked === 'boolean' ? value.locked : fallback.locked,
  }
}

function sanitizeSurfaceShaderLayerPartial(
  value: Partial<StudioSurfaceShaderLayer>,
  layerId?: StudioSurfaceShaderLayerId
): Partial<StudioSurfaceShaderLayer> {
  return {
    ...(typeof value.color === 'string' ? { color: value.color } : {}),
    ...(typeof value.stylePresetId === 'string'
      ? {
          stylePresetId: readSurfaceShaderStylePresetId(value.stylePresetId, 'solid', layerId),
        }
      : {}),
    ...(isRecord(value.params) ? { params: readSurfaceShaderParams(value.params, {}, layerId) } : {}),
    ...(typeof value.locked === 'boolean' ? { locked: value.locked } : {}),
  }
}

function readSurfaceShaderStylePresetId(value: string, fallback: string, layerId?: StudioSurfaceShaderLayerId) {
  if (layerId === 'background') {
    return 'solid'
  }

  if (value === 'soft-gradient') {
    return 'gradient'
  }

  return value === 'solid' || value === 'depth-lit' || value === 'gradient' ? value : fallback
}

function readSurfaceShaderParams(
  value: unknown,
  fallback: StudioSurfaceShaderLayer['params'],
  layerId?: StudioSurfaceShaderLayerId
) {
  if (!isRecord(value)) {
    return fallback
  }

  const scalarParams = Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string | number | boolean] => {
      const [, paramValue] = entry

      return typeof paramValue === 'string' || typeof paramValue === 'number' || typeof paramValue === 'boolean'
    })
  )

  const params: StudioSurfaceShaderLayer['params'] = {
    ...scalarParams,
    opacity: readSurfaceOpacity(value.opacity, fallback.opacity),
  }

  if (layerId !== 'background') {
    params.gradientStops = normalizeGradientStops(value.gradientStops)
    params.gradientType = readGradientType(value.gradientType, readGradientType(fallback.gradientType))
    params.gradientAngle = readGradientAngle(value.gradientAngle, readGradientAngle(fallback.gradientAngle))
  }

  return params
}

function readSurfaceOpacity(value: unknown, fallback = 1) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }

  return Math.max(0, Math.min(1, value))
}

function sanitizePatternLayersState(value: unknown, fallback: StudioPatternLayer[]): StudioPatternLayer[] {
  if (!Array.isArray(value)) {
    return fallback
  }

  return value.slice(0, MAX_PATTERN_LAYERS).map((layer, index) => sanitizePatternLayer(layer, index))
}

function sanitizePatternLayer(value: unknown, index: number): StudioPatternLayer {
  const record = readRecord(value)

  return {
    id: typeof record.id === 'string' ? record.id : createPatternLayerId(index),
    source: sanitizePatternLayerSource(record.source),
    target: sanitizePatternLayerTarget(record.target),
    locked: typeof record.locked === 'boolean' ? record.locked : false,
  }
}

function sanitizePatternLayerSource(value: unknown): StudioPatternLayerSource {
  if (isRecord(value)) {
    if (value.type === 'local-file' && typeof value.fileName === 'string') {
      return {
        type: 'local-file',
        fileName: value.fileName,
      }
    }

    if (value.type === 'built-in') {
      return {
        type: 'built-in',
        patternUrl: sanitizePatternUrl(value.patternUrl, DEFAULT_PATTERN_ASSET_URL),
      }
    }
  }

  return {
    type: 'built-in',
    patternUrl: DEFAULT_PATTERN_ASSET_URL,
  }
}

function sanitizePatternLayerTarget(value: unknown): StudioPatternLayerTarget {
  if (value === 'morph-stack' || value === 'foreground-shader' || value === 'background-shader') {
    return value
  }

  return 'foreground-shader'
}

function sanitizeRendererMode(value: unknown, fallback: StudioRendererMode): StudioRendererMode {
  return value === 'webgl' || value === 'webgpu-experimental' ? value : fallback
}

function createDefaultMeshState(): StudioStoreState['mesh'] {
  return {
    ...DEFAULT_MESH_STATE,
    rotation: { ...DEFAULT_MESH_STATE.rotation },
    position: { ...DEFAULT_MESH_STATE.position },
  }
}

function sanitizeDisplacementState(value: unknown, fallback: StudioStoreState['displacement']) {
  if (!isRecord(value)) {
    return fallback
  }

  return {
    patternUrl: sanitizePatternUrl(value.patternUrl, fallback.patternUrl),
    strength: readNumber(value.strength, fallback.strength),
    bias: readClampedNumber(value.bias, fallback.bias, MIN_DISPLACEMENT_BIAS, MAX_DISPLACEMENT_BIAS),
    subdivisionLevel: readClampedInteger(
      value.subdivisionLevel,
      fallback.subdivisionLevel,
      MIN_DISPLACEMENT_SUBDIVISION_LEVEL,
      MAX_DISPLACEMENT_SUBDIVISION_LEVEL
    ),
  }
}

function sanitizeViewState(value: unknown, fallback: StudioStoreState['view']) {
  if (!isRecord(value)) {
    return fallback
  }

  return {
    activePanel:
      value.activePanel === null
        ? null
        : isStudioActivePanel(value.activePanel)
          ? value.activePanel
          : fallback.activePanel,
    backgroundColor: typeof value.backgroundColor === 'string' ? value.backgroundColor : fallback.backgroundColor,
  }
}

function activePanelFromPanel(panel: string | null): StudioActivePanel | null {
  if (panel === null) {
    return null
  }

  if (panel === '0') {
    return 'character'
  }

  if (panel === '1') {
    return 'pattern'
  }

  return 'shader'
}

function panelFromActivePanel(activePanel: StudioActivePanel | null) {
  if (activePanel === null) {
    return null
  }

  if (activePanel === 'character') {
    return '0'
  }

  if (activePanel === 'pattern') {
    return '1'
  }

  return '2'
}

function toScript(isTc: boolean): CharScript {
  return isTc ? 'tc' : 'sc'
}

function readRecord(value: unknown) {
  return isRecord(value) ? value : {}
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function readClampedNumber(value: unknown, fallback: number, min: number, max: number) {
  return Math.min(max, Math.max(min, readNumber(value, fallback)))
}

function readClampedInteger(value: unknown, fallback: number, min: number, max: number) {
  return Math.trunc(readClampedNumber(value, fallback, min, max))
}

function isStudioActivePanel(value: unknown): value is StudioActivePanel {
  return value === 'character' || value === 'morph' || value === 'shader' || value === 'pattern'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isDataUrl(value: string) {
  return value.startsWith('data:')
}
