'use client'

import _ from 'lodash'
import { createContext, useContext, useMemo, useState } from 'react'

const initialState = {
  dalleBg: [''] as string[],
  activeBg: 1, // dalleBg
  dalleImages: [] as string[],
  activeImg: 1, // dalleImages
  showDelle: false,
}

type AppState = typeof initialState

const MISSING_PROVIDER = Symbol()
const AppContext = createContext<
  | {
      state: AppState
      updateState: (value: Partial<AppState>) => void
      getActiveImg: () => string | undefined
      getActiveBg: () => string | undefined
    }
  | typeof MISSING_PROVIDER
>(MISSING_PROVIDER)

export function useAppContext() {
  const app = useContext(AppContext)
  if (app === MISSING_PROVIDER) {
    throw new Error('App hooks must be wrapped in a <AppProvider>')
  }
  return app
}

export function AppProvider(props: React.PropsWithChildren<{}>) {
  const { children } = props
  const [state, setState] = useState<AppState>(initialState)

  const value = useMemo(
    () => ({
      state,
      updateState: (value: Partial<AppState>) => setState((state) => ({ ...state, ...value })),
      getActiveImg: () => state.dalleImages[state.activeImg - 1],
      getActiveBg: () => state.dalleBg[state.activeBg - 1],
    }),
    [state]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
