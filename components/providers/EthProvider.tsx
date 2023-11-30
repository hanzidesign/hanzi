'use client'

import { useEffect } from 'react'
import { getDefaultWallets, RainbowKitProvider, lightTheme } from '@rainbow-me/rainbowkit'
import { configureChains, createConfig, WagmiConfig } from 'wagmi'
import { optimism, optimismGoerli } from 'wagmi/chains'
import { alchemyProvider } from 'wagmi/providers/alchemy'
import { publicProvider } from 'wagmi/providers/public'
import { useAppContext } from '@/hooks/useAppContext'
import { publicEnv } from '@/utils/env'

const { appName, isDev } = publicEnv
const apiKey = isDev ? publicEnv.apiKeyOptGoerli : publicEnv.apiKeyOpti
const chain = isDev ? optimismGoerli : optimism

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [chain],
  [alchemyProvider({ apiKey }), publicProvider()]
)

const { connectors } = getDefaultWallets({
  appName,
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT,
  chains,
})

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
})

export default function EthProvider({ children }: React.PropsWithChildren) {
  const { state, updateState } = useAppContext()
  useEffect(() => updateState({ walletMounted: true }), [])

  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider
        chains={chains}
        initialChain={chain}
        appInfo={{
          appName,
        }}
        theme={lightTheme({
          accentColor: '#212529',
        })}
      >
        {state.walletMounted && children}
      </RainbowKitProvider>
    </WagmiConfig>
  )
}
