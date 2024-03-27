declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // env
      NODE_ENV: 'production' | 'development'
      // ethers
      NETWORK: string
      ACCOUNT_PRIVATE_KEY: string
      NFT_CONTRACT_ADDRESS: string
      // keys
      KEY_OPTIMISM: string
      KEY_OPTI_SEPOLIA: string
      // hardhat
      ETHERSCAN_KEY: string
      OPT_ETHERSCAN_KEY: string
    }
  }
}

export {}
