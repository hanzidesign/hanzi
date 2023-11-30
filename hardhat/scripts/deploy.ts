// npx hardhat run scripts/deploy.ts --network optGoerli
import { ethers } from 'hardhat'
import { sendTx } from 'utils/helper'

async function main() {
  const { provider } = ethers
  const [deployer] = await ethers.getSigners()
  const balance = await provider.getBalance(deployer.address)

  console.log('Deploying contracts with the account:', {
    address: deployer.address,
    balance: ethers.formatEther(balance),
  })

  const Hanzi = await ethers.getContractFactory('Hanzi')
  const tx = await Hanzi.getDeployTransaction()
  const { hash } = await sendTx(tx)
  console.log({ hash })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
