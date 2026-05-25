import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { chars, toCharUrl, type CharScript } from '@/assets/chars'
import { countries } from '@/assets/list'
import { getDefaultShaderPreset, getShaderPresetById } from '@/shaders/registry'
import type { ShaderParamValue, ShaderParamValues } from '@/shaders/types'
import { createDefaultParams, sanitizeParamsForPreset } from '@/shaders/uniforms'

export const STUDIO_STORE_STORAGE_KEY = 'hanzi-studio-shader-editor-v1'

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
  activePanel: 'character' as StudioActivePanel,
  backgroundColor: '#fff',
}

export type StudioActivePanel = 'character' | 'shader' | 'mesh' | 'displacement'

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
  }
  view: {
    activePanel: StudioActivePanel
    backgroundColor: string
  }
  svgEffect: typeof DEFAULT_EFFECT_STATE
  runtime: {
    svgData: string
    ptnData: string
    patternMode: 'source' | 'upload'
  }
}

export type StudioStoreActions = {
  setCharacter: (country: string, year: string, isTc?: boolean) => void
  setSelectedPreset: (presetId: string) => void
  resetParamsForPreset: (presetId?: string) => void
  updateParam: (paramId: string, value: ShaderParamValue) => void
  setMeshControl: (partial: Partial<StudioStoreState['mesh']>) => void
  setDisplacementControl: (
    partial: Partial<StudioStoreState['displacement']>,
  ) => void
  setActivePanel: (activePanel: StudioActivePanel) => void
  setBackgroundColor: (backgroundColor: string) => void
  setSvgData: (svgData: string) => void
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

type PersistedStudioState = Omit<StudioStoreState, 'runtime'>

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
        setDisplacementControl: (partial) => {
          const nextDisplacement = { ...get().displacement, ...partial }

          if (isDataUrl(nextDisplacement.patternUrl)) {
            nextDisplacement.patternUrl = get().displacement.patternUrl
          }

          set({ displacement: nextDisplacement })
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
          set({ runtime: { ...get().runtime, svgData } })
        },
        setPatternSeed: (seed) => {
          const patternUrl = toPatternUrl(seed)

          set({
            displacement: { ...get().displacement, patternUrl },
            svgEffect: { ...get().svgEffect, seed },
            runtime: { ...get().runtime, ptnData: '', patternMode: 'source' },
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
            displacement: { ...get().displacement, patternUrl },
            runtime: { ...get().runtime, ptnData: '', patternMode: 'source' },
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
    mesh: {
      extrusionDepth: 0.18,
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
      position: { x: 0, y: 0 },
      autoRotate: false,
      autoRotateSpeed: 0.5,
    },
    displacement: {
      patternUrl: toPatternUrl(DEFAULT_EFFECT_STATE.seed),
      strength: 0,
      bias: 0,
    },
    view: DEFAULT_VIEW_STATE,
    svgEffect: DEFAULT_EFFECT_STATE,
    runtime: {
      svgData: '',
      ptnData: '',
      patternMode: 'source',
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

export function toPatternUrl(seed: number) {
  return `/images/patterns/${String(seed).padStart(3, '0')}.jpg`
}

function selectPersistedState(state: StudioStore): PersistedStudioState {
  return {
    character: state.character,
    shader: state.shader,
    mesh: state.mesh,
    displacement: {
      ...state.displacement,
      patternUrl: isDataUrl(state.displacement.patternUrl)
        ? toPatternUrl(state.svgEffect.seed)
        : state.displacement.patternUrl,
    },
    view: state.view,
    svgEffect: state.svgEffect,
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
    mesh: sanitizeMeshState(persisted.mesh, base.mesh),
    displacement: sanitizeDisplacementState(
      persisted.displacement,
      base.displacement,
    ),
    view: sanitizeViewState(persisted.view, base.view),
    svgEffect: sanitizeSvgEffectState(persisted.svgEffect, base.svgEffect),
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

function sanitizeMeshState(
  value: unknown,
  fallback: StudioStoreState['mesh'],
) {
  if (!isRecord(value)) {
    return fallback
  }

  return {
    extrusionDepth: readNumber(value.extrusionDepth, fallback.extrusionDepth),
    rotation: sanitizeVector3(value.rotation, fallback.rotation),
    scale: readNumber(value.scale, fallback.scale),
    position: sanitizeVector2(value.position, fallback.position),
    autoRotate: readBoolean(value.autoRotate, fallback.autoRotate),
    autoRotateSpeed: readNumber(value.autoRotateSpeed, fallback.autoRotateSpeed),
  }
}

function sanitizeDisplacementState(
  value: unknown,
  fallback: StudioStoreState['displacement'],
) {
  if (!isRecord(value)) {
    return fallback
  }

  const patternUrl =
    typeof value.patternUrl === 'string' && !isDataUrl(value.patternUrl)
      ? value.patternUrl
      : fallback.patternUrl

  return {
    patternUrl,
    strength: readNumber(value.strength, fallback.strength),
    bias: readNumber(value.bias, fallback.bias),
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
    activePanel: isStudioActivePanel(value.activePanel)
      ? value.activePanel
      : fallback.activePanel,
    backgroundColor:
      typeof value.backgroundColor === 'string'
        ? value.backgroundColor
        : fallback.backgroundColor,
  }
}

function sanitizeSvgEffectState(
  value: unknown,
  fallback: StudioStoreState['svgEffect'],
) {
  if (!isRecord(value)) {
    return fallback
  }

  return {
    seed: readNumber(value.seed, fallback.seed),
    distortion: readNumber(value.distortion, fallback.distortion),
    blur: readNumber(value.blur, fallback.blur),
    width: readNumber(value.width, fallback.width),
    x: readNumber(value.x, fallback.x),
    y: readNumber(value.y, fallback.y),
    rotation: readNumber(value.rotation, fallback.rotation),
    textColor:
      typeof value.textColor === 'string' ? value.textColor : fallback.textColor,
    panel:
      typeof value.panel === 'string' || value.panel === null
        ? value.panel
        : fallback.panel,
  }
}

function sanitizeVector2(
  value: unknown,
  fallback: { x: number; y: number },
) {
  if (!isRecord(value)) {
    return fallback
  }

  return {
    x: readNumber(value.x, fallback.x),
    y: readNumber(value.y, fallback.y),
  }
}

function sanitizeVector3(
  value: unknown,
  fallback: { x: number; y: number; z: number },
) {
  if (!isRecord(value)) {
    return fallback
  }

  return {
    x: readNumber(value.x, fallback.x),
    y: readNumber(value.y, fallback.y),
    z: readNumber(value.z, fallback.z),
  }
}

function activePanelFromPanel(panel: string | null): StudioActivePanel {
  if (panel === '0') {
    return 'character'
  }

  if (panel === '1') {
    return 'displacement'
  }

  return 'shader'
}

function panelFromActivePanel(activePanel: StudioActivePanel) {
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

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback
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
