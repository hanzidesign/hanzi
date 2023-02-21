import { getProvider, getContract } from '@wagmi/core'
import json from 'artifacts/contracts/CH.sol/CH.json'
import type { CH } from 'typechain-types/contracts/CH'

const address = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS
const nftContract = getContract({ address, abi: json.abi, signerOrProvider: getProvider() }) as CH

export { nftContract }
