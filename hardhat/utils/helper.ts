import _ from 'lodash'
import { ethers } from 'hardhat'
import { BigNumber } from 'ethers'
import { mul } from 'utils/calculator'
import type { TransactionRequest } from '@ethersproject/abstract-provider'

export async function getFeeData() {
  const [block, maxPriorityFeeString] = await Promise.all([
    ethers.provider.getBlock('latest'),
    ethers.provider.send('eth_maxPriorityFeePerGas', []),
  ])

  let lastBaseFeePerGas: BigNumber | undefined = undefined
  let maxFeePerGas: BigNumber | undefined = undefined
  const maxPriorityFeePerGas = mul(BigNumber.from(maxPriorityFeeString), 1)

  if (block && block.baseFeePerGas) {
    lastBaseFeePerGas = block.baseFeePerGas
    maxFeePerGas = lastBaseFeePerGas.mul(2).add(maxPriorityFeePerGas)
  } else {
    throw new Error('no block data')
  }

  return { lastBaseFeePerGas, maxFeePerGas, maxPriorityFeePerGas }
}

export async function sendTx(tx: TransactionRequest) {
  const [deployer] = await ethers.getSigners()

  const { chainId } = ethers.provider.network

  // Explicitly using EIP-1559
  const { maxFeePerGas, maxPriorityFeePerGas } = await getFeeData()
  if (maxFeePerGas.isZero()) throw new Error('no fee data')

  tx.type = 2
  tx.maxFeePerGas = maxFeePerGas
  tx.maxPriorityFeePerGas = maxPriorityFeePerGas
  tx.gasPrice = undefined

  // estimateGas
  const gasLimit = await ethers.provider.estimateGas(tx).catch((error) => {
    throw new Error('cannot estimate gas')
  })
  tx.gasLimit = mul(gasLimit, 1)
  tx.chainId = chainId

  return deployer.sendTransaction(tx)
}
