// npx hardhat run scripts/deploy.ts --network goerli
import { ethers } from 'hardhat'

async function main() {
  const [deployer] = await ethers.getSigners()
  const balance = await deployer.getBalance()

  console.log('Deploying contracts with the account:', {
    address: deployer.address,
    balance: ethers.utils.formatEther(balance),
  })

  const CH = await ethers.getContractFactory('CH')
  const ch = await CH.deploy()

  console.log('NFT address:', ch.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
