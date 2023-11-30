import type { HardhatRuntimeEnvironment } from 'hardhat/types'

export function getEnvVariable(key: string, defaultValue?: string) {
  const val = process.env[key] || defaultValue
  if (!val) {
    throw new Error(`${key} is not defined and no default value was provided`)
  }
  return val
}

export async function getContract({ ethers }: HardhatRuntimeEnvironment, name: string, address: string) {
  const [signer] = await ethers.getSigners()
  return ethers.getContractAt(name, address, signer)
}
