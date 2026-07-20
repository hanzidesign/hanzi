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
  readGradientAngle,
  readGradientType,
  normalizeGradientStops,
  type GradientType,
  type GradientColorStop,
} from '@/components/studio/gradient-stops'
import { clampLayerIntensity, sanitizeLayerBlendMode, type LayerBlendMode } from '@/components/studio/layer-compositing'
import {
  createEffectDefaultParams,
  getEffectDefinitionById,
  type EffectParamValue,
} from '@/components/studio/effect-registry'
import { buildCoherentRandomizePreset, type RandomizePresetId } from '@/components/studio/randomize-presets'
import {
  DEFAULT_GRAINRAD_EFFECT_ID,
  GRAINRAD_COMMON_POST_PROCESSING_GROUPS,
  GRAINRAD_EFFECTS,
  GRAINRAD_EFFECT_IDS,
  createDefaultGrainradEffectControls,
  getGrainradProcessingGroups,
  isGrainradThemeColorControl,
  type GrainradCharacterSet,
  type GrainradControlValue,
  type GrainradEffectControl,
  type GrainradEffectId,
} from '@/components/studio/grainrad-effects'
import {
  MAX_CHARACTER_REPEAT_COUNT,
  MAX_CHARACTER_REPEAT_ORIENTATION,
  MAX_CHARACTER_REPEAT_RADIUS,
  MAX_CHARACTER_REPEAT_SIZE,
  MIN_CHARACTER_REPEAT_COUNT,
  MIN_CHARACTER_REPEAT_ORIENTATION,
  MIN_CHARACTER_REPEAT_RADIUS,
  MIN_CHARACTER_REPEAT_SIZE,
  type CharacterRepeatSettings,
} from '@/components/studio/character-model-arrangement'
import {
  DEFAULT_CHARACTER_MESH_DEFORM,
  sanitizeCharacterMeshDeformSettings,
  type CharacterMeshDeformSettings,
} from '@/components/studio/character-mesh-deform'

export const STUDIO_STORE_STORAGE_KEY = 'hanzi-studio-grainrad-effects-v1'
const STUDIO_STORE_STORAGE_VERSION = 8
export const MAX_PATTERN_LAYERS = 3
const DEFAULT_ART_PATTERN_LAYERS: Array<
  Pick<StudioPatternLayer, 'source' | 'target' | 'enabled' | 'intensity' | 'blendMode' | 'locked'>
> = [
  {
    source: { type: 'built-in', patternUrl: '/images/patterns/033.jpg' },
    target: 'background-shader',
    enabled: true,
    intensity: 0.36,
    blendMode: 'multiply',
    locked: false,
  },
  {
    source: { type: 'built-in', patternUrl: '/images/patterns/087.jpg' },
    target: 'foreground-shader',
    enabled: true,
    intensity: 0.62,
    blendMode: 'soft-light',
    locked: false,
  },
  {
    source: { type: 'built-in', patternUrl: '/images/patterns/014.jpg' },
    target: 'morph-stack',
    enabled: true,
    intensity: 0.7,
    blendMode: 'normal',
    locked: false,
  },
]

const DEFAULT_COUNTRY = 'int'
const DEFAULT_YEAR = '2025'
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
  backgroundColor: '#f4f1e8',
  theme: 'dark' as StudioTheme,
  mobileTab: 'input' as StudioMobileTab,
  settingsOpen: false,
  expandedSections: {
    input: true,
    effects: true,
    modelDeform: true,
    animation: false,
    presets: false,
    settings: true,
    processing: false,
    postProcessing: false,
    export: true,
  } satisfies Record<StudioSectionId, boolean>,
  previewZoom: 1,
  previewPan: { x: 0, y: 0 },
}

export type StudioActivePanel =
  | 'character'
  | 'morph'
  | 'shader'
  | 'ascii'
  | 'asciiStyle'
  | 'pattern'
  | 'animation'
  | 'post'
  | 'randomize'
export type StudioTheme = 'light' | 'dark'
export type StudioMobileTab = 'input' | 'effects' | 'animation' | 'export'
export type StudioSectionId =
  | 'input'
  | 'effects'
  | 'modelDeform'
  | 'animation'
  | 'presets'
  | 'settings'
  | 'processing'
  | 'postProcessing'
  | 'export'
export type StudioExportFormat = 'png' | 'apng' | 'gif' | 'mp4'

export type StudioRendererMode = 'webgl' | 'webgpu-experimental'

export const ASCII_CHARSET_STYLES = [
  'standard',
  'blocks',
  'binary',
  'detailed',
  'minimal',
  'alphabetic',
  'numeric',
  'math',
  'symbols',
  'custom',
] as const satisfies readonly GrainradCharacterSet[]
export const ASCII_PALETTES = ['green', 'amber', 'noir', 'synthwave', 'custom'] as const

export type StudioAsciiCharsetStyle = GrainradCharacterSet
export type StudioAsciiPalette = (typeof ASCII_PALETTES)[number]

export type StudioThemeControls = Record<
  StudioTheme,
  Record<GrainradEffectId, Record<string, GrainradControlValue>>
>
type StudioThemeColorControls = Record<
  StudioTheme,
  Record<GrainradEffectId, Record<string, string>>
>

export type StudioAsciiState = {
  cellSize: number
  density: number
  contrast: number
  brightness: number
  saturation: number
  hueRotation: number
  sharpness: number
  gamma: number
  invert: boolean
  charsetStyle: StudioAsciiCharsetStyle
  palette: StudioAsciiPalette
  foregroundColor: string
  backgroundColor: string
  colorIntensity: number
  depthInfluence: number
  normalInfluence: number
  scanlineAmount: number
  bloomAmount: number
  curvature: number
  vignette: number
  chromaticOffset: number
  grain: number
}

export type StudioMorphLayer = {
  id: string
  definitionId: string
  params: MorphParamValues
  enabled: boolean
  intensity: number
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

export type StudioShaderLayerTarget = 'foreground-shader' | 'background-shader'

export type StudioShaderLayer = {
  id: string
  effectId: string
  target: StudioShaderLayerTarget
  enabled: boolean
  intensity: number
  blendMode: LayerBlendMode
  params: Record<string, EffectParamValue>
  locked: boolean
}

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
  enabled: boolean
  intensity: number
  blendMode: LayerBlendMode
  locked: boolean
}

export type StudioPostFxLayer = {
  id: string
  effectId:
    | 'noise'
    | 'bloom'
    | 'vignette'
    | 'brightness-contrast'
    | 'hue-saturation'
    | 'glitch'
    | 'chromatic-aberration'
    | 'scanline'
    | 'shockwave'
    | 'pixelation'
  enabled: boolean
  intensity: number
  locked: boolean
}

export const DEFAULT_MESH_STATE = {
  extrusionDepth: 0.18,
  thickness: 0,
  bevel: 0,
  twist: 0,
  taper: 0,
  bend: 0,
  deform: DEFAULT_CHARACTER_MESH_DEFORM satisfies CharacterMeshDeformSettings,
  repeat: {
    enabled: false,
    count: 6,
    radius: 1.25,
    orientation: 90,
    size: 0.5,
  } satisfies CharacterRepeatSettings,
  rotation: { x: 0, y: 0, z: 0 },
  scale: 1,
  position: { x: 0, y: 0 },
  autoRotate: true,
  autoRotateSpeed: 0.5,
}

