'use client'

import { MantineProvider } from '@mantine/core'
import { theme } from '@/theme'
import { publicEnv } from '@/utils/env'

export default function Providers({ children }: React.PropsWithChildren) {
  return (
    <MantineProvider theme={theme} defaultColorScheme={publicEnv.defaultColorScheme}>
      {children}
    </MantineProvider>
  )
}
