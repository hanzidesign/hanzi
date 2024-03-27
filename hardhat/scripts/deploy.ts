// npx hardhat run scripts/deploy.ts --network optiSepolia
import { ethers } from 'hardhat'

async function main() {
  const { provider } = ethers
  const [deployer] = await ethers.getSigners()
  const balance = await provider.getBalance(deployer.address)

  console.log('Deploying contracts with the account:', {
    address: deployer.address,
    balance: ethers.formatEther(balance),
  })

  const Contract = await ethers.getContractFactory('Hanzi')
  const response = await Contract.deploy()
  const { hash } = response.deploymentTransaction() || {}
  const address = await response.getAddress()
  console.log({ hash, contract: address })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