export const DEFAULT_ASCII_STATE: StudioAsciiState = {
  cellSize: 12,
  density: 0.82,
  contrast: 1.18,
  brightness: 0,
  saturation: 0,
  hueRotation: 0,
  sharpness: 0,
  gamma: 1,
  invert: false,
  charsetStyle: 'standard',
  palette: 'custom',
  foregroundColor: '#101010',
  backgroundColor: '#f4f1e8',
  colorIntensity: 1,
  depthInfluence: 0.42,
  normalInfluence: 0.36,
  scanlineAmount: 0.22,
  bloomAmount: 0.18,
  curvature: 0.04,
  vignette: 0.24,
  chromaticOffset: 0.03,
  grain: 0.08,
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
  shaderLayers: {
    layers: StudioShaderLayer[]
    selectedShaderLayerId: string | null
  }
  patternLayers: StudioPatternLayer[]
  randomSeed: number
  animation: {
    playing: boolean
    speed: number
    timeOffset: number
    animateMorph: boolean
    animateShaders: boolean
    animatePatterns: boolean
    animatePost: boolean
  }
  postFx: {
    layers: StudioPostFxLayer[]
  }
  grainradEffect: {
    selectedEffectId: GrainradEffectId
    controls: Record<GrainradEffectId, Record<string, GrainradControlValue>>
    controlsByTheme: StudioThemeControls
  }
  ascii: StudioAsciiState
  rendererMode: StudioRendererMode
  mesh: {
    extrusionDepth: number
    thickness: number
    bevel: number
    twist: number
    taper: number
    bend: number
    deform: CharacterMeshDeformSettings
    repeat: CharacterRepeatSettings
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
    theme: StudioTheme
    mobileTab: StudioMobileTab
    settingsOpen: boolean
    expandedSections: Record<StudioSectionId, boolean>
    previewZoom: number
    previewPan: { x: number; y: number }
  }
  export: {
    selectedFormat: StudioExportFormat
    highQuality: boolean
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

export type StudioRandomizeFamilies = {
  morph?: boolean
  shaders?: boolean
  patterns?: boolean
}

export type StudioStoreActions = {
  setCharacter: (country: string, year: string, isTc?: boolean) => void
  setSelectedPreset: (presetId: string) => void
  resetParamsForPreset: (presetId?: string) => void
  updateParam: (paramId: string, value: ShaderParamValue) => void
  setMeshControl: (partial: Partial<StudioStoreState['mesh']>) => void
  setMeshDeformControl: <K extends keyof CharacterMeshDeformSettings>(
    key: K,
    partial: Partial<CharacterMeshDeformSettings[K]> & { amount?: number },
  ) => void
  resetMeshControls: () => void
  setDisplacementControl: (partial: Partial<StudioStoreState['displacement']>) => void
  setUploadedDisplacementImageData: (dataUrl: string) => void
  clearUploadedDisplacementImageData: () => void
  setActivePanel: (activePanel: StudioActivePanel | null) => void
  setBackgroundColor: (backgroundColor: string) => void
  setStudioTheme: (theme: StudioTheme) => void
  toggleStudioTheme: () => void
  setMobileTab: (mobileTab: StudioMobileTab) => void
  setSettingsOpen: (settingsOpen: boolean) => void
  toggleTerminalSection: (sectionId: StudioSectionId) => void
  setPreviewZoom: (previewZoom: number) => void
  resetPreviewView: () => void
  setExportFormat: (selectedFormat: StudioExportFormat) => void
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
  randomizeMorphPreset: (options?: {
    seed?: number
    includeExperimental?: boolean
    presetId?: RandomizePresetId
    families?: StudioRandomizeFamilies
  }) => void
  setSurfaceShaderLayer: (layerId: StudioSurfaceShaderLayerId, partial: Partial<StudioSurfaceShaderLayer>) => void
  setSurfaceShaderLayerLocked: (layerId: StudioSurfaceShaderLayerId, locked: boolean) => void
  addShaderLayer: (partial?: Partial<StudioShaderLayer>) => void
  removeShaderLayer: (layerId: string) => void
  reorderShaderLayer: (fromIndex: number, toIndex: number) => void
  updateShaderLayer: (layerId: string, partial: Partial<StudioShaderLayer>) => void
  setShaderLayerLocked: (layerId: string, locked: boolean) => void
  setSelectedShaderLayer: (layerId: string | null) => void
  setAnimationControl: (partial: Partial<StudioStoreState['animation']>) => void
  setSelectedEffect: (selectedEffectId: GrainradEffectId) => void
  setGrainradEffectControl: (effectId: GrainradEffectId, controlId: string, value: GrainradControlValue) => void
  resetSelectedEffectControls: () => void
  setAsciiControl: (partial: Partial<StudioAsciiState>) => void
  addPostFxLayer: (partial?: Partial<StudioPostFxLayer>) => void
  updatePostFxLayer: (layerId: string, partial: Partial<StudioPostFxLayer>) => void
  removePostFxLayer: (layerId: string) => void
  addPatternLayer: (partial?: Partial<StudioPatternLayer>) => void
  removePatternLayer: (layerId: string) => void
  reorderPatternLayer: (fromIndex: number, toIndex: number) => void
  updatePatternLayer: (layerId: string, partial: Partial<StudioPatternLayer>) => void
  setPatternLayerLocked: (layerId: string, locked: boolean) => void
  setUploadedPatternLayerData: (layerId: string, dataUrl: string) => void
  setRendererMode: (rendererMode: StudioRendererMode) => void
}

export type StudioStore = StudioStoreState & StudioStoreActions

type PersistedStudioState = Pick<
  StudioStoreState,
  'character' | 'ascii' | 'mesh' | 'rendererMode' | 'view' | 'export' | 'grainradEffect'
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
        setMeshDeformControl: (key, partial) => {
          const mesh = get().mesh
          const currentControl = mesh.deform[key]
          const legacyAmount = partial.amount
          const normalizedPartial = key === 'wave' || key === 'curl'
            ? (() => {
                const partialWithoutLegacyAmount = Object.fromEntries(
                  Object.entries(partial).filter(([field]) => field !== 'amount'),
                ) as Omit<typeof partial, 'amount'>
                return key === 'wave'
                  ? { ...partialWithoutLegacyAmount, ...(legacyAmount === undefined ? {} : { amplitude: legacyAmount }) }
                  : { ...partialWithoutLegacyAmount, ...(legacyAmount === undefined ? {} : { angle: legacyAmount }) }
              })()
            : partial
          const nextControl = { ...currentControl, ...normalizedPartial }

          if (Object.keys(nextControl).every((field) => (
            nextControl[field as keyof typeof nextControl] === currentControl[field as keyof typeof currentControl]
          ))) {
            return
          }

          set({
            mesh: {
              ...mesh,
              deform: {
                ...mesh.deform,
                [key]: nextControl,
              },
            },
          })
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
        setStudioTheme: (theme) => {
          set(resolveStudioThemeState(get(), theme))
        },
        toggleStudioTheme: () => {
          const theme = get().view.theme === 'light' ? 'dark' : 'light'

          set(resolveStudioThemeState(get(), theme))
        },
        setMobileTab: (mobileTab) => {
          set({ view: { ...get().view, mobileTab } })
        },
        setSettingsOpen: (settingsOpen) => {
          set({ view: { ...get().view, settingsOpen } })
        },
        toggleTerminalSection: (sectionId) => {
          const view = get().view

          set({
            view: {
              ...view,
              expandedSections: {
                ...view.expandedSections,
                [sectionId]: !view.expandedSections[sectionId],
              },
            },
          })
        },
        setPreviewZoom: (previewZoom) => {
          set({
            view: {
              ...get().view,
              previewZoom: readClampedNumber(previewZoom, get().view.previewZoom, 0.25, 4),
            },
          })
        },
        resetPreviewView: () => {
          set({
            view: {
              ...get().view,
              previewZoom: DEFAULT_VIEW_STATE.previewZoom,
              previewPan: { ...DEFAULT_VIEW_STATE.previewPan },
            },
          })
        },
        setExportFormat: (selectedFormat) => {
          set({ export: { ...get().export, selectedFormat } })
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
          const families = sanitizeRandomizeFamilies(options.families)
          const coherentPreset = options.presetId
            ? buildCoherentRandomizePreset({ seed, presetId: options.presetId })
            : null
          const layers = families.morph
            ? randomizeMorphLayers(state.morphStack.layers, seed, options.includeExperimental)
            : state.morphStack.layers

          set({
            randomSeed: seed,
            morphStack: { layers },
            surfaceShaders: families.shaders
              ? randomizeSurfaceShaderLayers(state.surfaceShaders, seed)
              : state.surfaceShaders,
            shaderLayers:
              families.shaders && coherentPreset
                ? {
                    ...state.shaderLayers,
                    layers: mergeLockedShaderLayers(state.shaderLayers.layers, coherentPreset.shaderLayers),
                    selectedShaderLayerId:
                      coherentPreset.shaderLayers[0]?.id ?? state.shaderLayers.selectedShaderLayerId,
                  }
                : state.shaderLayers,
            patternLayers: families.patterns ? randomizePatternLayers(state.patternLayers, seed) : state.patternLayers,
            animation: coherentPreset ? coherentPreset.animation : state.animation,
            postFx: coherentPreset
              ? { layers: mergeLockedPostFxLayers(state.postFx.layers, coherentPreset.postFx) }
              : state.postFx,
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
        addShaderLayer: (partial = {}) => {
          const state = get()
          const layers = state.shaderLayers.layers

          set({
            shaderLayers: {
              ...state.shaderLayers,
              layers: [
                ...layers,
                sanitizeShaderLayer(
                  {
                    id: createShaderLayerId(layers.length),
                    effectId: 'ink-graphite',
                    target: 'foreground-shader',
                    enabled: true,
                    intensity: 1,
                    blendMode: 'normal',
                    locked: false,
                    ...partial,
                  },
                  layers.length
                ),
              ],
            },
          })
        },
        removeShaderLayer: (layerId) => {
          const layers = get().shaderLayers.layers.filter((layer) => layer.id !== layerId)
          const selectedShaderLayerId =
            get().shaderLayers.selectedShaderLayerId === layerId
              ? (layers[0]?.id ?? null)
              : get().shaderLayers.selectedShaderLayerId

          set({
            shaderLayers: {
              layers,
              selectedShaderLayerId,
            },
          })
        },
        reorderShaderLayer: (fromIndex, toIndex) => {
          const shaderLayers = get().shaderLayers
          const layers = [...shaderLayers.layers]

          if (fromIndex < 0 || fromIndex >= layers.length || toIndex < 0 || toIndex >= layers.length) {
            return
          }

          const [layer] = layers.splice(fromIndex, 1)

          if (!layer) {
            return
          }

          layers.splice(toIndex, 0, layer)
          set({ shaderLayers: { ...shaderLayers, layers } })
        },
        updateShaderLayer: (layerId, partial) => {
          set({
            shaderLayers: {
              ...get().shaderLayers,
              layers: get().shaderLayers.layers.map((layer, index) =>
                layer.id === layerId ? sanitizeShaderLayer({ ...layer, ...partial }, index) : layer
              ),
            },
          })
        },
        setShaderLayerLocked: (layerId, locked) => {
          set({
            shaderLayers: {
              ...get().shaderLayers,
              layers: get().shaderLayers.layers.map((layer) => (layer.id === layerId ? { ...layer, locked } : layer)),
            },
          })
        },
        setSelectedShaderLayer: (layerId) => {
          const layers = get().shaderLayers.layers
          const selectedShaderLayerId = layerId && layers.some((layer) => layer.id === layerId) ? layerId : null

          set({
            shaderLayers: {
              ...get().shaderLayers,
              selectedShaderLayerId,
            },
          })
        },
        setAnimationControl: (partial) => {
          set({
            animation: sanitizeAnimationState({ ...get().animation, ...partial }, get().animation),
          })
        },
        setSelectedEffect: (selectedEffectId) => {
          set({
            grainradEffect: {
              ...get().grainradEffect,
              selectedEffectId: sanitizeGrainradEffectId(selectedEffectId, get().grainradEffect.selectedEffectId),
            },
          })
        },
        setGrainradEffectControl: (effectId, controlId, value) => {
          const state = get()
          const definition = GRAINRAD_EFFECTS.find((effect) => effect.id === effectId)
          const control = definition
            ? findGrainradControl(
                [
                  ...definition.settingGroups,
                  ...getGrainradProcessingGroups(effectId),
                  ...GRAINRAD_COMMON_POST_PROCESSING_GROUPS,
                ],
                controlId
              )
            : null

          if (!control) {
            return
          }

          const currentControls = state.grainradEffect.controls[effectId] ?? {}
          const sanitizedValue = sanitizeGrainradControlValue(
            control,
            value,
            currentControls[controlId] ?? control.defaultValue
          )

          const nextEffectControls = {
            ...currentControls,
            [controlId]: sanitizedValue,
          }
          const nextControlsByTheme = {
            ...state.grainradEffect.controlsByTheme,
            [state.view.theme]: {
              ...state.grainradEffect.controlsByTheme[state.view.theme],
              [effectId]: {
                ...state.grainradEffect.controlsByTheme[state.view.theme][effectId],
                [controlId]: sanitizedValue,
              },
            },
          }

          set({
            ascii:
              effectId === 'ascii' && isGrainradThemeColorControl(control)
                ? syncAsciiColorsFromControls(state.ascii, nextEffectControls)
                : state.ascii,
            grainradEffect: {
              ...state.grainradEffect,
              controls: {
                ...state.grainradEffect.controls,
                [effectId]: nextEffectControls,
              },
              controlsByTheme: nextControlsByTheme,
            },
          })
        },
        resetSelectedEffectControls: () => {
          const state = get()
          const selectedEffectId = state.grainradEffect.selectedEffectId
          const defaults = createDefaultGrainradEffectControls(state.view.theme)
          const defaultThemeControls = createDefaultGrainradThemeControls(state.view.theme)
          const nextSelectedControls = defaults[selectedEffectId]

          set({
            ascii:
              selectedEffectId === 'ascii'
                ? syncAsciiColorsFromControls(DEFAULT_ASCII_STATE, nextSelectedControls)
                : state.ascii,
            grainradEffect: {
              ...state.grainradEffect,
              controls: {
                ...state.grainradEffect.controls,
                [selectedEffectId]: nextSelectedControls,
              },
              controlsByTheme: {
                ...state.grainradEffect.controlsByTheme,
                [state.view.theme]: {
                  ...state.grainradEffect.controlsByTheme[state.view.theme],
                  [selectedEffectId]: defaultThemeControls[selectedEffectId],
                },
              },
            },
          })
        },
        setAsciiControl: (partial) => {
          const state = get()
          const ascii = sanitizeAsciiState({ ...state.ascii, ...partial }, state.ascii)
          const colorUpdates = {
            ...(typeof partial.foregroundColor === 'string' ? { foreground: ascii.foregroundColor } : {}),
            ...(typeof partial.backgroundColor === 'string' ? { background: ascii.backgroundColor } : {}),
          }

          if (Object.keys(colorUpdates).length === 0) {
            set({ ascii })
            return
          }

          set({
            ascii,
            grainradEffect: {
              ...state.grainradEffect,
              controls: {
                ...state.grainradEffect.controls,
                ascii: {
                  ...state.grainradEffect.controls.ascii,
                  ...colorUpdates,
                },
              },
              controlsByTheme: {
                ...state.grainradEffect.controlsByTheme,
                [state.view.theme]: {
                  ...state.grainradEffect.controlsByTheme[state.view.theme],
                  ascii: {
                    ...state.grainradEffect.controlsByTheme[state.view.theme].ascii,
                    ...colorUpdates,
                  },
                },
              },
            },
          })
        },
        addPostFxLayer: (partial = {}) => {
          const layers = get().postFx.layers

          set({
            postFx: {
              layers: [
                ...layers,
                sanitizePostFxLayer(
                  {
                    id: createPostFxLayerId(layers.length),
                    effectId: 'noise',
                    enabled: true,
                    intensity: 0.35,
                    locked: false,
                    ...partial,
                  },
                  layers.length
                ),
              ],
            },
          })
        },
        updatePostFxLayer: (layerId, partial) => {
          set({
            postFx: {
              layers: get().postFx.layers.map((layer, index) =>
                layer.id === layerId ? sanitizePostFxLayer({ ...layer, ...partial }, index) : layer
              ),
            },
          })
        },
        removePostFxLayer: (layerId) => {
          set({ postFx: { layers: get().postFx.layers.filter((layer) => layer.id !== layerId) } })
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
          const state = get()
          const uploadedPatternLayerDataById = {
            ...state.runtime.uploadedPatternLayerDataById,
          }
          delete uploadedPatternLayerDataById[layerId]

          set({
            patternLayers: state.patternLayers.filter((layer) => layer.id !== layerId),
            runtime: {
              ...state.runtime,
              uploadedPatternLayerDataById,
            },
          })
        },
        reorderPatternLayer: (fromIndex, toIndex) => {
          const patternLayers = [...get().patternLayers]

          if (fromIndex < 0 || fromIndex >= patternLayers.length || toIndex < 0 || toIndex >= patternLayers.length) {
            return
          }

          const [layer] = patternLayers.splice(fromIndex, 1)

          if (!layer) {
            return
          }

          patternLayers.splice(toIndex, 0, layer)
          set({ patternLayers })
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
        version: STUDIO_STORE_STORAGE_VERSION,
        storage: createJSONStorage(() => storage ?? localStorage),
        migrate: migratePersistedStudioState,
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
  const grainradEffect = createDefaultGrainradEffectState()
  const ascii = syncAsciiColorsFromControls(
    DEFAULT_ASCII_STATE,
    grainradEffect.controls.ascii,
  )

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
    shaderLayers: createDefaultShaderLayers(),
    patternLayers: createDefaultPatternLayers(0),
    randomSeed: 0,
    animation: createDefaultAnimationState(),
    ascii,
    grainradEffect,
    postFx: createDefaultPostFxState(),
    rendererMode: 'webgl',
    mesh: createDefaultMeshState(),
    displacement: {
      patternUrl: DEFAULT_PATTERN_ASSET_URL,
      strength: 0,
      bias: 0,
      subdivisionLevel: 0,
    },
    view: DEFAULT_VIEW_STATE,
    export: {
      selectedFormat: 'png',
      highQuality: true,
    },
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
      color: '#080706',
      stylePresetId: 'depth-lit',
      params: {
        gradientStops: [
          { color: '#f8f3e9', position: 0, opacity: 0.88 },
          { color: '#0b0a09', position: 0.34, opacity: 0.98 },
          { color: '#000000', position: 1, opacity: 1 },
        ],
        gradientType: DEFAULT_GRADIENT_SETTINGS.gradientType,
        gradientAngle: 48,
        opacity: 0.96,
        depthStrength: 0.72,
        highlightStrength: 0.42,
        rimStrength: 0.32,
        edgeSoftness: 0.08,
      },
      locked: false,
    },
    background: {
      color: '#ebe7dc',
      stylePresetId: 'solid',
      params: {
        opacity: 1,
      },
      locked: false,
    },
  }
}

function createDefaultShaderLayers(): StudioStoreState['shaderLayers'] {
  return {
    layers: [
      createShaderLayerFromEffect('ink-graphite', 'foreground-shader', 0, {
        intensity: 0.88,
      }),
      createShaderLayerFromEffect('watercolor-paper', 'background-shader', 1, {
        intensity: 0.34,
        blendMode: 'soft-light',
      }),
    ],
    selectedShaderLayerId: 'shader-layer-1',
  }
}

function createDefaultAnimationState(): StudioStoreState['animation'] {
  return {
    playing: true,
    speed: 1,
    timeOffset: 0,
    animateMorph: true,
    animateShaders: true,
    animatePatterns: true,
    animatePost: true,
  }
}

function createDefaultGrainradEffectState(): StudioStoreState['grainradEffect'] {
  const theme = DEFAULT_VIEW_STATE.theme

  return {
    selectedEffectId: DEFAULT_GRAINRAD_EFFECT_ID,
    controls: createDefaultGrainradEffectControls(theme),
    controlsByTheme: {
      light: createDefaultGrainradThemeControls('light'),
      dark: createDefaultGrainradThemeControls('dark'),
    },
  }
}

function createDefaultGrainradThemeControls(theme: StudioTheme) {
  return createDefaultGrainradEffectControls(theme)
}

function createDefaultGrainradColorControls(theme: StudioTheme) {
  const defaults = createDefaultGrainradEffectControls(theme)

  return Object.fromEntries(
    GRAINRAD_EFFECTS.map((effect) => [
      effect.id,
      Object.fromEntries(
        effect.settingGroups
          .flatMap((group) => group.controls)
          .filter(isGrainradThemeColorControl)
          .map((control) => [control.id, defaults[effect.id][control.id] as string]),
      ),
    ]),
  ) as Record<GrainradEffectId, Record<string, string>>
}

function resolveStudioThemeState(
  state: StudioStore,
  theme: StudioTheme
): Pick<StudioStoreState, 'view' | 'grainradEffect' | 'ascii'> {
  const controls = state.grainradEffect.controlsByTheme[theme]

  return {
    view: { ...state.view, theme },
    grainradEffect: {
      ...state.grainradEffect,
      controls,
    },
    ascii: syncAsciiColorsFromControls(state.ascii, controls.ascii),
  }
}

function syncAsciiColorsFromControls(
  ascii: StudioAsciiState,
  controls: Record<string, GrainradControlValue>
): StudioAsciiState {
  return {
    ...ascii,
    foregroundColor: sanitizeHexColor(controls.foreground, ascii.foregroundColor),
    backgroundColor: sanitizeHexColor(controls.background, ascii.backgroundColor),
  }
}

function createDefaultPostFxState(): StudioStoreState['postFx'] {
  return {
    layers: [
      { id: 'post-fx-layer-1', effectId: 'noise', enabled: false, intensity: 0.18, locked: false },
      { id: 'post-fx-layer-2', effectId: 'vignette', enabled: false, intensity: 0.22, locked: false },
    ],
  }
}

function createDefaultPatternLayers(seed: number): StudioPatternLayer[] {
  return DEFAULT_ART_PATTERN_LAYERS.map((layer, index) =>
    sanitizePatternLayer(
      {
        id: createPatternLayerId(index),
        ...layer,
        source: {
          type: 'built-in',
          patternUrl:
            seed === 0 && layer.source.type === 'built-in' ? layer.source.patternUrl : toPatternUrl(seed + index),
        },
      },
      index
    )
  )
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
    intensity: readDefaultMorphLayerIntensity(layer.definitionId),
    collapsed: false,
    locked: false,
  }
}

function readDefaultMorphLayerIntensity(definitionId: string) {
  if (definitionId === 'surface-depth') {
    return 1
  }

  if (definitionId === 'band-slice' || definitionId === 'curl-flow') {
    return 0.86
  }

  if (definitionId === 'pixelate-grid') {
    return 0.72
  }

  return 0.92
}

function createMorphLayerFromDefinition(definitionId: string, index: number): StudioMorphLayer {
  const definition = getMorphLayerDefinitionById(definitionId) ?? getDefaultMorphLayerDefinition()

  return {
    id: createMorphLayerId(index),
    definitionId: definition.id,
    params: createDefaultMorphParams(definition),
    enabled: true,
    intensity: 1,
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

function createShaderLayerId(index: number) {
  return `shader-layer-${index + 1}`
}

function createPostFxLayerId(index: number) {
  return `post-fx-layer-${index + 1}`
}

function createShaderLayerFromEffect(
  effectId: string,
  target: StudioShaderLayerTarget,
  index: number,
  partial: Partial<StudioShaderLayer> = {}
): StudioShaderLayer {
  const effect = getEffectDefinitionById(effectId)

  if (!effect) {
    throw new Error(`Expected Shader Layer effect "${effectId}" to exist.`)
  }

  return sanitizeShaderLayer(
    {
      id: createShaderLayerId(index),
      effectId,
      target,
      enabled: true,
      intensity: 1,
      blendMode: 'normal',
      params: createEffectDefaultParams(effect),
      locked: false,
      ...partial,
    },
    index
  )
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
  const foregroundColor = readRandomInkColor(seed, 0)
  const backgroundColor = readRandomPaperColor(seed, 1)

  return {
    foreground: surfaceShaders.foreground.locked
      ? surfaceShaders.foreground
      : {
          ...surfaceShaders.foreground,
          color: foregroundColor,
          stylePresetId: seed % 3 === 0 ? 'gradient' : 'depth-lit',
          params: {
            ...surfaceShaders.foreground.params,
            opacity: 0.92 + (Math.abs(seed) % 7) * 0.01,
            gradientAngle: (seed * 37) % 360,
            gradientType: seed % 2 === 0 ? ('linear' as const) : ('radial' as const),
            gradientStops: [
              { color: '#f3eee5', position: 0, opacity: 0.65 },
              { color: foregroundColor, position: 0.38, opacity: 0.96 },
              { color: '#000000', position: 1, opacity: 1 },
            ],
            depthStrength: 0.45 + (Math.abs(seed) % 6) * 0.08,
            highlightStrength: 0.22 + (Math.abs(seed + 1) % 6) * 0.08,
            rimStrength: 0.18 + (Math.abs(seed + 2) % 6) * 0.08,
            edgeSoftness: 0.04 + (Math.abs(seed + 3) % 7) * 0.02,
          },
        },
    background: surfaceShaders.background.locked
      ? surfaceShaders.background
      : {
          ...surfaceShaders.background,
          color: backgroundColor,
          params: {
            ...surfaceShaders.background.params,
            opacity: 1,
          },
        },
  }
}

function randomizePatternLayers(patternLayers: StudioPatternLayer[], seed: number) {
  const layers = patternLayers.length > 0 ? patternLayers : createDefaultPatternLayers(seed)

  return layers.map((layer, index) => {
    if (layer.locked) {
      return layer
    }

    return {
      ...layer,
      source: {
        type: 'built-in' as const,
        patternUrl: toPatternUrl(seed + index),
      },
      target: readRandomPatternTarget(index),
      intensity: readRandomPatternIntensity(seed, index),
      blendMode: readRandomPatternBlendMode(seed, index),
    }
  })
}

function mergeLockedShaderLayers(currentLayers: StudioShaderLayer[], presetLayers: StudioShaderLayer[]) {
  const maxLength = Math.max(currentLayers.length, presetLayers.length)
  const nextLayers: StudioShaderLayer[] = []

  for (let index = 0; index < maxLength; index++) {
    const currentLayer = currentLayers[index]
    const presetLayer = presetLayers[index]

    if (currentLayer?.locked) {
      nextLayers.push(currentLayer)
    } else if (presetLayer) {
      nextLayers.push(sanitizeShaderLayer(presetLayer, index))
    }
  }

  return nextLayers.length > 0 ? nextLayers : currentLayers
}

function mergeLockedPostFxLayers(currentLayers: StudioPostFxLayer[], presetLayers: StudioPostFxLayer[]) {
  const maxLength = Math.max(currentLayers.length, presetLayers.length)
  const nextLayers: StudioPostFxLayer[] = []

  for (let index = 0; index < maxLength; index++) {
    const currentLayer = currentLayers[index]
    const presetLayer = presetLayers[index]

    if (currentLayer?.locked) {
      nextLayers.push(currentLayer)
    } else if (presetLayer) {
      nextLayers.push(sanitizePostFxLayer(presetLayer, index))
    }
  }

  return nextLayers.length > 0 ? nextLayers : currentLayers
}

function sanitizeRandomizeFamilies(families: StudioRandomizeFamilies | undefined): Required<StudioRandomizeFamilies> {
  return {
    morph: families?.morph ?? true,
    shaders: families?.shaders ?? true,
    patterns: families?.patterns ?? true,
  }
}

function readRandomPatternIntensity(seed: number, offset: number) {
  const value = 0.32 + (Math.abs(Math.trunc(seed + offset)) % 5) * 0.12

  return clampLayerIntensity(value)
}

function readRandomPatternTarget(index: number): StudioPatternLayerTarget {
  const targets: StudioPatternLayerTarget[] = ['background-shader', 'foreground-shader', 'morph-stack']

  return targets[index % targets.length] ?? 'foreground-shader'
}

function readRandomPatternBlendMode(seed: number, offset: number): LayerBlendMode {
  const blendModes: LayerBlendMode[] = ['multiply', 'soft-light', 'overlay', 'normal', 'screen']
  const index = Math.abs(Math.trunc(seed + offset)) % blendModes.length

  return blendModes[index] ?? 'normal'
}

function readRandomInkColor(seed: number, offset: number) {
  const colors = ['#050505', '#0b0a09', '#15110d', '#101314', '#1a1712']
  const index = Math.abs(Math.trunc(seed + offset)) % colors.length

  return colors[index] ?? colors[0]
}

function readRandomPaperColor(seed: number, offset: number) {
  const colors = ['#ebe7dc', '#e7e2d6', '#f0ede4', '#ded9cc', '#ece8df']
  const index = Math.abs(Math.trunc(seed + offset)) % colors.length

  return colors[index] ?? colors[0]
}

function selectPersistedState(state: StudioStore): PersistedStudioState {
  return {
    character: state.character,
    ascii: state.ascii,
    mesh: state.mesh,
    rendererMode: state.rendererMode,
    view: state.view,
    export: state.export,
    grainradEffect: state.grainradEffect,
  }
}

function sanitizePersistedState(value: unknown): PersistedStudioState {
  const base = createInitialStudioStoreState()
  const persisted = isRecord(value) ? value : {}
  const character = sanitizeCharacter(persisted.character, base.character)
  const view = sanitizeViewState(persisted.view, base.view)
  const grainradEffect = sanitizeGrainradEffectState(persisted.grainradEffect, base.grainradEffect, view.theme)
  const ascii = syncAsciiColorsFromControls(
    sanitizeAsciiState(persisted.ascii, base.ascii),
    grainradEffect.controls.ascii
  )

  return {
    character,
    ascii,
    mesh: sanitizeMeshState(persisted.mesh, base.mesh),
    rendererMode: sanitizeRendererMode(persisted.rendererMode, base.rendererMode),
    view,
    export: sanitizeExportState(persisted.export, base.export),
    grainradEffect,
  }
}

function migratePersistedStudioState(value: unknown, version: number): unknown {
  let persisted = readRecord(value)

  if (version < 2) {
    const grainradEffect = readRecord(persisted.grainradEffect)
    const controls = readRecord(grainradEffect.controls)
    const asciiControls = readRecord(controls.ascii)

    persisted = {
      ...persisted,
      grainradEffect: {
        ...grainradEffect,
        controls: {
          ...controls,
          ascii: {
            ...asciiControls,
            ...(asciiControls['color-mode'] === 'original' ? { 'color-mode': 'mono' } : {}),
          },
        },
      },
    }
  }

  if (version < 3) {
    const grainradEffect = readRecord(persisted.grainradEffect)
    const controls = readRecord(grainradEffect.controls)
    const ascii = readRecord(persisted.ascii)
    const theme = sanitizeStudioTheme(readRecord(persisted.view).theme, 'light')
    const colorControlsByTheme: StudioThemeColorControls = {
      light: createDefaultGrainradColorControls('light'),
      dark: createDefaultGrainradColorControls('dark'),
    }

    colorControlsByTheme[theme] = readLegacyGrainradThemeColors(controls, ascii, colorControlsByTheme[theme])
    persisted = {
      ...persisted,
      grainradEffect: {
        ...grainradEffect,
        colorControlsByTheme,
      },
    }
  }

  if (version < 4) {
    const grainradEffect = readRecord(persisted.grainradEffect)
    const controls = readRecord(grainradEffect.controls)
    const matrixRain = readRecord(controls['matrix-rain'])
    const blockify = readRecord(controls.blockify)
    const noiseField = readRecord(controls['noise-field'])
    const colorControlsByTheme = readRecord(grainradEffect.colorControlsByTheme)

    persisted = {
      ...persisted,
      grainradEffect: {
        ...grainradEffect,
        controls: {
          ...controls,
          'matrix-rain': {
            ...matrixRain,
            foreground: matrixRain.foreground ?? matrixRain['model-color'],
          },
          blockify: {
            ...blockify,
            foreground: blockify.foreground ?? blockify['border-color'],
          },
          'noise-field': {
            ...noiseField,
            'distort-only': true,
          },
        },
        colorControlsByTheme: {
          light: migrateGrainradColorRoleIds(colorControlsByTheme.light),
          dark: migrateGrainradColorRoleIds(colorControlsByTheme.dark),
        },
      },
    }
  }

  if (version < 5) {
    const grainradEffect = readRecord(persisted.grainradEffect)
    const controls = readRecord(grainradEffect.controls)
    const matrixRain = readRecord(controls['matrix-rain'])

    persisted = {
      ...persisted,
      grainradEffect: {
        ...grainradEffect,
        controls: {
          ...controls,
          'matrix-rain': {
            ...matrixRain,
            ...(matrixRain['brightness-map'] === 3 ? { 'brightness-map': 1 } : {}),
          },
        },
      },
    }
  }

  if (version < 6) {
    const grainradEffect = readRecord(persisted.grainradEffect)
    const controls = readRecord(grainradEffect.controls)
    const matrixRain = readRecord(controls['matrix-rain'])
    const colorControlsByTheme = readRecord(grainradEffect.colorControlsByTheme)
    const lightColors = readRecord(colorControlsByTheme.light)
    const lightMatrixRain = readRecord(lightColors['matrix-rain'])
    const theme = sanitizeStudioTheme(readRecord(persisted.view).theme, 'dark')

    persisted = {
      ...persisted,
      grainradEffect: {
        ...grainradEffect,
        controls: {
          ...controls,
          'matrix-rain': {
            ...matrixRain,
            ...(matrixRain['bg-opacity'] === 0.3 ? { 'bg-opacity': 0.5 } : {}),
            ...(theme === 'light' && matrixRain.foreground === '#101010'
              ? { foreground: '#15c15d' }
              : {}),
          },
        },
        colorControlsByTheme: {
          ...colorControlsByTheme,
          light: {
            ...lightColors,
            'matrix-rain': {
              ...lightMatrixRain,
              ...(lightMatrixRain.foreground === '#101010'
                ? { foreground: '#15c15d' }
                : {}),
            },
          },
        },
      },
    }
  }

  if (version < 7) {
    const grainradEffect = readRecord(persisted.grainradEffect)
    const controls = readRecord(grainradEffect.controls)
    const crosshatch = readRecord(controls.crosshatch)
    const theme = sanitizeStudioTheme(readRecord(persisted.view).theme, 'dark')
    const legacyColorsByTheme = readRecord(grainradEffect.colorControlsByTheme)
    const controlsByTheme: StudioThemeControls = {
      light: mergeLegacyColorsIntoThemeControls(
        createDefaultGrainradThemeControls('light'),
        legacyColorsByTheme.light,
      ),
      dark: mergeLegacyColorsIntoThemeControls(
        createDefaultGrainradThemeControls('dark'),
        legacyColorsByTheme.dark,
      ),
    }
    controlsByTheme[theme] = mergeLegacyActiveControls(
      controlsByTheme[theme],
      controls,
      readRecord(legacyColorsByTheme[theme]),
    )
    const migratedBrightness = crosshatch.brightness === 0
      ? createDefaultGrainradEffectControls(theme).crosshatch.brightness
      : crosshatch.brightness
    const migratedLineWidth = crosshatch['line-width'] === 0.15
      ? 0.08
      : crosshatch['line-width']
    controlsByTheme[theme].crosshatch.brightness = migratedBrightness as GrainradControlValue
    controlsByTheme[theme].crosshatch['line-width'] = migratedLineWidth as GrainradControlValue

    persisted = {
      ...persisted,
      grainradEffect: {
        ...grainradEffect,
        controls: {
          ...controls,
          crosshatch: {
            ...crosshatch,
            'line-width': migratedLineWidth,
            brightness: migratedBrightness,
          },
        },
        controlsByTheme,
      },
    }
  }

  if (version < 8) {
    const grainradEffect = readRecord(persisted.grainradEffect)
    const controlsByTheme = readRecord(grainradEffect.controlsByTheme)
    const lightControls = readRecord(controlsByTheme.light)
    const lightMatrixRain = readRecord(lightControls['matrix-rain'])
    const darkControls = readRecord(controlsByTheme.dark)
    const darkMatrixRain = readRecord(darkControls['matrix-rain'])

    persisted = {
      ...persisted,
      grainradEffect: {
        ...grainradEffect,
        controlsByTheme: {
          ...controlsByTheme,
          light: {
            ...lightControls,
            'matrix-rain': {
              ...lightMatrixRain,
              ...(lightMatrixRain.foreground === '#15c15d' ? { foreground: '#10da14' } : {}),
              ...(lightMatrixRain['rain-color'] === '#007a33' ? { 'rain-color': '#24ee20' } : {}),
            },
          },
          dark: {
            ...darkControls,
            'matrix-rain': {
              ...darkMatrixRain,
              ...(darkMatrixRain.foreground === '#f4f1e8' ? { foreground: '#36d00b' } : {}),
            },
          },
        },
      },
    }
  }

  return persisted
}

function mergeLegacyActiveControls(
  fallback: Record<GrainradEffectId, Record<string, GrainradControlValue>>,
  legacyControls: Record<string, unknown>,
  legacyColors: Record<string, unknown>,
) {
  return Object.fromEntries(
    GRAINRAD_EFFECTS.map((effect) => [
      effect.id,
      {
        ...fallback[effect.id],
        ...readRecord(legacyControls[effect.id]),
        ...readRecord(legacyColors[effect.id]),
      },
    ]),
  ) as Record<GrainradEffectId, Record<string, GrainradControlValue>>
}

function mergeLegacyColorsIntoThemeControls(
  fallback: Record<GrainradEffectId, Record<string, GrainradControlValue>>,
  legacyColors: unknown,
) {
  const colors = readRecord(legacyColors)

  return Object.fromEntries(
    GRAINRAD_EFFECTS.map((effect) => [
      effect.id,
      {
        ...fallback[effect.id],
        ...readRecord(colors[effect.id]),
      },
    ]),
  ) as Record<GrainradEffectId, Record<string, GrainradControlValue>>
}

function migrateGrainradColorRoleIds(value: unknown) {
  const colors = readRecord(value)
  const matrixRain = readRecord(colors['matrix-rain'])
  const blockify = readRecord(colors.blockify)

  return {
    ...colors,
    'matrix-rain': {
      ...matrixRain,
      foreground: matrixRain.foreground ?? matrixRain['model-color'],
    },
    blockify: {
      ...blockify,
      foreground: blockify.foreground ?? blockify['border-color'],
    },
  }
}

function readLegacyGrainradThemeColors(
  controls: Record<string, unknown>,
  ascii: Record<string, unknown>,
  fallback: Record<GrainradEffectId, Record<string, string>>
) {
  return Object.fromEntries(
    GRAINRAD_EFFECTS.map((effect) => {
      const effectControls = readRecord(controls[effect.id])
      const colors = Object.fromEntries(
        effect.settingGroups
          .flatMap((group) => group.controls)
          .filter(isGrainradThemeColorControl)
          .map((control) => {
            const legacyValue =
              effect.id === 'ascii' && control.id === 'foreground'
                ? ascii.foregroundColor
                : effect.id === 'ascii' && control.id === 'background'
                  ? ascii.backgroundColor
                  : effectControls[control.id]

            return [
              control.id,
              sanitizeGrainradControlValue(control, legacyValue, fallback[effect.id][control.id]) as string,
            ]
          })
      )

      return [effect.id, colors]
    })
  ) as Record<GrainradEffectId, Record<string, string>>
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

function sanitizeShaderLayer(value: unknown, index: number): StudioShaderLayer {
  const record = readRecord(value)
  const effectId = typeof record.effectId === 'string' ? record.effectId : 'ink-graphite'
  const effect = getEffectDefinitionById(effectId) ?? getEffectDefinitionById('ink-graphite')

  if (!effect) {
    throw new Error('Expected the ink-graphite Shader Layer definition.')
  }

  const target = sanitizeShaderLayerTarget(record.target, effect.stage)

  return {
    id: typeof record.id === 'string' ? record.id : createShaderLayerId(index),
    effectId: effect.id,
    target,
    enabled: typeof record.enabled === 'boolean' ? record.enabled : true,
    intensity: clampLayerIntensity(record.intensity),
    blendMode: sanitizeLayerBlendMode(record.blendMode),
    params: sanitizeEffectParams(effect, record.params),
    locked: typeof record.locked === 'boolean' ? record.locked : false,
  }
}

function sanitizeShaderLayerTarget(value: unknown, effectStage: string): StudioShaderLayerTarget {
  if (value === 'foreground-shader' || value === 'background-shader') {
    return value
  }

  return effectStage === 'background-shader' ? 'background-shader' : 'foreground-shader'
}

function sanitizeEffectParams(effect: NonNullable<ReturnType<typeof getEffectDefinitionById>>, value: unknown) {
  const record = readRecord(value)
  const params = createEffectDefaultParams(effect)

  for (const param of effect.params) {
    const nextValue = record[param.id]

    if (param.type === 'number' && typeof nextValue === 'number' && Number.isFinite(nextValue)) {
      params[param.id] = Math.min(param.max, Math.max(param.min, nextValue))
    }

    if (param.type === 'boolean' && typeof nextValue === 'boolean') {
      params[param.id] = nextValue
    }

    if (
      param.type === 'select' &&
      typeof nextValue === 'string' &&
      param.options.some((option) => option.id === nextValue)
    ) {
      params[param.id] = nextValue
    }
  }

  return params
}

function sanitizeAnimationState(
  value: unknown,
  fallback: StudioStoreState['animation']
): StudioStoreState['animation'] {
  const record = readRecord(value)

  return {
    playing: typeof record.playing === 'boolean' ? record.playing : fallback.playing,
    speed: readClampedNumber(record.speed, fallback.speed, -100, 100),
    timeOffset: readClampedNumber(record.timeOffset, fallback.timeOffset, 0, 3600),
    animateMorph: typeof record.animateMorph === 'boolean' ? record.animateMorph : fallback.animateMorph,
    animateShaders: typeof record.animateShaders === 'boolean' ? record.animateShaders : fallback.animateShaders,
    animatePatterns: typeof record.animatePatterns === 'boolean' ? record.animatePatterns : fallback.animatePatterns,
    animatePost: typeof record.animatePost === 'boolean' ? record.animatePost : fallback.animatePost,
  }
}

function sanitizeGrainradEffectState(
  value: unknown,
  fallback: StudioStoreState['grainradEffect'],
  theme: StudioTheme
): StudioStoreState['grainradEffect'] {
  const record = readRecord(value)
  const controlsByTheme = sanitizeGrainradControlsByTheme(
    record.controlsByTheme,
    fallback.controlsByTheme
  )
  const controls = controlsByTheme[theme]

  return {
    selectedEffectId: sanitizeGrainradEffectId(record.selectedEffectId, fallback.selectedEffectId),
    controls,
    controlsByTheme,
  }
}

function sanitizeGrainradControlsByTheme(
  value: unknown,
  fallback: StudioThemeControls
): StudioThemeControls {
  const record = readRecord(value)

  return {
    light: sanitizeGrainradEffectControls(record.light, fallback.light),
    dark: sanitizeGrainradEffectControls(record.dark, fallback.dark),
  }
}

function sanitizeGrainradEffectId(value: unknown, fallback: GrainradEffectId): GrainradEffectId {
  return GRAINRAD_EFFECT_IDS.includes(value as GrainradEffectId) ? (value as GrainradEffectId) : fallback
}

function sanitizeGrainradEffectControls(
  value: unknown,
  fallback: Record<GrainradEffectId, Record<string, GrainradControlValue>>
): Record<GrainradEffectId, Record<string, GrainradControlValue>> {
  const record = readRecord(value)
  const defaults = createDefaultGrainradEffectControls()

  return Object.fromEntries(
    GRAINRAD_EFFECTS.map((effect) => {
      const effectRecord = readRecord(record[effect.id])
      const fallbackControls = fallback[effect.id] ?? defaults[effect.id]
      const controls = Object.fromEntries(
        [
          ...effect.settingGroups,
          ...getGrainradProcessingGroups(effect.id),
          ...GRAINRAD_COMMON_POST_PROCESSING_GROUPS,
        ]
          .flatMap((group) => group.controls)
          .map((control) => [
            control.id,
            sanitizeGrainradControlValue(
              control,
              effectRecord[control.id],
              fallbackControls[control.id] ?? control.defaultValue
            ),
          ])
      )

      return [effect.id, controls]
    })
  ) as Record<GrainradEffectId, Record<string, GrainradControlValue>>
}

function sanitizeGrainradControlValue(
  control: GrainradEffectControl,
  value: unknown,
  fallback: GrainradControlValue
): GrainradControlValue {
  if (control.kind === 'range') {
    const numericFallback = typeof fallback === 'number' ? fallback : control.defaultValue
    const numericValue = typeof value === 'number' && Number.isFinite(value) ? value : numericFallback
    const hasOutOfRangeProductionDefault = control.defaultValue < control.min || control.defaultValue > control.max

    if (hasOutOfRangeProductionDefault && numericValue === control.defaultValue) {
      return control.defaultValue
    }

    return readClampedNumber(numericValue, numericFallback, control.min, control.max)
  }

  if (control.kind === 'toggle') {
    return typeof value === 'boolean' ? value : fallback
  }

  if (control.kind === 'select') {
    return typeof value === 'string' && control.options.some((option) => option.value === value) ? value : fallback
  }

  if (control.kind === 'text') {
    const maxLength = control.id === 'custom-palette' ? 576 : 128
    return typeof value === 'string' ? value.slice(0, maxLength) : fallback
  }

  return sanitizeHexColor(value, typeof fallback === 'string' ? fallback : control.defaultValue)
}

function findGrainradControl(groups: Array<{ controls: GrainradEffectControl[] }>, controlId: string) {
  return groups.flatMap((group) => group.controls).find((control) => control.id === controlId) ?? null
}

function sanitizeAsciiState(value: unknown, fallback: StudioAsciiState): StudioAsciiState {
  const record = readRecord(value)

  return {
    cellSize: readRoundedClampedInteger(record.cellSize, fallback.cellSize, 1, 64),
    density: readClampedNumber(record.density, fallback.density, 0, 1),
    contrast: readClampedNumber(record.contrast, fallback.contrast, 0.2, 2),
    brightness: readClampedNumber(record.brightness, fallback.brightness, -1, 1),
    saturation: readClampedNumber(record.saturation, fallback.saturation, -1, 1),
    hueRotation: readClampedNumber(record.hueRotation, fallback.hueRotation, -180, 180),
    sharpness: readClampedNumber(record.sharpness, fallback.sharpness, 0, 1),
    gamma: readClampedNumber(record.gamma, fallback.gamma, 0.2, 3),
    invert: typeof record.invert === 'boolean' ? record.invert : fallback.invert,
    charsetStyle: sanitizeAsciiCharsetStyle(record.charsetStyle, fallback.charsetStyle),
    palette: sanitizeAsciiPalette(record.palette, fallback.palette),
    foregroundColor: sanitizeHexColor(record.foregroundColor, fallback.foregroundColor),
    backgroundColor: sanitizeHexColor(record.backgroundColor, fallback.backgroundColor),
    colorIntensity: readClampedNumber(record.colorIntensity, fallback.colorIntensity, 0, 2),
    depthInfluence: readClampedNumber(record.depthInfluence, fallback.depthInfluence, 0, 1),
    normalInfluence: readClampedNumber(record.normalInfluence, fallback.normalInfluence, 0, 1),
    scanlineAmount: readClampedNumber(record.scanlineAmount, fallback.scanlineAmount, 0, 1),
    bloomAmount: readClampedNumber(record.bloomAmount, fallback.bloomAmount, 0, 1),
    curvature: readClampedNumber(record.curvature, fallback.curvature, 0, 1),
    vignette: readClampedNumber(record.vignette, fallback.vignette, 0, 1),
    chromaticOffset: readClampedNumber(record.chromaticOffset, fallback.chromaticOffset, 0, 1),
    grain: readClampedNumber(record.grain, fallback.grain, 0, 1),
  }
}

function sanitizeAsciiCharsetStyle(value: unknown, fallback: StudioAsciiCharsetStyle): StudioAsciiCharsetStyle {
  return ASCII_CHARSET_STYLES.includes(value as StudioAsciiCharsetStyle) ? (value as StudioAsciiCharsetStyle) : fallback
}

function sanitizeAsciiPalette(value: unknown, fallback: StudioAsciiPalette): StudioAsciiPalette {
  return ASCII_PALETTES.includes(value as StudioAsciiPalette) ? (value as StudioAsciiPalette) : fallback
}

function sanitizePostFxLayer(value: unknown, index: number): StudioPostFxLayer {
  const record = readRecord(value)

  return {
    id: typeof record.id === 'string' ? record.id : createPostFxLayerId(index),
    effectId: sanitizePostFxEffectId(record.effectId),
    enabled: typeof record.enabled === 'boolean' ? record.enabled : true,
    intensity: clampLayerIntensity(record.intensity),
    locked: typeof record.locked === 'boolean' ? record.locked : false,
  }
}

function sanitizePostFxEffectId(value: unknown): StudioPostFxLayer['effectId'] {
  if (
    value === 'noise' ||
    value === 'bloom' ||
    value === 'vignette' ||
    value === 'brightness-contrast' ||
    value === 'hue-saturation' ||
    value === 'glitch' ||
    value === 'chromatic-aberration' ||
    value === 'scanline' ||
    value === 'shockwave' ||
    value === 'pixelation'
  ) {
    return value
  }

  return 'noise'
}

function sanitizePatternLayer(value: unknown, index: number): StudioPatternLayer {
  const record = readRecord(value)

  return {
    id: typeof record.id === 'string' ? record.id : createPatternLayerId(index),
    source: sanitizePatternLayerSource(record.source),
    target: sanitizePatternLayerTarget(record.target),
    enabled: typeof record.enabled === 'boolean' ? record.enabled : true,
    intensity: clampLayerIntensity(record.intensity),
    blendMode: sanitizeLayerBlendMode(record.blendMode),
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

function sanitizeMeshState(value: unknown, fallback: StudioStoreState['mesh']): StudioStoreState['mesh'] {
  const record = readRecord(value)
  const rotation = readRecord(record.rotation)
  const position = readRecord(record.position)
  const repeat = readRecord(record.repeat)
  const deform = readRecord(record.deform)

  return {
    extrusionDepth: readClampedNumber(record.extrusionDepth, fallback.extrusionDepth, 0.01, 1),
    thickness: readClampedNumber(record.thickness, fallback.thickness, -0.4, 0.4),
    bevel: readClampedNumber(record.bevel, fallback.bevel, 0, 0.3),
    twist: readClampedNumber(record.twist, fallback.twist, -360, 360),
    taper: readClampedNumber(record.taper, fallback.taper, -0.8, 0.8),
    bend: readClampedNumber(record.bend, fallback.bend, -360, 360),
    deform: sanitizeCharacterMeshDeformSettings(deform, fallback.deform),
    repeat: {
      enabled: typeof repeat.enabled === 'boolean' ? repeat.enabled : fallback.repeat.enabled,
      count: Math.round(readClampedNumber(
        repeat.count,
        fallback.repeat.count,
        MIN_CHARACTER_REPEAT_COUNT,
        MAX_CHARACTER_REPEAT_COUNT,
      )),
      radius: readClampedNumber(
        repeat.radius,
        fallback.repeat.radius,
        MIN_CHARACTER_REPEAT_RADIUS,
        MAX_CHARACTER_REPEAT_RADIUS,
      ),
      orientation: readClampedNumber(
        repeat.orientation,
        fallback.repeat.orientation,
        MIN_CHARACTER_REPEAT_ORIENTATION,
        MAX_CHARACTER_REPEAT_ORIENTATION,
      ),
      size: readClampedNumber(
        repeat.size,
        fallback.repeat.size,
        MIN_CHARACTER_REPEAT_SIZE,
        MAX_CHARACTER_REPEAT_SIZE,
      ),
    },
    rotation: {
      x: readClampedNumber(rotation.x, fallback.rotation.x, -Math.PI, Math.PI),
      y: readClampedNumber(rotation.y, fallback.rotation.y, -Math.PI, Math.PI),
      z: readClampedNumber(rotation.z, fallback.rotation.z, -Math.PI, Math.PI),
    },
    scale: readClampedNumber(record.scale, fallback.scale, 0.1, 10),
    position: {
      x: readClampedNumber(position.x, fallback.position.x, -4, 4),
      y: readClampedNumber(position.y, fallback.position.y, -4, 4),
    },
    autoRotate: typeof record.autoRotate === 'boolean' ? record.autoRotate : fallback.autoRotate,
    autoRotateSpeed: readClampedNumber(record.autoRotateSpeed, fallback.autoRotateSpeed, 0, 4),
  }
}

function createDefaultMeshState(): StudioStoreState['mesh'] {
  return {
    ...DEFAULT_MESH_STATE,
    deform: {
      bulgePinch: { ...DEFAULT_MESH_STATE.deform.bulgePinch },
      squashStretch: { ...DEFAULT_MESH_STATE.deform.squashStretch },
      wave: { ...DEFAULT_MESH_STATE.deform.wave },
      surfaceNoise: { ...DEFAULT_MESH_STATE.deform.surfaceNoise },
      inflate: { ...DEFAULT_MESH_STATE.deform.inflate },
      curl: { ...DEFAULT_MESH_STATE.deform.curl },
    },
    repeat: { ...DEFAULT_MESH_STATE.repeat },
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
    theme: sanitizeStudioTheme(value.theme, fallback.theme),
    mobileTab: sanitizeMobileTab(value.mobileTab, fallback.mobileTab),
    settingsOpen: typeof value.settingsOpen === 'boolean' ? value.settingsOpen : fallback.settingsOpen,
    expandedSections: sanitizeExpandedSections(value.expandedSections, fallback.expandedSections),
    previewZoom: readClampedNumber(value.previewZoom, fallback.previewZoom, 0.25, 4),
    previewPan: sanitizePreviewPan(value.previewPan, fallback.previewPan),
  }
}

function sanitizeExportState(value: unknown, fallback: StudioStoreState['export']) {
  const record = readRecord(value)

  return {
    selectedFormat: sanitizeExportFormat(record.selectedFormat, fallback.selectedFormat),
    highQuality: typeof record.highQuality === 'boolean' ? record.highQuality : fallback.highQuality,
  }
}

function sanitizeStudioTheme(value: unknown, fallback: StudioTheme): StudioTheme {
  return value === 'dark' || value === 'light' ? value : fallback
}

function sanitizeMobileTab(value: unknown, fallback: StudioMobileTab): StudioMobileTab {
  return value === 'input' || value === 'effects' || value === 'animation' || value === 'export' ? value : fallback
}

function sanitizeExportFormat(value: unknown, fallback: StudioExportFormat): StudioExportFormat {
  return value === 'png' || value === 'apng' || value === 'gif' || value === 'mp4' ? value : fallback
}

function sanitizeExpandedSections(
  value: unknown,
  fallback: Record<StudioSectionId, boolean>
): Record<StudioSectionId, boolean> {
  const record = readRecord(value)

  return {
    input: typeof record.input === 'boolean' ? record.input : fallback.input,
    effects: typeof record.effects === 'boolean' ? record.effects : fallback.effects,
    modelDeform: typeof record.modelDeform === 'boolean' ? record.modelDeform : fallback.modelDeform,
    animation: typeof record.animation === 'boolean' ? record.animation : fallback.animation,
    presets: typeof record.presets === 'boolean' ? record.presets : fallback.presets,
    settings: typeof record.settings === 'boolean' ? record.settings : fallback.settings,
    processing: typeof record.processing === 'boolean' ? record.processing : fallback.processing,
    postProcessing: typeof record.postProcessing === 'boolean' ? record.postProcessing : fallback.postProcessing,
    export: typeof record.export === 'boolean' ? record.export : fallback.export,
  }
}

function sanitizePreviewPan(value: unknown, fallback: StudioStoreState['view']['previewPan']) {
  const record = readRecord(value)

  return {
    x: readClampedNumber(record.x, fallback.x, -2000, 2000),
    y: readClampedNumber(record.y, fallback.y, -2000, 2000),
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

  if (panel === '3') {
    return 'randomize'
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

  if (activePanel === 'randomize') {
    return '3'
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

function sanitizeHexColor(value: unknown, fallback: string) {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback
}

function readClampedNumber(value: unknown, fallback: number, min: number, max: number) {
  return Math.min(max, Math.max(min, readNumber(value, fallback)))
}

function readClampedInteger(value: unknown, fallback: number, min: number, max: number) {
  return Math.trunc(readClampedNumber(value, fallback, min, max))
}

function readRoundedClampedInteger(value: unknown, fallback: number, min: number, max: number) {
  return Math.round(readClampedNumber(value, fallback, min, max))
}

function isStudioActivePanel(value: unknown): value is StudioActivePanel {
  return (
    value === 'character' ||
    value === 'morph' ||
    value === 'shader' ||
    value === 'ascii' ||
    value === 'asciiStyle' ||
    value === 'pattern' ||
    value === 'animation' ||
    value === 'post' ||
    value === 'randomize'
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isDataUrl(value: string) {
  return value.startsWith('data:')
}
