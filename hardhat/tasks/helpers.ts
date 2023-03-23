import { ethers } from 'ethers'
import { getContractAt } from '@nomiclabs/hardhat-ethers/internal/helpers'
import type { HardhatRuntimeEnvironment } from 'hardhat/types'

export function getEnvVariable(key: string, defaultValue?: string) {
  const val = process.env[key] || defaultValue
  if (!val) {
    throw new Error(`${key} is not defined and no default value was provided`)
  }
  return val
}

// Helper method for fetching a connection provider to the Ethereum network
export function getProvider() {
  const network = getEnvVariable('NETWORK', 'goerli')
  const key = `ALCHEMY_KEY_${network}`.toUpperCase()
  const alchemy = getEnvVariable(key)
  return ethers.getDefaultProvider(network, {
    alchemy,
  })
}

// Helper method for fetching a wallet account using an environment variable for the PK
export function getAccount() {
  return new ethers.Wallet(getEnvVariable('ACCOUNT_PRIVATE_KEY'), getProvider())
}

export function getContract(hre: HardhatRuntimeEnvironment, name: string, address: string) {
  const account = getAccount()
  return getContractAt(hre, name, address, account)
}
