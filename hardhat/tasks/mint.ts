import { task } from 'hardhat/config'
import { getContract, getEnvVariable } from './helpers'

task('mint', 'Mints from the NFT contract')
  .addParam('address', 'The address to receive a token')
  .setAction(async function (taskArguments, hre) {
    const contract = await getContract(
      hre,
      'CH',
      getEnvVariable('NFT_CONTRACT_ADDRESS')
    )
    const transactionResponse = await contract.mintTo(taskArguments.address, {
      gasLimit: 500_000,
    })
    console.log(`Transaction Hash: ${transactionResponse.hash}`)
  })
