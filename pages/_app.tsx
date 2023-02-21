import '@rainbow-me/rainbowkit/styles.css'
import '../styles/globals.css'

import { getDefaultWallets, RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { configureChains, createClient, WagmiConfig } from 'wagmi'
import { mainnet, polygon, optimism, arbitrum } from 'wagmi/chains'
import { alchemyProvider } from 'wagmi/providers/alchemy'
import { publicProvider } from 'wagmi/providers/public'
import { Provider } from 'react-redux'
import { MantineProvider } from '@mantine/core'
import { AppProvider } from 'hooks/useAppContext'
import { wrapper } from 'store'
import type { AppProps } from 'next/app'

const { chains, provider } = configureChains(
  [mainnet, polygon, optimism, arbitrum],
  [alchemyProvider({ apiKey: process.env.ALCHEMY_KEY_GOERLI }), publicProvider()]
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
  const { pageProps } = props

  return (
    <WagmiConfig client={wagmiClient}>
      <RainbowKitProvider chains={chains}>
        <Provider store={store}>
          <AppProvider>
            <MantineProvider theme={{ colorScheme: 'light' }} withGlobalStyles withNormalizeCSS>
              <Component {...pageProps} />
            </MantineProvider>
          </AppProvider>
        </Provider>
      </RainbowKitProvider>
    </WagmiConfig>
  )
}

export default MyApp
