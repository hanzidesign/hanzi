import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { chars, toCharUrl, type CharScript } from '@/assets/chars'
import { countries } from '@/assets/list'
import { getDefaultShaderPreset, getShaderPresetById } from '@/shaders/registry'
import type { ShaderParamValue, ShaderParamValues } from '@/shaders/types'
import { createDefaultParams, sanitizeParamsForPreset } from '@/shaders/uniforms'
import {
  DEFAULT_PATTERN_ASSET_URL,
  sanitizePatternUrl,
  toPatternUrl,
} from '@/utils/patternAssets'

export const STUDIO_STORE_STORAGE_KEY = 'hanzi-studio-character-surface-v2_1'

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

export type StudioActivePanel = 'character' | 'shader' | 'mesh' | 'displacement'

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
  }
}

export type StudioStoreActions = {
  setCharacter: (country: string, year: string, isTc?: boolean) => void
  setSelectedPreset: (presetId: string) => void
  resetParamsForPreset: (presetId?: string) => void
  updateParam: (paramId: string, value: ShaderParamValue) => void
  setMeshControl: (partial: Partial<StudioStoreState['mesh']>) => void
  resetMeshControls: () => void
  setDisplacementControl: (
    partial: Partial<StudioStoreState['displacement']>,
  ) => void
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
}

export type StudioStore = StudioStoreState & StudioStoreActions

type PersistedStudioState = Pick<StudioStoreState, 'character' | 'shader' | 'view'>

export const useStudioStore = createStudioStore()

export function createStudioStore(storage?: StateStorage) {
  return create<StudioStore>()(
    persist(
      (set, get) => ({
        ...createInitialStudioStoreState(),
        setCharacter: (country, year, isTc) => {
          const nextCharacter = sanitizeCharacter(
            { country, year, isTc: isTc ?? get().character.isTc },
            get().character,
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
          const preset =
            getShaderPresetById(get().shader.selectedPresetId) ??
            getDefaultShaderPreset()

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
          const nextDisplacement = sanitizeDisplacementState(
            { ...get().displacement, ...partial },
            get().displacement,
          )

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

          if (
            state.runtime.patternMode !== 'source' ||
            state.displacement.patternUrl !== patternUrl
          ) {
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
      },
    ),
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
    },
  }
}

export function getCharacterDisplayState(character: StudioCharacterState) {
  const sanitizedCharacter = sanitizeCharacter(
    character,
    createInitialStudioStoreState().character,
  )
  const script = toScript(sanitizedCharacter.isTc)
  const ch = chars[script][sanitizedCharacter.country][sanitizedCharacter.year]
  const charUrl = toCharUrl(
    script,
    sanitizedCharacter.country,
    sanitizedCharacter.year,
  )

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

function selectPersistedState(state: StudioStore): PersistedStudioState {
  return {
    character: state.character,
    shader: state.shader,
    view: state.view,
  }
}

function sanitizePersistedState(value: unknown): PersistedStudioState {
  const base = createInitialStudioStoreState()
  const persisted = isRecord(value) ? value : {}
  const character = sanitizeCharacter(persisted.character, base.character)
  const shader = sanitizeShaderState(persisted.shader, base.shader)

  return {
    character,
    shader,
    view: sanitizeViewState(persisted.view, base.view),
  }
}

function sanitizeCharacter(
  value: unknown,
  fallback: StudioCharacterState,
): StudioCharacterState {
  if (!isRecord(value) || typeof value.country !== 'string' || typeof value.year !== 'string') {
    return fallback
  }

  const isTc =
    typeof value.isTc === 'boolean' ? value.isTc : fallback.isTc
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

function sanitizeShaderState(
  value: unknown,
  fallback: StudioStoreState['shader'],
) {
  if (!isRecord(value) || typeof value.selectedPresetId !== 'string') {
    return fallback
  }

  const preset = getShaderPresetById(value.selectedPresetId)

  if (!preset) {
    return fallback
  }

  return {
    selectedPresetId: preset.id,
    currentParams: sanitizeParamsForPreset(preset, readRecord(value.currentParams)),
  }
}

function createDefaultMeshState(): StudioStoreState['mesh'] {
  return {
    ...DEFAULT_MESH_STATE,
    rotation: { ...DEFAULT_MESH_STATE.rotation },
    position: { ...DEFAULT_MESH_STATE.position },
  }
}

function sanitizeDisplacementState(
  value: unknown,
  fallback: StudioStoreState['displacement'],
) {
  if (!isRecord(value)) {
    return fallback
  }

  return {
    patternUrl: sanitizePatternUrl(value.patternUrl, fallback.patternUrl),
    strength: readNumber(value.strength, fallback.strength),
    bias: readClampedNumber(
      value.bias,
      fallback.bias,
      MIN_DISPLACEMENT_BIAS,
      MAX_DISPLACEMENT_BIAS,
    ),
    subdivisionLevel: readClampedInteger(
      value.subdivisionLevel,
      fallback.subdivisionLevel,
      MIN_DISPLACEMENT_SUBDIVISION_LEVEL,
      MAX_DISPLACEMENT_SUBDIVISION_LEVEL,
    ),
  }
}

function sanitizeViewState(
  value: unknown,
  fallback: StudioStoreState['view'],
) {
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
    backgroundColor:
      typeof value.backgroundColor === 'string'
        ? value.backgroundColor
        : fallback.backgroundColor,
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
    return 'displacement'
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

  if (activePanel === 'displacement' || activePanel === 'mesh') {
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

function readClampedNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  return Math.min(max, Math.max(min, readNumber(value, fallback)))
}

function readClampedInteger(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  return Math.trunc(readClampedNumber(value, fallback, min, max))
}

function isStudioActivePanel(value: unknown): value is StudioActivePanel {
  return (
    value === 'character' ||
    value === 'shader' ||
    value === 'mesh' ||
    value === 'displacement'
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isDataUrl(value: string) {
  return value.startsWith('data:')
}
