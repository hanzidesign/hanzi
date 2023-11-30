import _ from 'lodash'
import { ethers } from 'hardhat'
import { toBigInt } from 'ethers'
import type { TransactionRequest } from 'ethers'

export async function getFeeData() {
  const { provider } = ethers
  const [block, maxPriorityFeeString] = await Promise.all([
    provider.getBlock('latest'),
    provider.send('eth_maxPriorityFeePerGas', []),
  ])

  let lastBaseFeePerGas: bigint | undefined = undefined
  let maxFeePerGas: bigint | undefined = undefined
  const maxPriorityFeePerGas = toBigInt(maxPriorityFeeString)

  if (block && block.baseFeePerGas) {
    lastBaseFeePerGas = block.baseFeePerGas
    maxFeePerGas = lastBaseFeePerGas * 2n + maxPriorityFeePerGas
  } else {
    throw new Error('no block data')
  }

  return { lastBaseFeePerGas, maxFeePerGas, maxPriorityFeePerGas }
}

export async function sendTx(tx: TransactionRequest) {
  const [deployer] = await ethers.getSigners()
  const { chainId } = await ethers.provider.getNetwork()

  // Explicitly using EIP-1559
  const { maxFeePerGas, maxPriorityFeePerGas } = await getFeeData()
  if (maxFeePerGas == 0n) throw new Error('no fee data')

  tx.type = 2
  tx.maxFeePerGas = maxFeePerGas
  tx.maxPriorityFeePerGas = maxPriorityFeePerGas
  tx.gasPrice = undefined

  // estimateGas
  const gasLimit = await ethers.provider.estimateGas(tx).catch((error) => {
    throw new Error('cannot estimate gas')
  })
  tx.gasLimit = gasLimit
  tx.chainId = chainId

  return deployer.sendTransaction(tx)
}
