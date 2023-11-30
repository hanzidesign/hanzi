import { task } from 'hardhat/config'

task('check-balance', 'Prints out the balance of your account', async function (taskArguments, { ethers }, runSuper) {
  const { provider } = ethers
  const [account] = await ethers.getSigners()
  const balance = await provider.getBalance(account.address)
  const network = await provider.getNetwork()
  const bal = ethers.formatEther(balance || 0)
  console.log(`Account balance for ${account.address}: ${bal} on ${network.name} (${network.chainId})`)
})
