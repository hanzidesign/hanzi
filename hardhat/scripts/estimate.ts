// npx hardhat run scripts/estimate.ts --network goerli
import { ethers } from 'hardhat'
import { getFeeData } from 'utils/helper'

async function main() {
  const [deployer] = await ethers.getSigners()
  const balance = await deployer.getBalance()

  console.log('Deploying contracts with the account:', {
    address: deployer.address,
    balance: ethers.utils.formatEther(balance),
  })

  const Hanzi = await ethers.getContractFactory('Hanzi')
  const { data } = Hanzi.getDeployTransaction()

  if (data) {
    const { lastBaseFeePerGas, maxFeePerGas, maxPriorityFeePerGas } = await getFeeData()
    const estimatedGas = await ethers.provider.estimateGas({ data })

    const baseFee = lastBaseFeePerGas.add(maxPriorityFeePerGas)
    const basePrice = estimatedGas.mul(baseFee)
    const maxPrice = estimatedGas.mul(maxFeePerGas)

    console.log({
      basePrice: formatNumber(ethers.utils.formatEther(basePrice)) + ' eth',
      maxPrice: formatNumber(ethers.utils.formatEther(maxPrice)) + ' eth',
      priorityFee: formatNumber(ethers.utils.formatUnits(maxPriorityFeePerGas, 'gwei')) + ' gwei',
      baseFee: formatNumber(ethers.utils.formatUnits(baseFee, 'gwei')) + ' gwei',
      maxFee: formatNumber(ethers.utils.formatUnits(maxFeePerGas, 'gwei')) + ' gwei',
      estimatedGas: estimatedGas.toString(),
    })
  } else {
    console.log('no data')
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

function formatNumber(str: string, precision = 12) {
  const [int, float] = str.split('.')
  const f = float.substring(0, precision)
  return `${int}.${f}`
}
