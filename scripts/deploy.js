// npx hardhat run scripts/deploy.js --network goerli

async function main() {
  const [deployer] = await ethers.getSigners()

  console.log('Deploying contracts with the account:', deployer.address)
  console.log('Account balance:', (await deployer.getBalance()).toString())

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
