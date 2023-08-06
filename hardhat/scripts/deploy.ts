// npx hardhat run scripts/deploy.ts --network goerli
import { ethers } from 'hardhat'
import { sendTx } from 'utils/helper'

async function main() {
  const [deployer] = await ethers.getSigners()
  const balance = await deployer.getBalance()

  console.log('Deploying contracts with the account:', {
    address: deployer.address,
    balance: ethers.utils.formatEther(balance),
  })

  const Hanzi = await ethers.getContractFactory('Hanzi')
  const tx = Hanzi.getDeployTransaction()
  const { hash } = await sendTx(tx)
  console.log({ hash })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
