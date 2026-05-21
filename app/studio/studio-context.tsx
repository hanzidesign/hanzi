'use client'

import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { chars } from '@/assets/chars'
import { countries } from '@/assets/list'

export type ColorTarget = 'text' | 'bg'

export type StudioState = {
  charUrl: string
  svgData: string
  ptnUrl: string
  ptnData: string
  seed: number
  isTc: boolean
  distortion: number
  blur: number
  width: number
  x: number
  y: number
  rotation: number
  textColor: string
  bgColor: string
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

type StudioContextValue = {
  state: StudioState
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
}

const DEFAULT_COUNTRY = 'int'
const DEFAULT_YEAR = '2023'
const DEFAULT_IS_TC = true

const StudioContext = createContext<StudioContextValue | null>(null)

export function StudioProvider({ children }: React.PropsWithChildren) {
  const [state, dispatch] = useReducer(studioReducer, createInitialState())

  useEffect(() => {
    let active = true

    readText(state.charUrl).then((svgData) => {
      if (active) {
        dispatch({ type: 'setSvgData', svgData })
      }
    })

    return () => {
      active = false
    }
  }, [state.charUrl])

  useEffect(() => {
    let active = true

    if (state.ptnUrl) {
      readDataUrl(state.ptnUrl)
        .then((ptnData) => {
          if (active) {
            dispatch({ type: 'setPatternData', ptnData, ptnUrl: state.ptnUrl })
          }
        })
        .catch(() => {
          if (active) {
            dispatch({ type: 'setPatternData', ptnData: '', ptnUrl: state.ptnUrl })
          }
        })
    }

    return () => {
      active = false
    }
  }, [state.ptnUrl])

  const value = useMemo<StudioContextValue>(
    () => ({
      state,
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
    }),
    [state]
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
      return {
        ...state,
        ...getCharacterState(action.country, action.year, isTc),
      }
    }
    case 'setSvgData':
      return { ...state, svgData: action.svgData }
    case 'setPatternSeed':
      return {
        ...state,
        seed: action.seed,
        ptnUrl: toPatternUrl(action.seed),
        ptnData: '',
      }
    case 'setPatternUrl':
      return {
        ...state,
        ptnUrl: action.ptnUrl,
        ptnData: '',
      }
    case 'setPatternData':
      return {
        ...state,
        ptnData: action.ptnData,
        ptnUrl: action.ptnUrl ?? '',
      }
    case 'setDistortion':
      return { ...state, distortion: action.distortion }
    case 'setBlur':
      return { ...state, blur: action.blur }
    case 'setWidth':
      return { ...state, width: action.width }
    case 'setPosition':
      return {
        ...state,
        x: typeof action.x === 'number' ? action.x : state.x,
        y: typeof action.y === 'number' ? action.y : state.y,
      }
    case 'setRotation':
      return { ...state, rotation: action.rotation }
    case 'setColor':
      return action.target === 'text' ? { ...state, textColor: action.color } : { ...state, bgColor: action.color }
    case 'setPanel':
      return { ...state, panel: action.panel }
    case 'resetEffect':
      return {
        ...state,
        distortion: 10,
        blur: 0,
        width: 0,
        x: 0,
        y: 0,
        rotation: 0,
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
    distortion: 10,
    blur: 0,
    width: 0,
    x: 0,
    y: 0,
    rotation: 0,
    textColor: '#000',
    bgColor: '#fff',
    panel: '0',
  }
}

function getCharacterState(country: string, year: string, isTc: boolean) {
  const script = isTc ? 'tc' : 'sc'
  const ch = chars[script][country][year]
  const charUrl = `/chars/${script}/${country}/${year}.svg`
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

async function readText(url: string) {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to load ${url}`)
    }
    return response.text()
  } catch {
    return fallbackSvgData(url)
  }
}

async function readDataUrl(url: string) {
  const response = await fetch(url)
  const blob = await response.blob()

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error(`Failed to read ${url}`))
      }
    })
    reader.addEventListener('error', () => reject(reader.error))
    reader.readAsDataURL(blob)
  })
}

function toPatternUrl(seed: number) {
  return `/images/patterns/${String(seed).padStart(3, '0')}.jpg`
}
