'use client'

import { usePathname } from 'next/navigation'
import { MantineProvider } from '@mantine/core'
import { ModalsProvider } from '@mantine/modals'
import ReduxProvider from '@/store/ReduxProvider'
import EthProvider from '@/components/providers/EthProvider'
import { AppProvider } from '@/hooks/useAppContext'
import { theme } from '@/theme'
import { publicEnv } from '@/utils/env'

export default function Providers({ children }: React.PropsWithChildren) {
  const pathname = usePathname()
  const atHome = pathname === '/'
  return (
    <>
      <AppProvider>
        <ReduxProvider>
          <MantineProvider theme={theme} defaultColorScheme={publicEnv.defaultColorScheme}>
            <ModalsProvider modalProps={{ size: 'xl', radius: 'lg', centered: true }}>
              {atHome ? <>{children}</> : <EthProvider>{children}</EthProvider>}
            </ModalsProvider>
          </MantineProvider>
        </ReduxProvider>
      </AppProvider>
    </>
  )
}
