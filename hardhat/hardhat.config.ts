import '../.env.ts' // dotenv.config()
import 'tsconfig-paths/register'
import '@nomicfoundation/hardhat-toolbox'
import 'tasks' // hardhat tasks
import { ethers } from 'ethers'
import type { HardhatUserConfig } from 'hardhat/config'

const { ACCOUNT_PRIVATE_KEY, ALCHEMY_KEY_GOERLI, ALCHEMY_KEY_MAINNET } = process.env
const { ALCHEMY_KEY_OPTIMISM, ALCHEMY_KEY_OPT_GOERLI } = process.env
const { ETHERSCAN_KEY, OPT_ETHERSCAN_KEY } = process.env

const config: HardhatUserConfig = {
  solidity: '0.8.17',
  defaultNetwork: 'optGoerli',
  networks: {
    hardhat: {
      accounts: [
        {
          privateKey: ACCOUNT_PRIVATE_KEY,
          balance: ethers.parseUnits('1', 'ether').toString(),
        },
      ],
    },
    goerli: {
      chainId: 5,
      url: `https://eth-goerli.g.alchemy.com/v2/${ALCHEMY_KEY_GOERLI}`,
      accounts: [ACCOUNT_PRIVATE_KEY],
    },
    mainnet: {
      chainId: 1,
      url: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY_MAINNET}`,
      accounts: [ACCOUNT_PRIVATE_KEY],
    },
    optimism: {
      chainId: 10,
      url: `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY_OPTIMISM}`,
      accounts: [ACCOUNT_PRIVATE_KEY],
    },
    optGoerli: {
      chainId: 420,
      url: `https://opt-goerli.g.alchemy.com/v2/${ALCHEMY_KEY_OPT_GOERLI}`,
      accounts: [ACCOUNT_PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      mainnet: ETHERSCAN_KEY,
      goerli: ETHERSCAN_KEY,
      optimisticEthereum: OPT_ETHERSCAN_KEY,
    },
  },
}

export default config
