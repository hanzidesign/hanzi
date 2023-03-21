import { task } from 'hardhat/config'
import { ethers } from 'ethers'
import { getAccount, getProvider } from './helpers'

task(
  'check-balance',
  'Prints out the balance of your account',
  async function (taskArguments, hre, runSuper) {
    const account = await getAccount()
    const balance = await account.getBalance()
    const { network } = await getProvider()
    const bal = ethers.utils.formatEther(balance)
    console.log(
      `Account balance for ${account.address}: ${bal} on ${network.name} (${network.chainId})`
    )
  }
)
