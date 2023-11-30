// npx hardhat run scripts/estimate.ts --network optGoerli
import { ethers } from 'hardhat'
import { getFeeData } from 'utils/helper'

async function main() {
  const { provider } = ethers
  const [deployer] = await ethers.getSigners()
  const balance = await provider.getBalance(deployer.address)

  console.log('Deploying contracts with the account:', {
    address: deployer.address,
    balance: ethers.formatEther(balance),
  })

  const Hanzi = await ethers.getContractFactory('Hanzi')
  const { data } = await Hanzi.getDeployTransaction()

  if (data) {
    const { lastBaseFeePerGas, maxFeePerGas, maxPriorityFeePerGas } = await getFeeData()
    const estimatedGas = await provider.estimateGas({ data })

    const baseFee = lastBaseFeePerGas + maxPriorityFeePerGas
    const basePrice = estimatedGas * baseFee
    const maxPrice = estimatedGas * maxFeePerGas

    console.log({
      basePrice: formatNumber(ethers.formatEther(basePrice)) + ' eth',
      maxPrice: formatNumber(ethers.formatEther(maxPrice)) + ' eth',
      priorityFee: formatNumber(ethers.formatUnits(maxPriorityFeePerGas, 'gwei')) + ' gwei',
      baseFee: formatNumber(ethers.formatUnits(baseFee, 'gwei')) + ' gwei',
      maxFee: formatNumber(ethers.formatUnits(maxFeePerGas, 'gwei')) + ' gwei',
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
