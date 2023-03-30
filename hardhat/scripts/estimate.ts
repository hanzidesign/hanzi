// npx hardhat run scripts/estimate.ts --network goerli
import { ethers } from 'hardhat'

async function main() {
  const [deployer] = await ethers.getSigners()
  const balance = await deployer.getBalance()

  console.log('Deploying contracts with the account:', {
    address: deployer.address,
    balance: ethers.utils.formatEther(balance),
  })

  const CH = await ethers.getContractFactory('CH')
  const { data } = CH.getDeployTransaction()

  if (data) {
    const estimatedGas = await ethers.provider.estimateGas({ data })
    const gasPrice = await ethers.provider.getGasPrice()
    const finalGasPrice = estimatedGas.mul(gasPrice)

    console.log({
      feePrice: formatNumber(ethers.utils.formatEther(finalGasPrice)) + ' eth',
      gasPrice: formatNumber(ethers.utils.formatUnits(gasPrice, 'gwei')) + ' gwei',
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

function formatNumber(str: string, precision = 6) {
  const [int, float] = str.split('.')
  const f = float.substring(0, precision)
  return `${int}.${f}`
}
