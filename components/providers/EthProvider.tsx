'use client'

import { useEffect, useState } from 'react'
import { getDefaultWallets, RainbowKitProvider, lightTheme, connectorsForWallets } from '@rainbow-me/rainbowkit'
import { argentWallet, trustWallet, ledgerWallet } from '@rainbow-me/rainbowkit/wallets'
import { configureChains, createConfig, WagmiConfig } from 'wagmi'
import { optimism, optimismGoerli } from 'wagmi/chains'
import { alchemyProvider } from 'wagmi/providers/alchemy'
import { publicProvider } from 'wagmi/providers/public'
import { publicEnv } from '@/utils/env'

const { appName, isDev, projectId } = publicEnv
const apiKey = isDev ? publicEnv.apiKeyOptGoerli : publicEnv.apiKeyOpti
const chain = isDev ? optimismGoerli : optimism

const { chains, publicClient } = configureChains([chain], [alchemyProvider({ apiKey }), publicProvider()])

const { wallets } = getDefaultWallets({
  appName,
  projectId,
  chains,
})

const connectors = connectorsForWallets([
  ...wallets,
  {
    groupName: 'Other',
    wallets: [
      argentWallet({ projectId, chains }),
      trustWallet({ projectId, chains }),
      ledgerWallet({ projectId, chains }),
    ],
  },
])

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
})

export default function EthProvider({ children }: React.PropsWithChildren) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

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
        {mounted && children}
      </RainbowKitProvider>
    </WagmiConfig>
  )
}
