declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // env

      NODE_ENV: 'production' | 'development'
      NEXT_PUBLIC_NODE_ENV: 'production' | 'development'
      NEXT_PUBLIC_GOOGLE_ANALYTICS: string
      NEXT_PUBLIC_APP_NAME: string
      NEXT_PUBLIC_COLOR_SCHEME: 'dark' | 'light' | 'auto'
      // ethers
      NEXT_PUBLIC_NFT_CONTRACT_ADDRESS: string
      NEXT_PUBLIC_OPENSEA_URL: string
      NEXT_PUBLIC_CHAIN_ID: string
      // alchemy
      NEXT_PUBLIC_ALCHEMY_KEY_GOERLI: string
      NEXT_PUBLIC_ALCHEMY_KEY_MAINNET: string
      NEXT_PUBLIC_ALCHEMY_KEY_OPTIMISM: string
      NEXT_PUBLIC_ALCHEMY_KEY_OPT_GOERLI: string
      // nft storage
      NEXT_PUBLIC_NFT_STORAGE_TOKEN: string
      NEXT_PUBLIC_WEB_URL: string
      // walletconnect
      NEXT_PUBLIC_WALLETCONNECT: string
      // other
      NEXT_PUBLIC_GITHUB_URL: string
    }
  }
}

export {}
