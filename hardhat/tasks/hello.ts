import { task } from 'hardhat/config'

task(
  'hello',
  "Prints 'Hello, World!'",
  async function (taskArguments, hre, runSuper) {
    console.log('Hello, World!')
  }
)
