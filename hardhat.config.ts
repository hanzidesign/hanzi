import './.env.ts' // dotenv.config()
import 'tsconfig-paths/register'
import '@nomicfoundation/hardhat-toolbox'
import 'tasks' // hardhat tasks
import { ethers } from 'ethers'
import type { HardhatUserConfig } from 'hardhat/config'

const { ACCOUNT_PRIVATE_KEY, ALCHEMY_KEY_GOERLI, ALCHEMY_KEY_MAINNET } =
  process.env

const config: HardhatUserConfig = {
  solidity: '0.8.17',
  defaultNetwork: 'goerli',
  networks: {
    hardhat: {
      accounts: [
        {
          privateKey: ACCOUNT_PRIVATE_KEY,
          balance: ethers.utils.parseUnits('1', 'ether').toString(),
        },
      ],
    },
    goerli: {
      url: `https://eth-goerli.g.alchemy.com/v2/${ALCHEMY_KEY_GOERLI}`,
      accounts: [ACCOUNT_PRIVATE_KEY],
    },
    ethereum: {
      chainId: 1,
      url: `https://eth-goerli.g.alchemy.com/v2/${ALCHEMY_KEY_MAINNET}`,
      accounts: [ACCOUNT_PRIVATE_KEY],
    },
  },
}

export default config
