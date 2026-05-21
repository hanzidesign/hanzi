'use client'

import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { chars, toCharUrl } from '@/assets/chars'
import { countries } from '@/assets/list'
import { fetchDataUrl, isAbortError } from '@/utils/dataUrl'
import type { StudioEditorState } from '@/types'

export type ColorTarget = 'text' | 'bg'

export const DEFAULT_EFFECT_STATE = {
  distortion: 10,
  blur: 0,
  width: 0,
  x: 0,
  y: 0,
  rotation: 0,
} satisfies Pick<StudioEditorState, 'distortion' | 'blur' | 'width' | 'x' | 'y' | 'rotation'>

export const DEFAULT_STYLE_STATE = {
  textColor: '#000',
  bgColor: '#fff',
} satisfies Pick<StudioEditorState, 'textColor' | 'bgColor'>

export type StudioState = StudioEditorState & {
  seed: number
  isTc: boolean
  country: string
  year: string
  ch: string
  panel: string | null
}

type StudioAction =
  | { type: 'setCharacter'; country: string; year: string; isTc?: boolean }
  | { type: 'setSvgData'; svgData: string }
  | { type: 'setPatternSeed'; seed: number }
  | { type: 'setPatternUrl'; ptnUrl: string }
  | { type: 'setPatternData'; ptnData: string; ptnUrl?: string }
  | { type: 'setDistortion'; distortion: number }
  | { type: 'setBlur'; blur: number }
  | { type: 'setWidth'; width: number }
  | { type: 'setPosition'; x?: number; y?: number }
  | { type: 'setRotation'; rotation: number }
  | { type: 'setColor'; target: ColorTarget; color: string }
  | { type: 'setPanel'; panel: string | null }
  | { type: 'resetEffect' }
  | { type: 'resetStyle' }

type StudioContextValue = {
  state: StudioState
} & StudioActions

type StudioActions = {
  setCharacter: (country: string, year: string, isTc?: boolean) => void
  setPatternSeed: (seed: number) => void
  setPatternUrl: (ptnUrl: string) => void
  setPatternData: (ptnData: string) => void
  setDistortion: (distortion: number) => void
  setBlur: (blur: number) => void
  setWidth: (width: number) => void
  setPosition: (position: { x?: number; y?: number }) => void
  setRotation: (rotation: number) => void
  setColor: (target: ColorTarget, color: string) => void
  setPanel: (panel: string | null) => void
  resetEffect: () => void
  resetStyle: () => void
}

const DEFAULT_COUNTRY = 'int'
const DEFAULT_YEAR = '2023'
const DEFAULT_IS_TC = true

const StudioContext = createContext<StudioContextValue | null>(null)

export function StudioProvider({ children }: React.PropsWithChildren) {
  const [state, dispatch] = useReducer(studioReducer, createInitialState())

  useEffect(() => {
    const controller = new AbortController()

    readText(state.charUrl, controller.signal)
      .then((svgData) => {
        dispatch({ type: 'setSvgData', svgData })
      })
      .catch((error) => {
        if (!isAbortError(error)) {
          dispatch({ type: 'setSvgData', svgData: fallbackSvgData(state.charUrl) })
        }
      })

    return () => {
      controller.abort()
    }
  }, [state.charUrl])

  useEffect(() => {
    if (!state.ptnUrl) return

    const controller = new AbortController()

    fetchDataUrl(state.ptnUrl, controller.signal)
      .then((ptnData) => {
        dispatch({ type: 'setPatternData', ptnData, ptnUrl: state.ptnUrl })
      })
      .catch((error) => {
        if (!isAbortError(error)) {
          dispatch({ type: 'setPatternData', ptnData: '', ptnUrl: state.ptnUrl })
        }
      })

    return () => {
      controller.abort()
    }
  }, [state.ptnUrl])

  const actions = useMemo<StudioActions>(
    () => ({
      setCharacter: (country, year, isTc) => dispatch({ type: 'setCharacter', country, year, isTc }),
      setPatternSeed: (seed) => dispatch({ type: 'setPatternSeed', seed }),
      setPatternUrl: (ptnUrl) => dispatch({ type: 'setPatternUrl', ptnUrl }),
      setPatternData: (ptnData) => dispatch({ type: 'setPatternData', ptnData, ptnUrl: undefined }),
      setDistortion: (distortion) => dispatch({ type: 'setDistortion', distortion }),
      setBlur: (blur) => dispatch({ type: 'setBlur', blur }),
      setWidth: (width) => dispatch({ type: 'setWidth', width }),
      setPosition: (position) => dispatch({ type: 'setPosition', ...position }),
      setRotation: (rotation) => dispatch({ type: 'setRotation', rotation }),
      setColor: (target, color) => dispatch({ type: 'setColor', target, color }),
      setPanel: (panel) => dispatch({ type: 'setPanel', panel }),
      resetEffect: () => dispatch({ type: 'resetEffect' }),
      resetStyle: () => dispatch({ type: 'resetStyle' }),
    }),
    []
  )

  const value = useMemo<StudioContextValue>(
    () => ({
      state,
      ...actions,
    }),
    [actions, state]
  )

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>
}

