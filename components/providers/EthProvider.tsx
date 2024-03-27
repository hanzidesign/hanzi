import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, getDefaultConfig, lightTheme } from '@rainbow-me/rainbowkit'
import { WagmiProvider, http } from 'wagmi'
import { optimism, optimismSepolia } from 'wagmi/chains'
import { env, publicEnv } from '@/utils/env'

const { appName, isDev, projectId } = publicEnv
const chain = isDev ? optimismSepolia : optimism

const config = getDefaultConfig({
  appName,
  projectId,
  chains: [chain],
  transports: {
    [optimism.id]: http(env.chainMain),
    [optimismSepolia.id]: http(env.chainTest),
  },
  ssr: true,
})

const queryClient = new QueryClient()

export default function EthProvider({ children }: React.PropsWithChildren) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          initialChain={chain}
          appInfo={{
            appName,
          }}
          theme={lightTheme({
            accentColor: '#212529',
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
