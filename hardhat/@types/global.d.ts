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
      // hardhat
      ETHERSCAN_KEY: string
    }
  }
}

export {}
