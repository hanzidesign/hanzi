'use client'

import { createContext, useContext, useEffect, useMemo } from 'react'
import {
  DEFAULT_EFFECT_STATE,
  DEFAULT_VIEW_STATE,
  fallbackSvgData,
  getCharacterDisplayState,
  useStudioStore,
} from '@/app/studio/studio-store'
import { fetchDataUrl, isAbortError } from '@/utils/dataUrl'
import type { StudioEditorState } from '@/types'

export type ColorTarget = 'text' | 'bg'

export { DEFAULT_EFFECT_STATE }

export const DEFAULT_STYLE_STATE = {
  textColor: DEFAULT_EFFECT_STATE.textColor,
  bgColor: DEFAULT_VIEW_STATE.backgroundColor,
} satisfies Pick<StudioEditorState, 'textColor' | 'bgColor'>

export type StudioState = StudioEditorState & {
  seed: number
  isTc: boolean
  country: string
  year: string
  ch: string
  panel: string | null
}

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

const StudioContext = createContext<StudioContextValue | null>(null)

export function StudioProvider({ children }: React.PropsWithChildren) {
  const characterSelection = useStudioStore((store) => store.character)
  const runtime = useStudioStore((store) => store.runtime)
  const ptnUrl = useStudioStore((store) => store.displacement.patternUrl)
  const svgEffect = useStudioStore((store) => store.svgEffect)
  const backgroundColor = useStudioStore((store) => store.view.backgroundColor)
  const setStoreCharacter = useStudioStore((store) => store.setCharacter)
  const setSvgData = useStudioStore((store) => store.setSvgData)
  const setPatternSeed = useStudioStore((store) => store.setPatternSeed)
  const setPatternUrl = useStudioStore((store) => store.setPatternUrl)
  const setPatternData = useStudioStore((store) => store.setPatternData)
  const setPatternDataForSource = useStudioStore(
    (store) => store.setPatternDataForSource,
  )
  const setSvgEffectControl = useStudioStore(
    (store) => store.setSvgEffectControl,
  )
  const setTextColor = useStudioStore((store) => store.setTextColor)
  const setBackgroundColor = useStudioStore(
    (store) => store.setBackgroundColor,
  )
  const setCompatibilityPanel = useStudioStore(
    (store) => store.setCompatibilityPanel,
  )
  const resetSvgEffect = useStudioStore((store) => store.resetSvgEffect)
  const resetStyle = useStudioStore((store) => store.resetStyle)
  const character = useMemo(
    () => getCharacterDisplayState(characterSelection),
    [characterSelection],
  )
  const svgData = runtime.svgData || fallbackSvgData(character.charUrl)

  useEffect(() => {
    const controller = new AbortController()

    readText(character.charUrl, controller.signal)
      .then((nextSvgData) => {
        setSvgData(nextSvgData)
      })
      .catch((error) => {
        if (!isAbortError(error)) {
          setSvgData(fallbackSvgData(character.charUrl))
        }
      })

    return () => {
      controller.abort()
    }
  }, [character.charUrl, setSvgData])

  useEffect(() => {
    if (!ptnUrl) return

    const controller = new AbortController()

    fetchDataUrl(ptnUrl, controller.signal)
      .then((ptnData) => {
        setPatternDataForSource(ptnUrl, ptnData)
      })
      .catch((error) => {
        if (!isAbortError(error)) {
          setPatternDataForSource(ptnUrl, '')
        }
      })

    return () => {
      controller.abort()
    }
  }, [ptnUrl, setPatternDataForSource])

  const state = useMemo<StudioState>(
    () => ({
      ...character,
      svgData,
      ptnUrl,
      ptnData: runtime.ptnData,
      seed: svgEffect.seed,
      distortion: svgEffect.distortion,
      blur: svgEffect.blur,
      width: svgEffect.width,
      x: svgEffect.x,
      y: svgEffect.y,
      rotation: svgEffect.rotation,
      textColor: svgEffect.textColor,
      bgColor: backgroundColor,
      panel: svgEffect.panel,
    }),
    [backgroundColor, character, ptnUrl, runtime.ptnData, svgData, svgEffect],
  )

  const actions = useMemo<StudioActions>(
    () => ({
      setCharacter: setStoreCharacter,
      setPatternSeed,
      setPatternUrl,
      setPatternData,
      setDistortion: (distortion) => {
        setSvgEffectControl({ distortion })
      },
      setBlur: (blur) => {
        setSvgEffectControl({ blur })
      },
      setWidth: (width) => {
        setSvgEffectControl({ width })
      },
      setPosition: (position) => {
        setSvgEffectControl(position)
      },
      setRotation: (rotation) => {
        setSvgEffectControl({ rotation })
      },
      setColor: (target, color) => {
        if (target === 'text') {
          setTextColor(color)
          return
        }

        setBackgroundColor(color)
      },
      setPanel: setCompatibilityPanel,
      resetEffect: resetSvgEffect,
      resetStyle,
    }),
    [
      resetStyle,
      resetSvgEffect,
      setBackgroundColor,
      setCompatibilityPanel,
      setPatternData,
      setPatternSeed,
      setPatternUrl,
      setStoreCharacter,
      setSvgEffectControl,
      setTextColor,
    ],
  )

  const value = useMemo<StudioContextValue>(
    () => ({
      state,
      ...actions,
    }),
    [actions, state],
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
