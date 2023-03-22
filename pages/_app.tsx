import '@rainbow-me/rainbowkit/styles.css'
import '../styles/globals.css'

import { getDefaultWallets, RainbowKitProvider, lightTheme } from '@rainbow-me/rainbowkit'
import { configureChains, createClient, WagmiConfig } from 'wagmi'
import { optimism, goerli } from 'wagmi/chains'
import { alchemyProvider } from 'wagmi/providers/alchemy'
import { publicProvider } from 'wagmi/providers/public'
import { Provider } from 'react-redux'
import { MantineProvider, useMantineTheme } from '@mantine/core'
import { ModalsProvider } from '@mantine/modals'
import { PersistGate } from 'redux-persist/integration/react'
import { persistStore } from 'redux-persist'
import { AppProvider } from 'hooks/useAppContext'
import { wrapper } from 'store'
import { myTheme } from 'theme'
import type { AppProps } from 'next/app'

const { chains, provider } = configureChains(
  [goerli, optimism],
  [alchemyProvider({ apiKey: process.env.NEXT_PUBLIC_ALCHEMY_KEY_GOERLI }), publicProvider()]
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
    <WagmiConfig client={wagmiClient}>
      <RainbowKitProvider
        chains={chains}
        initialChain={goerli}
        appInfo={{
          appName: 'Chinese NFT',
        }}
        theme={lightTheme({
          accentColor: theme.colors.gray[9],
        })}
      >
        <Provider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <AppProvider>
              <MantineProvider theme={myTheme} withGlobalStyles withNormalizeCSS>
                <ModalsProvider>
                  <Component {...pageProps} />
                </ModalsProvider>
              </MantineProvider>
            </AppProvider>
          </PersistGate>
        </Provider>
      </RainbowKitProvider>
    </WagmiConfig>
  )
}

export default MyApp
