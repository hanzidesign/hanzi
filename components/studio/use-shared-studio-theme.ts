'use client'

import { useComputedColorScheme, useMantineColorScheme } from '@mantine/core'
import { useEffect } from 'react'
import { useStudioStore, type StudioTheme } from '@/app/studio/studio-store'

function isStudioTheme(value: string | undefined): value is StudioTheme {
  return value === 'light' || value === 'dark'
}

export function useSharedStudioTheme() {
  const computedColorScheme = useComputedColorScheme('dark')
  const { toggleColorScheme } = useMantineColorScheme()
  const theme = useStudioStore((store) => store.view.theme)
  const setStudioTheme = useStudioStore((store) => store.setStudioTheme)

  useEffect(() => {
    const documentTheme = document.documentElement.getAttribute('data-mantine-color-scheme') ?? undefined
    const resolvedTheme = isStudioTheme(documentTheme)
      ? documentTheme
      : computedColorScheme

    if (resolvedTheme !== theme) {
      setStudioTheme(resolvedTheme)
    }
  }, [computedColorScheme, setStudioTheme, theme])

  return { theme, toggleColorScheme }
}
