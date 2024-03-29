import '../.env.ts' // dotenv.config()
import 'tsconfig-paths/register'
import '@nomicfoundation/hardhat-toolbox'
import 'tasks' // hardhat tasks
import { ethers } from 'ethers'
import type { HardhatUserConfig } from 'hardhat/config'

const { ACCOUNT_PRIVATE_KEY } = process.env
const { ETHERSCAN_KEY, OPT_ETHERSCAN_KEY } = process.env

const config: HardhatUserConfig = {
  solidity: '0.8.17',
  defaultNetwork: 'optiSepolia',
  networks: {
    hardhat: {
      accounts: [
        {
          privateKey: ACCOUNT_PRIVATE_KEY,
          balance: ethers.parseUnits('1', 'ether').toString(),
        },
      ],
    },
    optimism: {
      chainId: 10,
      url: process.env.KEY_OPTIMISM,
      accounts: [ACCOUNT_PRIVATE_KEY],
    },
    optiSepolia: {
      chainId: 11155420,
      url: process.env.KEY_OPTI_SEPOLIA,
      accounts: [ACCOUNT_PRIVATE_KEY],
    },
  },
  // verify: npx hardhat verify --network optiSepolia DEPLOYED_CONTRACT_ADDRESS
  etherscan: {
    apiKey: {
      mainnet: ETHERSCAN_KEY,
      goerli: ETHERSCAN_KEY,
      optimisticEthereum: OPT_ETHERSCAN_KEY,
      optiSepolia: OPT_ETHERSCAN_KEY,
    },
    customChains: [
      {
        network: 'optiSepolia',
        chainId: 11155420,
        urls: {
          apiURL: 'https://api-sepolia-optimism.etherscan.io/api',
          browserURL: 'https://sepolia-optimism.etherscan.io',
        },
      },
    ],
  },
}

export default config
