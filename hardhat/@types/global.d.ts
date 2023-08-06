declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // env
      NODE_ENV: 'production' | 'development'
      // ethers
      NETWORK: string
      ACCOUNT_PRIVATE_KEY: string
      NFT_CONTRACT_ADDRESS: string
      // alchemy
      ALCHEMY_KEY_GOERLI: string
      ALCHEMY_KEY_MAINNET: string
      ALCHEMY_KEY_OPTIMISM: string
      ALCHEMY_KEY_OPT_GOERLI: string
      // hardhat
      ETHERSCAN_KEY: string
      OPT_ETHERSCAN_KEY: string
    }
  }
}

export {}