export function useStudio() {
  const context = useContext(StudioContext)
  if (!context) {
    throw new Error('useStudio must be used inside StudioProvider')
  }
  return context
}

function studioReducer(state: StudioState, action: StudioAction): StudioState {
  switch (action.type) {
    case 'setCharacter': {
      const isTc = action.isTc ?? state.isTc
      if (state.country === countries[action.country] && state.year === action.year && state.isTc === isTc) {
        return state
      }
      return {
        ...state,
        ...getCharacterState(action.country, action.year, isTc),
      }
    }
    case 'setSvgData':
      if (state.svgData === action.svgData) {
        return state
      }
      return { ...state, svgData: action.svgData }
    case 'setPatternSeed': {
      const ptnUrl = toPatternUrl(action.seed)
      if (state.seed === action.seed && state.ptnUrl === ptnUrl) {
        return state
      }
      return {
        ...state,
        seed: action.seed,
        ptnUrl,
        ptnData: '',
      }
    }
    case 'setPatternUrl':
      if (state.ptnUrl === action.ptnUrl) {
        return state
      }
      return {
        ...state,
        ptnUrl: action.ptnUrl,
        ptnData: '',
      }
    case 'setPatternData': {
      const ptnUrl = action.ptnUrl ?? ''
      if (state.ptnData === action.ptnData && state.ptnUrl === ptnUrl) {
        return state
      }
      return {
        ...state,
        ptnData: action.ptnData,
        ptnUrl,
      }
    }
    case 'setDistortion':
      if (state.distortion === action.distortion) {
        return state
      }
      return { ...state, distortion: action.distortion }
    case 'setBlur':
      if (state.blur === action.blur) {
        return state
      }
      return { ...state, blur: action.blur }
    case 'setWidth':
      if (state.width === action.width) {
        return state
      }
      return { ...state, width: action.width }
    case 'setPosition': {
      const x = typeof action.x === 'number' ? action.x : state.x
      const y = typeof action.y === 'number' ? action.y : state.y
      if (state.x === x && state.y === y) {
        return state
      }
      return {
        ...state,
        x,
        y,
      }
    }
    case 'setRotation':
      if (state.rotation === action.rotation) {
        return state
      }
      return { ...state, rotation: action.rotation }
    case 'setColor':
      if (action.target === 'text' && state.textColor === action.color) {
        return state
      }
      if (action.target === 'bg' && state.bgColor === action.color) {
        return state
      }
      return action.target === 'text' ? { ...state, textColor: action.color } : { ...state, bgColor: action.color }
    case 'setPanel':
      if (state.panel === action.panel) {
        return state
      }
      return { ...state, panel: action.panel }
    case 'resetEffect':
      if (isEffectDefault(state)) {
        return state
      }
      return {
        ...state,
        ...DEFAULT_EFFECT_STATE,
      }
    case 'resetStyle':
      if (state.textColor === DEFAULT_STYLE_STATE.textColor && state.bgColor === DEFAULT_STYLE_STATE.bgColor) {
        return state
      }
      return {
        ...state,
        ...DEFAULT_STYLE_STATE,
      }
    default:
      return state
  }
}

function createInitialState(): StudioState {
  return {
    ...getCharacterState(DEFAULT_COUNTRY, DEFAULT_YEAR, DEFAULT_IS_TC),
    svgData: '',
    ptnUrl: toPatternUrl(0),
    ptnData: '',
    seed: 0,
    ...DEFAULT_EFFECT_STATE,
    ...DEFAULT_STYLE_STATE,
    panel: '0',
  }
}

function getCharacterState(country: string, year: string, isTc: boolean) {
  const script = isTc ? 'tc' : 'sc'
  const ch = chars[script][country][year]
  const charUrl = toCharUrl(script, country, year)
  return {
    charUrl,
    svgData: fallbackSvgData(charUrl),
    country: countries[country],
    year,
    ch,
    isTc,
  }
}

function fallbackSvgData(url: string) {
  return `<image href="${url}" x="0" y="0" width="100%" height="100%" />`
}

async function readText(url: string, signal?: AbortSignal) {
  try {
    const response = await fetch(url, { signal })
    if (!response.ok) {
      throw new Error(`Failed to load ${url}`)
    }
    return response.text()
  } catch (error) {
    if (isAbortError(error)) {
      throw error
    }
    return fallbackSvgData(url)
  }
}

function toPatternUrl(seed: number) {
  return `/images/patterns/${String(seed).padStart(3, '0')}.jpg`
}

function isEffectDefault(state: StudioState) {
  return (
    state.distortion === DEFAULT_EFFECT_STATE.distortion &&
    state.blur === DEFAULT_EFFECT_STATE.blur &&
    state.width === DEFAULT_EFFECT_STATE.width &&
    state.x === DEFAULT_EFFECT_STATE.x &&
    state.y === DEFAULT_EFFECT_STATE.y &&
    state.rotation === DEFAULT_EFFECT_STATE.rotation
  )
}
