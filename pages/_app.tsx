import '@rainbow-me/rainbowkit/styles.css'
import '@mantine/core/styles.css'
import '../styles/globals.css'

import { getDefaultWallets, RainbowKitProvider, lightTheme } from '@rainbow-me/rainbowkit'
import { configureChains, createConfig, WagmiConfig } from 'wagmi'
import { optimism } from 'wagmi/chains'
import { alchemyProvider } from 'wagmi/providers/alchemy'
import { publicProvider } from 'wagmi/providers/public'
import { Provider } from 'react-redux'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { ModalsProvider } from '@mantine/modals'
import { PersistGate } from 'redux-persist/integration/react'
import { persistStore } from 'redux-persist'
import { AppProvider } from 'hooks/useAppContext'
import { wrapper } from 'store'
import { myTheme } from 'theme'
import { env } from 'utils/env'
import PageHead from 'components/PageHead'
import type { AppProps } from 'next/app'

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [optimism],
  [alchemyProvider({ apiKey: process.env.NEXT_PUBLIC_ALCHEMY_KEY_OPTIMISM }), publicProvider()]
)

const { connectors } = getDefaultWallets({
  appName: env.appName,
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT,
  chains,
})

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
})

function MyApp({ Component, ...rest }: AppProps) {
  const { store, props } = wrapper.useWrappedStore(rest)
  const { pageProps } = props

  const persistor = persistStore(store)

  return (
    <>
      <PageHead />
      <WagmiConfig config={wagmiConfig}>
        <RainbowKitProvider
          chains={chains}
          initialChain={optimism}
          appInfo={{
            appName: env.appName,
          }}
          theme={lightTheme({
            accentColor: '#212529',
          })}
        >
          <Provider store={store}>
            <PersistGate loading={null} persistor={persistor}>
              <AppProvider>
                <MantineProvider theme={myTheme}>
                  <Notifications />
                  <ModalsProvider>
                    <Component {...pageProps} />
                  </ModalsProvider>
                </MantineProvider>
              </AppProvider>
            </PersistGate>
          </Provider>
        </RainbowKitProvider>
      </WagmiConfig>
    </>
  )
}

export default MyApp
