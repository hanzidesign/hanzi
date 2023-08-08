import '@rainbow-me/rainbowkit/styles.css'
import '../styles/globals.css'

import { getDefaultWallets, RainbowKitProvider, lightTheme } from '@rainbow-me/rainbowkit'
import { configureChains, createClient, WagmiConfig } from 'wagmi'
import { optimism } from 'wagmi/chains'
import { alchemyProvider } from 'wagmi/providers/alchemy'
import { publicProvider } from 'wagmi/providers/public'
import { Provider } from 'react-redux'
import { MantineProvider, useMantineTheme } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { ModalsProvider } from '@mantine/modals'
import { PersistGate } from 'redux-persist/integration/react'
import { persistStore } from 'redux-persist'
import { AppProvider } from 'hooks/useAppContext'
import { wrapper } from 'store'
import { myTheme } from 'theme'
import PageHead from 'components/PageHead'
import type { AppProps } from 'next/app'

const { chains, provider } = configureChains(
  [optimism],
  [alchemyProvider({ apiKey: process.env.NEXT_PUBLIC_ALCHEMY_KEY_OPTIMISM }), publicProvider()]
)

const { connectors } = getDefaultWallets({
  appName: 'My RainbowKit App',
  chains,
})

const wagmiClient = createClient({
  autoConnect: true,
  connectors,
  provider,
})

function MyApp({ Component, ...rest }: AppProps) {
  const { store, props } = wrapper.useWrappedStore(rest)
  const persistor = persistStore(store)
  const { pageProps } = props
  const theme = useMantineTheme()

  return (
    <>
      <PageHead />
      <WagmiConfig client={wagmiClient}>
        <RainbowKitProvider
          chains={chains}
          initialChain={optimism}
          appInfo={{
            appName: 'Hanzi Design',
          }}
          theme={lightTheme({
            accentColor: theme.colors.gray[9],
          })}
        >
          <Provider store={store}>
            <PersistGate loading={null} persistor={persistor}>
              <AppProvider>
                <MantineProvider theme={myTheme} withGlobalStyles withNormalizeCSS>
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
